package org.petrinet.service;

import org.petrinet.client.*;
import org.petrinet.util.PetriNetUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Service for validating Petri nets given input configurations and expected outputs.
 * This service simulates the Petri net step-by-step in deterministic mode to check 
 * for conflicts, infinite loops, and whether the net reaches the expected final state.
 */
@Service
public class PetriNetValidatorService {

    private final PetriNetService petriNetService;

    /**
     * Constructs a new PetriNetValidatorService with the necessary dependency.
     *
     * @param petriNetService The service used to process individual Petri net steps.
     */
    @Autowired
    public PetriNetValidatorService(PetriNetService petriNetService) {
        this.petriNetService = petriNetService;
    }

    /**
     * Validates a Petri net by running it with specified inputs and checking if it
     * reaches the expected output state when no more transitions can fire.
     * It performs a deep copy of the input net to avoid side effects and forces
     * deterministic mode for the simulation.
     *
     * @param requestDTO The validation request containing the Petri net structure, 
     *                   initial token configuration, and expected final token counts.
     * @return A {@link ValidationResultDTO} indicating success or failure, along with details
     *         about conflicts, loops, or final state comparison.
     */
    public ValidationResultDTO validatePetriNet(PetriNetValidationDTO requestDTO) {
        // Create a deep copy of the Petri net to avoid modifying the original
        PetriNetDTO petriNetCopy = PetriNetUtils.createDeepCopyFromValidation(requestDTO);
        
        // Force deterministic mode for validation
        petriNetCopy.setDeterministicMode(true);
        
        // Apply initial tokens based on input configurations
        PetriNetUtils.applyInputTokens(petriNetCopy, requestDTO.getInputConfigs());
        
        // Check if any initial tokens were actually set
        long totalInitialTokens = PetriNetUtils.calculateTotalTokens(petriNetCopy);
        if (totalInitialTokens == 0) {
            ValidationResultDTO result = new ValidationResultDTO();
            result.setValid(false);
            result.setMessage("Validation failed: No initial tokens provided in the input configuration. The simulation requires at least one token to start.");
            // Set the initial (all zero) state as the final state for context
            result.setFinalState(petriNetCopy); 
            return result;
        }

        // Run simulation until no more transitions can fire or a conflict is detected
        return runSimulationForValidation(petriNetCopy, requestDTO.getExpectedOutputs());
    }
    
    /**
     * Runs the Petri net simulation step-by-step until completion, conflict, or loop detection.
     * Completion occurs when no transitions are enabled. Conflicts occur if multiple transitions
     * are enabled simultaneously in deterministic mode. Loops are detected by tracking previously
     * seen token distributions (states) or by exceeding a maximum iteration count.
     *
     * @param petriNet The {@link PetriNetDTO} instance (a deep copy) to simulate.
     *                 This instance will be modified during the simulation.
     * @param expectedOutputs A list of {@link PetriNetValidationDTO.PlaceConfig} specifying the 
     *                        expected token counts for specific places in the final state.
     * @return A {@link ValidationResultDTO} containing the results of the simulation and validation.
     */
    private ValidationResultDTO runSimulationForValidation(PetriNetDTO petriNet, 
                                                       List<PetriNetValidationDTO.PlaceConfig> expectedOutputs) {
        ValidationResultDTO result = new ValidationResultDTO();
        
        // Keep track of previously seen states
        Set<String> seenStates = new HashSet<>();
        int maxIterations = 1000; // Safety limit to prevent excessive computation
        int iterations = 0;
        
        boolean done = false;
        PetriNetDTO currentState = petriNet;
        
        while (!done) {
            // Create a state signature based on token distribution
            String stateSignature = PetriNetUtils.createStateSignature(currentState);
            
            // Check for infinite loop by revisiting a state
            if (seenStates.contains(stateSignature)) {
                result.setValid(false);
                result.setMessage("Validation failed: Infinite loop detected. The simulation encountered the same token distribution multiple times. Repeated state signature: [" + stateSignature + "]");
                result.setFinalState(currentState); // Set the state where loop was detected
                return result;
            }
            
            // Add current state to seen states
            seenStates.add(stateSignature);
            
            // Check for maximum iterations exceeded
            if (++iterations > maxIterations) {
                result.setValid(false);
                result.setMessage("Validation failed: Simulation exceeded the maximum allowed number of iterations (" + maxIterations + "). This often indicates a potential infinite loop or an unexpectedly long execution.");
                result.setFinalState(currentState); // Set the state when max iterations hit
                return result;
            }

            // Add logging inside the validator loop
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
}