package org.petrinet.controller;

import org.petrinet.client.PetriNetValidationDTO;
import org.petrinet.client.ValidationResultDTO;
import org.petrinet.service.PetriNetValidatorService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

/**
 * Controller for Petri net validation operations.
 */
@RestController
public class PetriNetValidatorController {

    private final PetriNetValidatorService validatorService;

    @Autowired
    public PetriNetValidatorController(PetriNetValidatorService validatorService) {
        this.validatorService = validatorService;
    }

    /**
     * Endpoint for validating a Petri net with specified inputs and expected outputs.
     * 
     * @param requestDTO The validation request containing the Petri net and validation parameters
     * @return A validation result or an error message
     */
    @PostMapping("/api/validate")
    public ResponseEntity<?> validatePetriNet(@RequestBody PetriNetValidationDTO requestDTO) {
        try {
            ValidationResultDTO result = validatorService.validatePetriNet(requestDTO);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error validating Petri net: " + e.getMessage());
        }
    }
}