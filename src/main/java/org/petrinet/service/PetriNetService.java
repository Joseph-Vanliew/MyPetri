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

/**
 * Service for processing UNBOUNDED Petri nets.
 * This service evaluates which transitions are enabled based on the current token distribution.
 * It also handles conflict resolution when multiple transitions are enabled in deterministic mode.
 */
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

        // First evaluate all transitions
        List<Transition> evaluatedTransitions = transitions.stream()
            .map(transition -> {
                boolean canFire = evaluateTransition(transition, arcsMap, placesMap);
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
            // Pass original DTO to preserve mode
            PetriNetDTO resultDTO = convertDomainModelsToDTO(placesMap, evaluatedTransitions, arcsMap, petriNetDTO);
            return resultDTO;
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

        return convertDomainModelsToDTO(placesMap, evaluatedTransitions, arcsMap, petriNetDTO);
    }

    /**
     * Evaluates whether a single transition can fire based on the current token distribution,
     * arc types, and place capacities. The evaluation proceeds in the following order:
     * <ol>
     *     <li><b>Inhibitor Arcs:</b> Checks if any connected inhibitor arc (Place -> Transition) originates
     *         from a place with more than 0 tokens. If so, the transition is disabled.</li>
     *     <li><b>Bidirectional Arc Preconditions:</b> Checks if any connected bidirectional arc is linked
     *         to a place with 0 tokens. If so, the transition is disabled.</li>
     *     <li><b>Input Token Requirements:</b> Calculates the total number of tokens required from each input
     *         place based on incoming Regular (Place -> Transition) and Bidirectional arcs.</li>
     *     <li><b>Input Token Availability:</b> Checks if all input places have sufficient tokens to meet
     *         the calculated requirements. If not, the transition is disabled.</li>
     *     <li><b>Output Place Capacity:</b> Calculates the net number of tokens that would be added to each
     *         output place after firing (considering outgoing Regular (Transition -> Place) and Bidirectional arcs).
     *         Checks if adding these tokens would exceed the capacity of any bounded output place. If so,
     *         the transition is disabled.</li>
     * </ol>
     * The transition is considered enabled only if all the above checks pass. This method also updates
     * the `enabled` state of the provided {@code transition} object based on the evaluation result.
     *
     * @param transition The {@link Transition} to evaluate.
     * @param arcsMap A map of arc IDs to {@link Arc} domain models.
     * @param placesMap A map of place IDs to {@link Place} domain models.
     * @return {@code true} if the transition is enabled (can fire), {@code false} otherwise.
     */
    public boolean evaluateTransition(Transition transition, Map<String, Arc> arcsMap, Map<String, Place> placesMap) {
        // Local variable to track if evaluation passed, defaults to true
        boolean evaluationPassed = true; 
        Map<String, Integer> requiredTokensPerPlace = new HashMap<>();
        boolean hasAnyTokenRequirement = false;

        // Iterate through all arcs connected to this transition
        for (String arcId : transition.getArcIds()) {
            if (!evaluationPassed) break;
            Arc arc = arcsMap.get(arcId);
            if (arc == null) continue;

            // Inhibitor Check
            if (arc instanceof Arc.InhibitorArc && arc.getOutgoingId().equals(transition.getId())) {
                Place sourcePlace = placesMap.get(arc.getIncomingId());
                if (sourcePlace != null && sourcePlace.getTokens() > 0) {
                    evaluationPassed = false;
                }
            }
            // Bidirectional Precondition & Requirement Calc
            else if (arc instanceof Arc.BidirectionalArc) {
                hasAnyTokenRequirement = true;
                String placeId = arc.getIncomingId().equals(transition.getId()) ? arc.getOutgoingId() : arc.getIncomingId();
                Place connectedPlace = placesMap.get(placeId);
                // BiDirectional arcs require at least 1 token in the connected place to be enabled
                if (connectedPlace == null || connectedPlace.getTokens() < 1) {
                     evaluationPassed = false;
                }
                // P -> T direction consumes a token
                if (arc.getOutgoingId().equals(transition.getId())) {
                     requiredTokensPerPlace.merge(placeId, 1, Integer::sum);
                }
            }
            // Regular Arc Requirement Calc (P -> T only)
            else if (arc instanceof Arc.RegularArc && arc.getOutgoingId().equals(transition.getId())) {
                hasAnyTokenRequirement = true;
                requiredTokensPerPlace.merge(arc.getIncomingId(), 1, Integer::sum);
            }
        }

        // --- Check Input Token Availability ---
        if (evaluationPassed && hasAnyTokenRequirement) {
             for (Map.Entry<String, Integer> entry : requiredTokensPerPlace.entrySet()) {
                 String placeId = entry.getKey();
                 int requiredTokens = entry.getValue();
                 Place place = placesMap.get(placeId);
                 int currentTokens = (place != null) ? place.getTokens() : -1; // Handle null place
                 boolean conditionMet = (place == null || currentTokens < requiredTokens);
                 System.out.println("    - Place " + placeId + ": Has=" + currentTokens + ", Needs=" + requiredTokens + ". Condition (tokens < required): " + conditionMet);

                 if (place == null || place.getTokens() < requiredTokens) {
                     evaluationPassed = false;
                     break;
                 }
             }
        }

        // 4. Check Output Place Capacity
        if (evaluationPassed) {
            Map<String, Integer> tokensToAddPerPlace = new HashMap<>();
            // Calculate tokens to add for T->P arcs (Regular & BiDi) and P->T (BiDi only)
             for (String arcId : transition.getArcIds()) {
                Arc arc = arcsMap.get(arcId);
                if (arc == null) continue;
                if (arc.getIncomingId().equals(transition.getId())) { // T -> P direction
                     if (arc instanceof Arc.RegularArc || arc instanceof Arc.BidirectionalArc) {
                          tokensToAddPerPlace.merge(arc.getOutgoingId(), 1, Integer::sum);
                     }
                } else if (arc.getOutgoingId().equals(transition.getId()) && arc instanceof Arc.BidirectionalArc) { // P -> T direction (BiDi adds back)
                     tokensToAddPerPlace.merge(arc.getIncomingId(), 1, Integer::sum);
                }
             }

            // Check actual capacity
            for (Map.Entry<String, Integer> entry : tokensToAddPerPlace.entrySet()) {
                String placeId = entry.getKey();
                int tokensToAdd = entry.getValue();
                Place targetPlace = placesMap.get(placeId);

                if (targetPlace != null && targetPlace.isBounded()) {
                    Integer placeCapacity = targetPlace.getCapacity();
                    if (placeCapacity != null && (targetPlace.getTokens() + tokensToAdd > placeCapacity)) {
                        evaluationPassed = false;
                        break;
                    }
                }
            }

            if (!evaluationPassed) {
                transition.setEnabled(false); // Ensure domain model state is consistent
                return false;
            }
        }

        transition.setEnabled(evaluationPassed);
        return evaluationPassed;
    }

    /**
     * Updates the token counts in places connected to a firing transition.
     * Consumes tokens from input places for Regular (Place->Transition) arcs.
     * Produces tokens in output places for Regular (Transition->Place) arcs.
     * For Bidirectional arcs, consumes one token and produces one token in the connected place,
     * resulting in a net-zero change for the place from the bidirectional arc itself.
     * Inhibitor arcs do not affect token counts.
     *
     * @param transition The {@link Transition} that is firing.
     * @param arcsMap A map of arc IDs to {@link Arc} domain models.
     * @param placesMap A map of place IDs to {@link Place} domain models. This map is modified directly.
     */
    public void updateTokensForFiringTransition(Transition transition, Map<String, Arc> arcsMap,
                                                Map<String, Place> placesMap) {
        
        // Iterate through all arcs connected to the firing transition
        for (String arcId : transition.getArcIds()) {
            Arc arc = arcsMap.get(arcId);
            if (arc == null) continue; 

            if (arc instanceof Arc.RegularArc) {
                // Handle regular consumption (Place -> Transition)
                if (arc.getOutgoingId().equals(transition.getId())) {
                    Place sourcePlace = placesMap.get(arc.getIncomingId());
                    if (sourcePlace != null && sourcePlace.getTokens() > 0) {
                        sourcePlace.removeTokens();
                    }
                }
                // Handle regular production (Transition -> Place)
                else if (arc.getIncomingId().equals(transition.getId())) {
                    Place targetPlace = placesMap.get(arc.getOutgoingId());
                    if (targetPlace != null) {
                        targetPlace.addToken();
                    }
                }
            } else if (arc instanceof Arc.BidirectionalArc) {
                // Identify the connected place (works regardless of arc direction)
                String placeId = arc.getIncomingId().equals(transition.getId()) 
                               ? arc.getOutgoingId() 
                               : arc.getIncomingId();
                Place connectedPlace = placesMap.get(placeId);

                if (connectedPlace != null) {
                    if (connectedPlace.getTokens() > 0) {
                         connectedPlace.removeTokens(); 
                    }
                     connectedPlace.addToken();
                }
            }
        }
    }

    /**
     * Converts the internal domain models (Place, Transition, Arc maps/lists) back into a {@link PetriNetDTO}.
     * This is used to return the state of the Petri net after processing or conflict resolution.
     * Maps internal {@link Place}, {@link Transition}, and {@link Arc} representations to their respective DTOs.
     * Also preserves the deterministicMode flag from the original request.
     *
     * @param placesMap A map of place IDs to {@link Place} domain models.
     * @param transitions A list of {@link Transition} domain models (potentially with updated 'enabled' status).
     * @param arcsMap A map of arc IDs to {@link Arc} domain models.
     * @param originalDTO The original DTO passed to the service method, used to retrieve the deterministic mode flag.
     * @return A new {@link PetriNetDTO} representing the current state derived from the domain models.
     */
    private PetriNetDTO convertDomainModelsToDTO(Map<String, Place> placesMap, List<Transition> transitions,
                                                 Map<String, Arc> arcsMap, PetriNetDTO originalDTO) {
        List<PlaceDTO> placeDTOs = placesMap.values().stream()
                .map(place -> new PlaceDTO(
                        place.getId(),
                        place.getTokens(),
                        place.isBounded(),
                        place.getCapacity()
                ))
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


        PetriNetDTO newDTO = new PetriNetDTO(placeDTOs, transitionDTOs, arcDTOs);
        
        if (originalDTO != null) {
             newDTO.setDeterministicMode(originalDTO.getDeterministicMode());
        }
        return newDTO;
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
        
        transitions.forEach(t -> t.setEnabled(false));
        
        // Update tokens for the selected transition
        updateTokensForFiringTransition(selectedTransition, arcsMap, placesMap);
        
        // Evaluate all transitions to find enabled ones
        List<Transition> enabledTransitions = new ArrayList<>();
        transitions.forEach(transition -> {
            boolean canFire = evaluateTransition(transition, arcsMap, placesMap);
            if (canFire) {
                enabledTransitions.add(transition);
            }
        });
        
        Boolean isDeterministicMode = petriNetDTO.getDeterministicMode();
        if (isDeterministicMode != null && isDeterministicMode && enabledTransitions.size() > 1) {
            System.out.println("Multiple transitions enabled after firing, user will select again");
            // Set the enabled flag for the enabled transitions
            for (Transition t : enabledTransitions) {
                t.setEnabled(true);
            }
        }
        
        else if (!enabledTransitions.isEmpty()) {
            Transition nextTransition = getTransition(enabledTransitions);
            System.out.println("Selected transition for next state: " + nextTransition.getId());
        }
        
        // Pass original DTO to preserve mode
        return convertDomainModelsToDTO(placesMap, transitions, arcsMap, petriNetDTO);
    }

    private static Transition getTransition(List<Transition> enabledTransitions) {
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
        return nextTransition;
    }
}

