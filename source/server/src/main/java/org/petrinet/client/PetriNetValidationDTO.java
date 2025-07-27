package org.petrinet.client;

import java.util.List;

/**
 * DTO for Petri net validation requests, extending the base PetriNetDTO.
 */
public class PetriNetValidationDTO extends PetriNetDTO {
    private List<PlaceConfig> inputConfigs;  // Place IDs and initial tokens
    private List<PlaceConfig> expectedOutputs;  // Place IDs and expected tokens
    
    /**
     * Inner class for place configuration (either input or expected output)
     */
    public static class PlaceConfig {
        private String placeId;
        private int tokens;
        
        // Default constructor
        public PlaceConfig() {}
        
        // Constructor with fields
        public PlaceConfig(String placeId, int tokens) {
            this.placeId = placeId;
            this.tokens = tokens;
        }
        
        // Getters and setters
        public String getPlaceId() {
            return placeId;
        }
        
        public void setPlaceId(String placeId) {
            this.placeId = placeId;
        }
        
        public int getTokens() {
            return tokens;
        }
        
        public void setTokens(int tokens) {
            this.tokens = tokens;
        }
    }
    
    // Getters and setters for the validator-specific fields
    public List<PlaceConfig> getInputConfigs() {
        return inputConfigs;
    }
    
    public void setInputConfigs(List<PlaceConfig> inputConfigs) {
        this.inputConfigs = inputConfigs;
    }
    
    public List<PlaceConfig> getExpectedOutputs() {
        return expectedOutputs;
    }
    
    public void setExpectedOutputs(List<PlaceConfig> expectedOutputs) {
        this.expectedOutputs = expectedOutputs;
    }
}