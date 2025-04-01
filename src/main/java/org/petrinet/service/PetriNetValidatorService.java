package org.petrinet.service;

import org.petrinet.client.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Service for validating Petri nets given input configurations and expected outputs.
 * Always runs in deterministic mode to properly detect conflicts.
 */
@Service
public class PetriNetValidatorService {

    private final PetriNetService petriNetService;

    @Autowired
    public PetriNetValidatorService(PetriNetService petriNetService) {
        this.petriNetService = petriNetService;
    }

    /**
     * Validates a Petri net by running it with specified inputs and checking if it
     * reaches the expected output state when no more transitions can fire.
     *
     * @param requestDTO The validation request containing the Petri net and validation parameters
     * @return A validation result indicating success or failure with details
     */
    public ValidationResultDTO validatePetriNet(PetriNetValidationDTO requestDTO) {
        // Create a deep copy of the Petri net to avoid modifying the original
        PetriNetDTO petriNetCopy = createDeepCopy(requestDTO);
        
        // Force deterministic mode for validation
        petriNetCopy.setDeterministicMode(true);
        
        // Apply initial tokens based on input configurations
        applyInputTokens(petriNetCopy, requestDTO.getInputConfigs());
        
        // Run simulation until no more transitions can fire or a conflict is detected
        return runSimulationForValidation(petriNetCopy, requestDTO.getExpectedOutputs());
    }
    
    /**
     * Runs the Petri net simulation until completion or conflict and validates the result.
     */
    private ValidationResultDTO runSimulationForValidation(PetriNetDTO petriNet, 
                                                       List<PetriNetValidationDTO.PlaceConfig> expectedOutputs) {
        ValidationResultDTO result = new ValidationResultDTO();
        
        boolean done = false;
        PetriNetDTO currentState = petriNet;
        
        while (!done) {
            // Process one step using existing mechanism
            PetriNetDTO processedState = petriNetService.processPetriNet(currentState);
            
            // Check if there are enabled transitions (conflict in deterministic mode)
            List<TransitionDTO> enabledTransitions = processedState.getTransitions().stream()
                .filter(TransitionDTO::getEnabled)
                .collect(Collectors.toList());
            
            if (enabledTransitions.size() > 1) {
                // Conflict detected
                result.setValid(false);
                result.setMessage("Validation failed: conflict detected with multiple enabled transitions. There can only be one enabled transition at a time.");
                result.setConflictingTransitions(
                    enabledTransitions.stream()
                        .map(TransitionDTO::getId)
                        .collect(Collectors.toList())
                );
                result.setFinalState(processedState);
                
                done = true;
            } else if (enabledTransitions.isEmpty()) {
                // No more transitions can fire, check output places
                Map<String, Boolean> outputMatches = new HashMap<>();
                
                // Map places by ID for easier lookup
                Map<String, PlaceDTO> placesById = processedState.getPlaces().stream()
                    .collect(Collectors.toMap(PlaceDTO::getId, p -> p));
                
                // Check each expected output
                boolean allMatchingOutputs = true;
                StringBuilder detailMessage = new StringBuilder();
                
                for (PetriNetValidationDTO.PlaceConfig expected : expectedOutputs) {
                    PlaceDTO place = placesById.get(expected.getPlaceId());
                    
                    if (place == null) {
                        outputMatches.put(expected.getPlaceId(), false);
                        allMatchingOutputs = false;
                        detailMessage.append("Place ").append(expected.getPlaceId())
                                    .append(" not found. ");
                    } else {
                        boolean matches = place.getTokens() == expected.getTokens();
                        outputMatches.put(expected.getPlaceId(), matches);
                        
                        if (!matches) {
                            allMatchingOutputs = false;
                            detailMessage.append("Place ").append(expected.getPlaceId())
                                        .append(" has ").append(place.getTokens())
                                        .append(" tokens, expected ").append(expected.getTokens())
                                        .append(". ");
                        }
                    }
                }
                
                result.setValid(allMatchingOutputs);
                result.setOutputMatches(outputMatches);
                result.setFinalState(processedState);
                
                if (allMatchingOutputs) {
                    result.setMessage("Validation successful: all output places match expected token counts");
                } else {
                    result.setMessage("Validation failed: " + detailMessage.toString());
                }
                
                done = true;
            } else {
                // One transition was fired, update for next iteration
                currentState = processedState;
            }
        }
        
        return result;
    }
    
    /**
     * Applies the initial token configuration to the places in the Petri net.
     */
    private void applyInputTokens(PetriNetDTO petriNet, List<PetriNetValidationDTO.PlaceConfig> inputConfigs) {
        // Reset all places to 0 tokens first
        petriNet.getPlaces().forEach(p -> p.setTokens(0));
        
        // Map places by ID for easier lookup
        Map<String, PlaceDTO> placesById = petriNet.getPlaces().stream()
            .collect(Collectors.toMap(PlaceDTO::getId, p -> p));
        
        // Apply token counts from input configurations
        for (PetriNetValidationDTO.PlaceConfig input : inputConfigs) {
            PlaceDTO place = placesById.get(input.getPlaceId());
            if (place != null) {
                place.setTokens(input.getTokens());
            }
        }
    }
    
    /**
     * Creates a deep copy of the Petri net to avoid modifying the original during validation.
     */
    private PetriNetDTO createDeepCopy(PetriNetValidationDTO original) {
        // Copy places
        List<PlaceDTO> placesCopy = original.getPlaces().stream()
            .map(p -> new PlaceDTO(p.getId(), p.getTokens()))
            .collect(Collectors.toList());
        
        // Copy transitions
        List<TransitionDTO> transitionsCopy = original.getTransitions().stream()
            .map(t -> {
                TransitionDTO copy = new TransitionDTO(t.getId(), t.getEnabled(), new ArrayList<>(t.getArcIds()));
                return copy;
            })
            .collect(Collectors.toList());
        
        // Copy arcs
        List<ArcDTO> arcsCopy = original.getArcs().stream()
            .map(a -> new ArcDTO(a.getId(), a.getType(), a.getIncomingId(), a.getOutgoingId()))
            .collect(Collectors.toList());
        
        // Create new Petri net with copied components
        PetriNetDTO copy = new PetriNetDTO(placesCopy, transitionsCopy, arcsCopy);
        return copy;
    }
}