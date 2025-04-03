package org.petrinet.service;

import org.petrinet.client.*;
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
        PetriNetDTO petriNetCopy = createDeepCopy(requestDTO);
        
        // Force deterministic mode for validation
        petriNetCopy.setDeterministicMode(true);
        
        // Apply initial tokens based on input configurations
        applyInputTokens(petriNetCopy, requestDTO.getInputConfigs());
        
        // Check if any initial tokens were actually set
        long totalInitialTokens = petriNetCopy.getPlaces().stream()
                                        .mapToLong(PlaceDTO::getTokens)
                                        .sum();
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
            String stateSignature = createStateSignature(currentState);
            
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
            System.out.println("Validator: Calling processPetriNet. Deterministic mode: " + currentState.getDeterministicMode());
            PetriNetDTO processedState = petriNetService.processPetriNet(currentState);
            System.out.println("Validator: Received processedState.");
            
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
     * Applies the initial token configuration to the places in the provided Petri net.
     * First, all places in the net are reset to have 0 tokens. Then, tokens are added
     * according to the provided input configurations.
     *
     * @param petriNet The {@link PetriNetDTO} whose places will be initialized. This object is modified directly.
     * @param inputConfigs A list of {@link PetriNetValidationDTO.PlaceConfig} specifying the initial
     *                     token counts for certain places. Places not listed remain at 0 tokens.
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
     * Creates a deep copy of the Petri net structure (places, transitions, arcs) defined 
     * within the validation request DTO. This is essential to prevent the simulation 
     * from modifying the original data sent by the client.
     *
     * @param requestDTO The {@link PetriNetValidationDTO} containing the original Petri net definition.
     * @return A new {@link PetriNetDTO} instance representing a deep copy of the places,
     *         transitions, and arcs from the request DTO.
     */
    private PetriNetDTO createDeepCopy(PetriNetValidationDTO requestDTO) {
        // Copy places
        List<PlaceDTO> placesCopy = requestDTO.getPlaces().stream()
            .map(p -> new PlaceDTO(
                p.getId(),
                p.getTokens(),
                p.isBounded(),
                p.getCapacity()
            ))
            .collect(Collectors.toList());
        
        // Copy transitions
        List<TransitionDTO> transitionsCopy = requestDTO.getTransitions().stream()
            .map(t -> {
                // Ensure arcIds list is mutable for potential modifications if needed elsewhere
                List<String> arcIdsCopy = t.getArcIds() == null ? new ArrayList<>() : new ArrayList<>(t.getArcIds());
                TransitionDTO copy = new TransitionDTO(t.getId(), t.getEnabled(), arcIdsCopy);
                return copy;
            })
            .collect(Collectors.toList());
        
        // Copy arcs
        List<ArcDTO> arcsCopy = requestDTO.getArcs().stream()
            .map(a -> new ArcDTO(a.getId(), a.getType(), a.getIncomingId(), a.getOutgoingId()))
            .collect(Collectors.toList());
        
        // Create new Petri net DTO with copied components
        PetriNetDTO copy = new PetriNetDTO(placesCopy, transitionsCopy, arcsCopy);
        // Ensure deterministic mode setting from the original request is preserved if needed, 
        // although it's forced to true in validatePetriNet for validation purposes.
        return copy;
    }

    /**
     * Creates a unique string signature for a given Petri net state based on its token distribution.
     * The signature is generated by concatenating 'placeId:tokenCount' pairs, sorted alphabetically
     * by place ID to ensure the signature is deterministic regardless of the order of places in the list.
     * This signature is used for detecting repeated states (infinite loops).
     *
     * @param state The {@link PetriNetDTO} representing the current state of the Petri net.
     * @return A deterministic string signature of the state's token distribution (e.g., "p1:1,p2:0,p3:2"),
     *         or an empty string if the state or its places list is null.
     */
    private String createStateSignature(PetriNetDTO state) {
        if (state == null || state.getPlaces() == null) {
            return ""; // Or throw an exception, depending on desired handling
        }
        return state.getPlaces().stream()
            .filter(Objects::nonNull) // Avoid NullPointerException if a place is null
            .sorted(Comparator.comparing(PlaceDTO::getId)) // Sort by ID for consistent order
            .map(place -> place.getId() + ":" + place.getTokens())
            .collect(Collectors.joining(",")); // Join with a delimiter
    }
}