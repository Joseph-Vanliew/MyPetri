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

        // Randomly select one enabled transition (if any exist) and update its tokens
        if (!enabledTransitions.isEmpty()) {
            Random random = new Random();
            Transition selectedTransition = enabledTransitions.get(random.nextInt(enabledTransitions.size()));
            
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
        // First, collect all places that need to be replenished due to bidirectional arcs
        Set<String> placesToReplenish = new HashSet<>();
        
        // Identify places connected to bidirectional arcs that will lose tokens
        transition.getArcIds().stream()
                .map(arcsMap::get)
                .filter(arc -> arc instanceof Arc.BidirectionalArc && arc.getOutgoingId().equals(transition.getId()))
                .forEach(arc -> placesToReplenish.add(arc.getIncomingId()));
        
        // First, handle token consumption (incoming arcs)
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
        
        // Then, handle token production (outgoing arcs)
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
        
        // Finally, replenish tokens for places connected to bidirectional arcs
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
}
