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
