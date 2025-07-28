package org.petrinet.service;

import org.petrinet.client.*;
import org.petrinet.service.model.*;
import org.petrinet.util.PetriNetMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Service for analyzing Petri net properties and characteristics.
 * This service provides various analysis methods including reachability analysis,
 * liveness analysis, boundedness analysis, and structural analysis.
 */
@Service
public class PetriNetAnalysisService {

    private final PetriNetService petriNetService;

    @Autowired
    public PetriNetAnalysisService(PetriNetService petriNetService) {
        this.petriNetService = petriNetService;
    }

    /**
     * Analyzes reachable states from the current marking.
     * Computes all possible states (markings) the net can reach from the current state.
     *
     * @param petriNetDTO The current state of the Petri net
     * @return AnalysisResultDTO containing reachable states and analysis details
     */
    public AnalysisResultDTO analyzeReachableStates(PetriNetDTO petriNetDTO) {
        AnalysisResultDTO result = new AnalysisResultDTO();
        result.setAnalysisType("Reachable States");
        
        Set<String> reachableStates = new HashSet<>();
        Queue<PetriNetDTO> statesToExplore = new LinkedList<>();
        statesToExplore.add(createDeepCopy(petriNetDTO));
        
        int maxStates = 1000; // Safety limit
        int exploredStates = 0;
        
        while (!statesToExplore.isEmpty() && exploredStates < maxStates) {
            PetriNetDTO currentState = statesToExplore.poll();
            String stateSignature = createStateSignature(currentState);
            
            if (reachableStates.contains(stateSignature)) {
                continue; // Already explored
            }
            
            reachableStates.add(stateSignature);
            exploredStates++;
            
            // Find all enabled transitions in current state
            Map<String, Place> placesMap = PetriNetMapper.mapPlacesToMap(currentState.getPlaces());
            Map<String, Arc> arcsMap = PetriNetMapper.mapArcsToMap(currentState.getArcs());
            List<Transition> transitions = PetriNetMapper.dtoToTransitionList(currentState.getTransitions());
            
            List<Transition> enabledTransitions = transitions.stream()
                .filter(t -> petriNetService.evaluateTransition(t, arcsMap, placesMap))
                .collect(Collectors.toList());
            
            // Explore next states by firing each enabled transition
            for (Transition enabledTransition : enabledTransitions) {
                PetriNetDTO nextState = createDeepCopy(currentState);
                Map<String, Place> nextPlacesMap = PetriNetMapper.mapPlacesToMap(nextState.getPlaces());
                Map<String, Arc> nextArcsMap = PetriNetMapper.mapArcsToMap(nextState.getArcs());
                
                // Fire the transition
                petriNetService.updateTokensForFiringTransition(enabledTransition, nextArcsMap, nextPlacesMap);
                
                // Convert back to DTO and add to exploration queue
                PetriNetDTO firedState = convertToDTO(nextPlacesMap, transitions, nextArcsMap, nextState);
                statesToExplore.add(firedState);
            }
        }
        
        result.setReachableStatesCount(reachableStates.size());
        result.setExploredStatesCount(exploredStates);
        result.setReachedMaxLimit(exploredStates >= maxStates);
        result.setDetails("Found " + reachableStates.size() + " reachable states" + 
                         (exploredStates >= maxStates ? " (limited by safety threshold)" : ""));
        
        return result;
    }

    /**
     * Analyzes liveness properties of the Petri net.
     * Checks for deadlocks or livelocks; ensures transitions can eventually fire again.
     *
     * @param petriNetDTO The current state of the Petri net
     * @return AnalysisResultDTO containing liveness analysis details
     */
    public AnalysisResultDTO analyzeLiveness(PetriNetDTO petriNetDTO) {
        AnalysisResultDTO result = new AnalysisResultDTO();
        result.setAnalysisType("Liveness Analysis");
        
        Map<String, Place> placesMap = PetriNetMapper.mapPlacesToMap(petriNetDTO.getPlaces());
        Map<String, Arc> arcsMap = PetriNetMapper.mapArcsToMap(petriNetDTO.getArcs());
        List<Transition> transitions = PetriNetMapper.dtoToTransitionList(petriNetDTO.getTransitions());
        
        // Check current enabled transitions
        List<Transition> currentlyEnabled = transitions.stream()
            .filter(t -> petriNetService.evaluateTransition(t, arcsMap, placesMap))
            .collect(Collectors.toList());
        
        if (currentlyEnabled.isEmpty() && !transitions.isEmpty()) {
            result.setDetails("DEADLOCK DETECTED: No transitions are currently enabled.");
            result.setHasDeadlock(true);
            return result;
        }
        
        // For a more comprehensive liveness analysis, we would need to explore the reachability graph
        // For now, provide basic analysis
        result.setDetails("Currently " + currentlyEnabled.size() + " transitions are enabled. " +
                         "Full liveness analysis requires reachability graph exploration.");
        result.setEnabledTransitionsCount(currentlyEnabled.size());
        
        return result;
    }

    /**
     * Analyzes boundedness of the Petri net.
     * Determines if the number of tokens in any place can grow indefinitely or stays bounded.
     *
     * @param petriNetDTO The current state of the Petri net
     * @return AnalysisResultDTO containing boundedness analysis details
     */
    public AnalysisResultDTO analyzeBoundedness(PetriNetDTO petriNetDTO) {
        AnalysisResultDTO result = new AnalysisResultDTO();
        result.setAnalysisType("Boundedness Analysis");
        
        // Check for bounded places (those with capacity limits)
        long boundedPlaces = petriNetDTO.getPlaces().stream()
            .filter(PlaceDTO::isBounded)
            .count();
        
        long unboundedPlaces = petriNetDTO.getPlaces().size() - boundedPlaces;
        
        result.setBoundedPlacesCount((int) boundedPlaces);
        result.setUnboundedPlacesCount((int) unboundedPlaces);
        result.setDetails("Found " + boundedPlaces + " bounded places and " + unboundedPlaces + " unbounded places. " +
                         "Unbounded places can potentially accumulate infinite tokens.");
        
        return result;
    }

    /**
     * Computes the incidence matrix of the Petri net.
     * Shows the matrix representing the relationships between transitions and places.
     *
     * @param petriNetDTO The Petri net to analyze
     * @return AnalysisResultDTO containing the incidence matrix
     */
    public AnalysisResultDTO computeIncidenceMatrix(PetriNetDTO petriNetDTO) {
        AnalysisResultDTO result = new AnalysisResultDTO();
        result.setAnalysisType("Incidence Matrix");
        
        List<PlaceDTO> places = petriNetDTO.getPlaces();
        List<TransitionDTO> transitions = petriNetDTO.getTransitions();
        List<ArcDTO> arcs = petriNetDTO.getArcs();
        
        int[][] matrix = new int[places.size()][transitions.size()];
        
        // Initialize matrix with zeros
        for (int i = 0; i < places.size(); i++) {
            for (int j = 0; j < transitions.size(); j++) {
                matrix[i][j] = 0;
            }
        }
        
        // Fill matrix based on arcs
        for (ArcDTO arc : arcs) {
            if (arc.getType().equals("BIDIRECTIONAL")) {
                // For bidirectional arcs, we need to determine which is place and which is transition
                int placeIndex = findPlaceIndex(places, arc.getIncomingId());
                int transitionIndex = findTransitionIndex(transitions, arc.getOutgoingId());
                
                if (placeIndex >= 0 && transitionIndex >= 0) {
                    // Place -> Transition (consumption)
                    matrix[placeIndex][transitionIndex] -= 1;
                    // Transition -> Place (production)
                    matrix[placeIndex][transitionIndex] += 1;
                    // Net result: 0
                } else {
                    // Try the other direction
                    placeIndex = findPlaceIndex(places, arc.getOutgoingId());
                    transitionIndex = findTransitionIndex(transitions, arc.getIncomingId());
                    
                    if (placeIndex >= 0 && transitionIndex >= 0) {
                        // Place -> Transition (consumption)
                        matrix[placeIndex][transitionIndex] -= 1;
                        // Transition -> Place (production)
                        matrix[placeIndex][transitionIndex] += 1;
                        // Net result: 0
                    }
                }
            } else {
                // Handle regular and inhibitor arcs
                int placeIndex = findPlaceIndex(places, arc.getIncomingId());
                int transitionIndex = findTransitionIndex(transitions, arc.getOutgoingId());
                
                if (placeIndex >= 0 && transitionIndex >= 0) {
                    // Place -> Transition (consumption)
                    if (arc.getType().equals("REGULAR")) {
                        matrix[placeIndex][transitionIndex] -= 1;
                    }
                }
                
                placeIndex = findPlaceIndex(places, arc.getOutgoingId());
                transitionIndex = findTransitionIndex(transitions, arc.getIncomingId());
                
                if (placeIndex >= 0 && transitionIndex >= 0) {
                    // Transition -> Place (production)
                    if (arc.getType().equals("REGULAR")) {
                        matrix[placeIndex][transitionIndex] += 1;
                    }
                }
            }
        }
        
        result.setIncidenceMatrix(matrix);
        result.setDetails("Incidence matrix computed: " + places.size() + " places × " + transitions.size() + " transitions");
        
        return result;
    }

    /**
     * Performs structural analysis of the Petri net.
     * Analyzes properties derived directly from the net structure, ignoring the initial marking.
     *
     * @param petriNetDTO The Petri net to analyze
     * @return AnalysisResultDTO containing structural analysis details
     */
    public AnalysisResultDTO performStructuralAnalysis(PetriNetDTO petriNetDTO) {
        AnalysisResultDTO result = new AnalysisResultDTO();
        result.setAnalysisType("Structural Analysis");
        
        List<PlaceDTO> places = petriNetDTO.getPlaces();
        List<TransitionDTO> transitions = petriNetDTO.getTransitions();
        List<ArcDTO> arcs = petriNetDTO.getArcs();
        
        // Count arc types
        long regularArcs = arcs.stream().filter(a -> a.getType().equals("REGULAR")).count();
        long inhibitorArcs = arcs.stream().filter(a -> a.getType().equals("INHIBITOR")).count();
        long bidirectionalArcs = arcs.stream().filter(a -> a.getType().equals("BIDIRECTIONAL")).count();
        
        // Find isolated elements
        Set<String> connectedPlaces = new HashSet<>();
        Set<String> connectedTransitions = new HashSet<>();
        
        for (ArcDTO arc : arcs) {
            // Check if incoming ID is a place or transition
            boolean incomingIsPlace = places.stream().anyMatch(p -> p.getId().equals(arc.getIncomingId()));
            boolean outgoingIsPlace = places.stream().anyMatch(p -> p.getId().equals(arc.getOutgoingId()));
            
            if (incomingIsPlace) {
                connectedPlaces.add(arc.getIncomingId());
            } else {
                connectedTransitions.add(arc.getIncomingId());
            }
            
            if (outgoingIsPlace) {
                connectedPlaces.add(arc.getOutgoingId());
            } else {
                connectedTransitions.add(arc.getOutgoingId());
            }
        }
        
        long isolatedPlaces = places.stream()
            .filter(p -> !connectedPlaces.contains(p.getId()))
            .count();
        
        long isolatedTransitions = transitions.stream()
            .filter(t -> !connectedTransitions.contains(t.getId()))
            .count();
        
        result.setRegularArcsCount((int) regularArcs);
        result.setInhibitorArcsCount((int) inhibitorArcs);
        result.setBidirectionalArcsCount((int) bidirectionalArcs);
        result.setIsolatedPlacesCount((int) isolatedPlaces);
        result.setIsolatedTransitionsCount((int) isolatedTransitions);
        
        result.setDetails("Structural analysis: " + regularArcs + " regular, " + inhibitorArcs + 
                         " inhibitor, " + bidirectionalArcs + " bidirectional arcs. " +
                         isolatedPlaces + " isolated places, " + isolatedTransitions + " isolated transitions.");
        
        return result;
    }

    // Helper methods
    private String createStateSignature(PetriNetDTO state) {
        return state.getPlaces().stream()
            .map(p -> p.getId() + ":" + p.getTokens())
            .sorted()
            .collect(Collectors.joining("|"));
    }

    private PetriNetDTO createDeepCopy(PetriNetDTO original) {
        // Create deep copy implementation
        List<PlaceDTO> places = original.getPlaces().stream()
            .map(p -> new PlaceDTO(p.getId(), p.getTokens(), p.isBounded(), p.getCapacity()))
            .collect(Collectors.toList());
            
        List<TransitionDTO> transitions = original.getTransitions().stream()
            .map(t -> new TransitionDTO(t.getId(), t.getEnabled(), new ArrayList<>(t.getArcIds())))
            .collect(Collectors.toList());
            
        List<ArcDTO> arcs = original.getArcs().stream()
            .map(a -> new ArcDTO(a.getId(), a.getType(), a.getIncomingId(), a.getOutgoingId()))
            .collect(Collectors.toList());
            
        PetriNetDTO copy = new PetriNetDTO(places, transitions, arcs);
        copy.setDeterministicMode(original.getDeterministicMode());
        return copy;
    }

    private PetriNetDTO convertToDTO(Map<String, Place> placesMap, List<Transition> transitions,
                                   Map<String, Arc> arcsMap, PetriNetDTO originalDTO) {
        // This would use the same logic as PetriNetService.convertDomainModelsToDTO
        // For brevity, implementing a simplified version
        List<PlaceDTO> placeDTOs = placesMap.values().stream()
            .map(place -> new PlaceDTO(place.getId(), place.getTokens(), place.isBounded(), place.getCapacity()))
            .collect(Collectors.toList());
            
        List<TransitionDTO> transitionDTOs = transitions.stream()
            .map(transition -> new TransitionDTO(transition.getId(), transition.getEnabled(), transition.getArcIds()))
            .collect(Collectors.toList());
            
        List<ArcDTO> arcDTOs = arcsMap.values().stream()
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
        newDTO.setDeterministicMode(originalDTO.getDeterministicMode());
        return newDTO;
    }

    private int findPlaceIndex(List<PlaceDTO> places, String placeId) {
        for (int i = 0; i < places.size(); i++) {
            if (places.get(i).getId().equals(placeId)) {
                return i;
            }
        }
        return -1;
    }

    private int findTransitionIndex(List<TransitionDTO> transitions, String transitionId) {
        for (int i = 0; i < transitions.size(); i++) {
            if (transitions.get(i).getId().equals(transitionId)) {
                return i;
            }
        }
        return -1;
    }
} 