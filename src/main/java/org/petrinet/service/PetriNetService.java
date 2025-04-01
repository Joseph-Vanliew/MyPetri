package org.petrinet.service;

import org.petrinet.client.ArcDTO;
import org.petrinet.client.PetriNetDTO;
import org.petrinet.client.PlaceDTO;
import org.petrinet.client.TransitionDTO;
import org.petrinet.service.model.Arc;
import org.petrinet.service.model.Place;
import org.petrinet.service.model.Transition;
import org.petrinet.util.PetriNetMapper;

import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class PetriNetService {

    /**
     * Processes a single step in the Petri net simulation.
     * It evaluates which transitions are enabled based on the current token distribution.
     * If running in deterministic mode and multiple transitions are enabled, it returns the state
     * with all conflicting transitions marked as enabled, requiring user intervention via `resolveConflict`.
     * If only one transition is enabled, or if in non-deterministic mode, it selects one transition
     * (the only one or randomly), fires it (updates token counts), and returns the resulting state.
     * If no transitions are enabled, it returns the current state unchanged.
     *
     * @param petriNetDTO The current state of the Petri net, including places, transitions, arcs, and mode.
     * @return A {@link PetriNetDTO} representing the state after one simulation step, potentially
     *         indicating a conflict or the result of firing a single transition.
     */
    public PetriNetDTO processPetriNet(PetriNetDTO petriNetDTO) {
        Map<String, Place> placesMap = PetriNetMapper.mapPlacesToMap(petriNetDTO.getPlaces());
        Map<String, Arc> arcsMap = PetriNetMapper.mapArcsToMap(petriNetDTO.getArcs());
        List<Transition> transitions = PetriNetMapper.dtoToTransitionList(petriNetDTO.getTransitions());

        // Calculate the total incoming transition counts for each transition
        Map<String, Integer> totalIncomingTransitionCounts = calculateTotalIncomingTransitionCounts(transitions, arcsMap);

        // First evaluate all transitions
        List<Transition> evaluatedTransitions = transitions.stream()
            .map(transition -> {
                boolean canFire = evaluateTransition(transition, arcsMap, placesMap, totalIncomingTransitionCounts);
                transition.setEnabled(canFire);
                return transition;
            })
            .collect(Collectors.toList());

        // Get all enabled transitions
        List<Transition> enabledTransitions = evaluatedTransitions.stream()
            .filter(Transition::getEnabled)
            .collect(Collectors.toList());

        System.out.println("Number of enabled transitions: " + enabledTransitions.size());
        
        // Check if we're in deterministic mode
        Boolean isDeterministicMode = petriNetDTO.getDeterministicMode();
        
        // If in deterministic mode and multiple transitions are enabled, return early
        if (isDeterministicMode != null && isDeterministicMode && enabledTransitions.size() > 1) {
            System.out.println("Deterministic mode: returning all enabled transitions for user selection");
            return convertDomainModelsToDTO(placesMap, evaluatedTransitions, arcsMap);
        }
        
        if (!enabledTransitions.isEmpty()) {
            Transition selectedTransition;
            
            if (enabledTransitions.size() == 1) {
                selectedTransition = enabledTransitions.get(0);
                System.out.println("Only one transition enabled: " + selectedTransition.getId());
            } else {
                // Multiple transitions are enabled, select randomly
                Random random = new Random();
                selectedTransition = enabledTransitions.get(random.nextInt(enabledTransitions.size()));
                System.out.println("Randomly selected transition: " + selectedTransition.getId());
            }
            
            // Disable all transitions except the selected one
            evaluatedTransitions.forEach(transition -> 
                transition.setEnabled(transition.getId().equals(selectedTransition.getId())));
            
            // Update tokens only for the selected transition
            updateTokensForFiringTransition(selectedTransition, arcsMap, placesMap);
        }

        return convertDomainModelsToDTO(placesMap, evaluatedTransitions, arcsMap);
    }

    /**
     * Calculates, for each place, how many transitions have an incoming arc originating from that place.
     * Note: This calculation's result is not currently used in the `evaluateTransition` or
     * `updateTokensForFiringTransition` methods. Its purpose within the current workflow may require review.
     *
     * @param transitions The list of {@link Transition} domain models.
     * @param arcsMap A map of arc IDs to {@link Arc} domain models.
     * @return A map where keys are place IDs and values represent the count of transitions
     *         that have an incoming arc originating from that place.
     */
    public Map<String, Integer> calculateTotalIncomingTransitionCounts(List<Transition> transitions,
                                                                       Map<String, Arc> arcsMap) {
        Map<String, Integer> totalIncomingTransitionCounts = new HashMap<>();
        for (Transition transition : transitions) {
            for (String arcId : transition.getArcIds()) {
                Arc arc = arcsMap.get(arcId);
                if (arc != null && arc.getIncomingId() != null) {
                    String placeId = arc.getIncomingId();
                    totalIncomingTransitionCounts.merge(placeId, 1, Integer::sum);
                }
            }
        }
        return totalIncomingTransitionCounts;
    }

    /**
     * Evaluates whether a single transition can fire based on the current token distribution and arc types.
     * Checks inhibitor arcs first (requires 0 tokens in connected place).
     * Then checks regular/bidirectional arcs (requires sufficient tokens in connected places).
     * A transition with no incoming regular/bidirectional arcs (only inhibitor or none) is considered enabled
     * if inhibitor conditions are met.
     * Note: The `totalIncomingTransitionCounts` parameter is not used in the current implementation.
     *
     * @param transition The {@link Transition} to evaluate.
     * @param arcsMap A map of arc IDs to {@link Arc} domain models.
     * @param placesMap A map of place IDs to {@link Place} domain models.
     * @param totalIncomingTransitionCounts (Currently unused) A map of place IDs to their total outgoing arc counts to transitions.
     * @return {@code true} if the transition is enabled (can fire), {@code false} otherwise.
     */
    public boolean evaluateTransition(
            Transition transition, Map<String, Arc> arcsMap,
            Map<String, Place> placesMap, Map<String, Integer> totalIncomingTransitionCounts) {

        List<Arc> incomingArcs = arcsMap.values().stream()
                .filter(arc -> transition.getArcIds().contains(arc.getId())
                        && arc.getOutgoingId().equals(transition.getId()))
                .toList();
        
        // Check inhibitor arcs first
        for (Arc arc : incomingArcs) {
            if (arc instanceof Arc.InhibitorArc) {
                Place sourcePlace = placesMap.get(arc.getIncomingId());
                if (sourcePlace != null && sourcePlace.getTokens() > 0) {
                    transition.setEnabled(false);
                    return false; // Inhibitor arc requires zero tokens to enable transition
                }
            }
        }
        
        if (incomingArcs.isEmpty() || incomingArcs.stream().allMatch(arc -> arc instanceof Arc.InhibitorArc)) {
            transition.setEnabled(true);
            return true; // the transition can fire unconditionally or only has inhibitor arcs that are satisfied
        }

        // Count required tokens per place
        Map<String, Integer> requiredTokensPerPlace = new HashMap<>();
        
        // Count how many tokens are needed from each place
        for (Arc arc : incomingArcs) {
            if (arc instanceof Arc.RegularArc || arc instanceof Arc.BidirectionalArc) {
                String placeId = arc.getIncomingId();
                requiredTokensPerPlace.merge(placeId, 1, Integer::sum);
            }
        }
        
        // Check if each place has enough tokens
        for (Map.Entry<String, Integer> entry : requiredTokensPerPlace.entrySet()) {
            String placeId = entry.getKey();
            int requiredTokens = entry.getValue();
            
            Place place = placesMap.get(placeId);
            if (place == null || place.getTokens() < requiredTokens) {
                transition.setEnabled(false);
                return false; // Not enough tokens available
            }
        }
        
        transition.setEnabled(true);
        return true;
    }

    /**
     * Updates the token counts in places connected to a firing transition.
     * Consumes tokens from input places connected by regular or bidirectional arcs.
     * Produces tokens in output places connected by regular or bidirectional arcs.
     * Handles the specific token replenishment logic for bidirectional arcs (consume, produce, then replenish source).
     * Inhibitor arcs do not affect token counts.
     *
     * @param transition The {@link Transition} that is firing.
     * @param arcsMap A map of arc IDs to {@link Arc} domain models.
     * @param placesMap A map of place IDs to {@link Place} domain models. This map is modified directly.
     */
    public void updateTokensForFiringTransition(Transition transition, Map<String, Arc> arcsMap,
                                                Map<String, Place> placesMap) {
        // collect all places that need to be replenished due to bidirectional arcs
        Set<String> placesToReplenish = new HashSet<>();
        
        // Identify places connected to bidirectional arcs that will lose tokens
        transition.getArcIds().stream()
                .map(arcsMap::get)
                .filter(arc -> arc instanceof Arc.BidirectionalArc && arc.getOutgoingId().equals(transition.getId()))
                .forEach(arc -> placesToReplenish.add(arc.getIncomingId()));
        
        // Handle token consumption (incoming arcs)
        transition.getArcIds().stream()
                .map(arcsMap::get)
                .filter(arc -> arc != null && arc.getOutgoingId().equals(transition.getId())) // Confirm arc is incoming to transition
                .forEach(arc -> {
                    if (arc instanceof Arc.RegularArc || arc instanceof Arc.BidirectionalArc) {
                        Place sourcePlace = placesMap.get(arc.getIncomingId());
                        if (sourcePlace != null && sourcePlace.getTokens() > 0) {
                            sourcePlace.removeTokens();
                        }
                    }
                    // Note: Inhibitor arcs don't consume tokens
                });
        
        // Handle token production (outgoing arcs)
        transition.getArcIds().stream()
                .map(arcsMap::get)
                .filter(arc -> arc != null && arc.getIncomingId().equals(transition.getId())) // Confirm arc is outgoing from transition
                .forEach(arc -> {
                    if (arc instanceof Arc.RegularArc || arc instanceof Arc.BidirectionalArc) {
                        Place targetPlace = placesMap.get(arc.getOutgoingId());
                        if (targetPlace != null) {
                            targetPlace.addToken();
                        }
                    }
                    // Note: Inhibitor arcs don't produce tokens
                });
        
        // Replenish tokens for places connected to bidirectional arcs
        for (String placeId : placesToReplenish) {
            Place place = placesMap.get(placeId);
            if (place != null) {
                place.addToken();
            }
        }
    }

    /**
     * Converts the internal domain models (Place, Transition, Arc maps/lists) back into a {@link PetriNetDTO}.
     * This is used to return the state of the Petri net after processing or conflict resolution.
     * Maps internal {@link Place}, {@link Transition}, and {@link Arc} representations to their respective DTOs.
     *
     * @param placesMap A map of place IDs to {@link Place} domain models.
     * @param transitions A list of {@link Transition} domain models (potentially with updated 'enabled' status).
     * @param arcsMap A map of arc IDs to {@link Arc} domain models.
     * @return A new {@link PetriNetDTO} representing the current state derived from the domain models.
     */
    private PetriNetDTO convertDomainModelsToDTO(Map<String, Place> placesMap, List<Transition> transitions,
                                                 Map<String, Arc> arcsMap) {
        List<PlaceDTO> placeDTOs = placesMap.values().stream()
                .map(place -> new PlaceDTO(
                        place.getId(),
                        place.getTokens()))
                .collect(Collectors.toList());
        //These should really be in the mapper class
        List<TransitionDTO> transitionDTOs = transitions.stream()
                .map(transition -> new TransitionDTO(
                        transition.getId(),
                        transition.getEnabled(),
                        transition.getArcIds()))
                .collect(Collectors.toList());

        List<ArcDTO> arcDTOs = arcsMap.values().stream().filter(Objects::nonNull)
                .map(arc -> {
                    String type = switch (arc) {
                        case Arc.RegularArc regularArc -> "REGULAR";
                        case Arc.InhibitorArc inhibitorArc -> "INHIBITOR";
                        case Arc.BidirectionalArc bidirectionalArc -> "BIDIRECTIONAL";
                    };
                    return new ArcDTO(arc.getId(), type, arc.getIncomingId(), arc.getOutgoingId());
                })
                .collect(Collectors.toList());


        return new PetriNetDTO(placeDTOs, transitionDTOs, arcDTOs);
    }

    /**
     * Resolves a conflict state where multiple transitions were enabled in deterministic mode.
     * This method is called after the user has selected which specific transition should fire.
     * It updates the Petri net state by firing only the selected transition.
     * After firing, it re-evaluates all transitions to determine the next state, potentially
     * leading to another conflict if multiple transitions become enabled again.
     *
     * @param petriNetDTO The {@link PetriNetDTO} representing the state where the conflict occurred.
     *                    This DTO should have multiple transitions marked as enabled.
     * @param selectedTransitionId The ID of the transition chosen by the user to resolve the conflict.
     * @return A {@link PetriNetDTO} representing the state after firing the selected transition and
     *         re-evaluating enabled transitions for the subsequent step.
     * @throws IllegalArgumentException if the {@code selectedTransitionId} does not correspond to any
     *                                  transition in the provided {@code petriNetDTO}.
     */
    public PetriNetDTO resolveConflict(PetriNetDTO petriNetDTO, String selectedTransitionId) {
        Map<String, Place> placesMap = PetriNetMapper.mapPlacesToMap(petriNetDTO.getPlaces());
        Map<String, Arc> arcsMap = PetriNetMapper.mapArcsToMap(petriNetDTO.getArcs());
        List<Transition> transitions = PetriNetMapper.dtoToTransitionList(petriNetDTO.getTransitions());
        
        // Find the selected transition
        Transition selectedTransition = transitions.stream()
            .filter(t -> t.getId().equals(selectedTransitionId))
            .findFirst()
            .orElseThrow(() -> new IllegalArgumentException("Selected transition not found: " + selectedTransitionId));
        
        // First, disable all transitions
        transitions.forEach(t -> t.setEnabled(false));
        
        // Update tokens for the selected transition
        updateTokensForFiringTransition(selectedTransition, arcsMap, placesMap);
        
        // After firing, calculate which transitions are enabled
        Map<String, Integer> totalIncomingTransitionCounts = calculateTotalIncomingTransitionCounts(transitions, arcsMap);
        
        // Evaluate all transitions to find enabled ones
        List<Transition> enabledTransitions = new ArrayList<>();
        transitions.forEach(transition -> {
            boolean canFire = evaluateTransition(transition, arcsMap, placesMap, totalIncomingTransitionCounts);
            if (canFire) {
                enabledTransitions.add(transition);
            }
        });
        
        // If there are multiple enabled transitions and in deterministic mode, 
        // return them all as enabled for user selection
        Boolean isDeterministicMode = petriNetDTO.getDeterministicMode();
        if (isDeterministicMode != null && isDeterministicMode && enabledTransitions.size() > 1) {
            System.out.println("Multiple transitions enabled after firing, user will select again");
            // Set the enabled flag for the enabled transitions
            for (Transition t : enabledTransitions) {
                t.setEnabled(true);
            }
        }
        // If there's only one enabled transition, or we're in non-deterministic mode,
        // select one randomly
        else if (!enabledTransitions.isEmpty()) {
            Transition nextTransition;
            
            if (enabledTransitions.size() == 1) {
                nextTransition = enabledTransitions.get(0);
            } else {
                // Random selection for non-deterministic mode
                Random random = new Random();
                nextTransition = enabledTransitions.get(random.nextInt(enabledTransitions.size()));
            }
            
            // Only enable the selected/random transition
            nextTransition.setEnabled(true);
            System.out.println("Selected transition for next state: " + nextTransition.getId());
        }
        
        return convertDomainModelsToDTO(placesMap, transitions, arcsMap);
    }
}
