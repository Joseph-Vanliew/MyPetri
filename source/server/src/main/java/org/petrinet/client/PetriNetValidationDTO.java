package org.petrinet.client;

import java.util.List;

/**
 * DTO for Petri net validation requests, extending the base PetriNetDTO.
 */
public class PetriNetValidationDTO extends PetriNetDTO {
    private List<PlaceDTO> inputConfigs;  // Use PlaceDTO instead of PlaceConfig
    private List<PlaceDTO> expectedOutputs;  // Use PlaceDTO instead of PlaceConfig
    
    // Remove the inner PlaceConfig class entirely
    
    // Getters and setters for the validator-specific fields
    public List<PlaceDTO> getInputConfigs() {
        return inputConfigs;
    }
    
    public void setInputConfigs(List<PlaceDTO> inputConfigs) {
        this.inputConfigs = inputConfigs;
    }
    
    public List<PlaceDTO> getExpectedOutputs() {
        return expectedOutputs;
    }
    
    public void setExpectedOutputs(List<PlaceDTO> expectedOutputs) {
        this.expectedOutputs = expectedOutputs;
    }
}