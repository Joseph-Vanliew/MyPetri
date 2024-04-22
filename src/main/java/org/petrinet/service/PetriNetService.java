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

        // Evaluate each transition
        List<Transition> evaluatedTransitions = new ArrayList<>();
        for (Transition transition : transitions) {
            boolean canFire = evaluateTransition(transition, arcsMap, placesMap, totalIncomingTransitionCounts);
            transition.setEnabled(canFire);
            evaluatedTransitions.add(transition);
            if (canFire) {
                updateTokensForFiringTransition(transition, arcsMap, placesMap);
            }
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
            Transition transition,  Map<String, Arc> arcsMap,
            Map<String, Place> placesMap, Map<String, Integer> totalIncomingTransitionCounts) {

        List<Arc> incomingArcs = arcsMap.values().stream()
                .filter(arc -> transition.getArcIds().contains(arc.getId())
                        && arc.getOutgoingId().equals(transition.getId()))
                .toList();
        boolean allConditionsMet = true;

        if (incomingArcs.isEmpty()) {
            transition.setEnabled(true);
            return true; // the transition can fire unconditionally
        }

        // Evaluate the transition based on the total incoming transition count and available tokens
        for (Arc arc : incomingArcs) {
            Place sourcePlace = placesMap.get(arc.getIncomingId());

            int availableTokens = sourcePlace.getTokens();
            int requiredTokens = totalIncomingTransitionCounts.getOrDefault(arc.getIncomingId(), 0);

            if (arc instanceof Arc.InhibitorArc) {
                if (availableTokens != 0) {
                    transition.setEnabled(false);
                    return false; // Inhibitor arc requires zero tokens to enable transition
                }
            } else if (availableTokens < requiredTokens) {
                transition.setEnabled(false);
                return false; // Not enough tokens available to satisfy all incoming transitions
            }
        }
        transition.setEnabled(allConditionsMet);
        return allConditionsMet;
    }

    public void updateTokensForFiringTransition(Transition transition, Map<String, Arc> arcsMap,
                                                Map<String, Place> placesMap) {
        //process incoming arcs: transition consumes token via incoming regular arc from originating place
        transition.getArcIds().stream()
                .map(arcsMap::get)
                .filter(arc -> arc != null && arc.getOutgoingId().equals(transition.getId())) // Confirm arc is incoming to transition
                .forEach(arc -> {
                    if (arc instanceof Arc.RegularArc) {
                        Place sourcePlace = placesMap.get(arc.getIncomingId());
                        if (sourcePlace != null && sourcePlace.getTokens() > 0) {
                            sourcePlace.removeTokens();
                        }
                    }
                });
        // Process outgoing arcs: add a token to target places of outgoing regular arcs and bidirectional arcs
        transition.getArcIds().stream()
                .map(arcsMap::get)
                .filter(arc -> arc != null && arc.getIncomingId().equals(transition.getId()))
                .forEach(arc -> {
                    if (arc instanceof Arc.RegularArc || arc instanceof Arc.BidirectionalArc) {
                        Place targetPlace = placesMap.get(arc.getOutgoingId());
                        if (targetPlace != null) {
                            targetPlace.addToken();
                        }
                    }
                });
    }

    private PetriNetDTO convertDomainModelsToDTO(Map<String, Place> placesMap, List<Transition> transitions,
                                                 Map<String, Arc> arcsMap) {
        List<PlaceDTO> placeDTOs = placesMap.values().stream()
                .map(place -> new PlaceDTO(place.getId(), place.getTokens()))
                .collect(Collectors.toList());
        //These should really be in the mapper class
        List<TransitionDTO> transitionDTOs = transitions.stream()
                .map(transition -> new TransitionDTO(transition.getId(), transition.getEnabled(), transition.getArcIds()))
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
        // Aggregate our return object
        PetriNetDTO updatedPetriNetDTO = new PetriNetDTO();
        updatedPetriNetDTO.setPlaces(placeDTOs);
        updatedPetriNetDTO.setTransitions(transitionDTOs);
        updatedPetriNetDTO.setArcs(arcDTOs);

        return updatedPetriNetDTO;
    }
}
