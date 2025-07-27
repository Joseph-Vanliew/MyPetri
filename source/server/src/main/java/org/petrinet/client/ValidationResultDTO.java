package org.petrinet.client;

import java.util.List;
import java.util.Map;

/**
 * Result object for Petri net validation operations.
 */
public class ValidationResultDTO {
    private boolean valid;
    private String message;
    private List<String> conflictingTransitions;  // Only populated if there's a conflict
    private PetriNetDTO finalState;  // The final state of the Petri net after validation
    private Map<String, Boolean> outputMatches;  // Map of place ID to whether its actual tokens matched the expected count
    
    // Default constructor
    public ValidationResultDTO() {}
    
    // Constructor for simple result
    public ValidationResultDTO(boolean valid, String message) {
        this.valid = valid;
        this.message = message;
    }
    
    // Getters and setters
    public boolean isValid() {
        return valid;
    }
    
    public void setValid(boolean valid) {
        this.valid = valid;
    }
    
    public String getMessage() {
        return message;
    }
    
    public void setMessage(String message) {
        this.message = message;
    }
    
    public List<String> getConflictingTransitions() {
        return conflictingTransitions;
    }
    
    public void setConflictingTransitions(List<String> conflictingTransitions) {
        this.conflictingTransitions = conflictingTransitions;
    }
    
    public PetriNetDTO getFinalState() {
        return finalState;
    }
    
    public void setFinalState(PetriNetDTO finalState) {
        this.finalState = finalState;
    }
    
    public Map<String, Boolean> getOutputMatches() {
        return outputMatches;
    }
    
    public void setOutputMatches(Map<String, Boolean> outputMatches) {
        this.outputMatches = outputMatches;
    }
}