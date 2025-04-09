package org.petrinet.controller;

import org.petrinet.service.PetriNetService;
import org.petrinet.client.PetriNetDTO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class PetriNetController {

    private final PetriNetService petriNetService;

    @Autowired
    public PetriNetController(PetriNetService petriNetService) {
        this.petriNetService = petriNetService;
    }

    @PostMapping("/api/process")
    public ResponseEntity<?> processPetriNet(@RequestBody PetriNetDTO petriNetDTO) {
        try {
            PetriNetDTO updatedPetriNetDTO = petriNetService.processPetriNet(petriNetDTO);
            return ResponseEntity.ok(updatedPetriNetDTO);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error processing Petri net: " + e.getMessage());
        }
    }
    
    @PostMapping("/api/process/resolve")
    public ResponseEntity<?> resolveConflict(@RequestBody PetriNetDTO petriNetDTO) {
        try {
            // Extract the selected transition ID from the request
            String selectedTransitionId = petriNetDTO.getSelectedTransitionId();
            if (selectedTransitionId == null || selectedTransitionId.isEmpty()) {
                return ResponseEntity.badRequest().body("No transition selected for conflict resolution");
            }
            
            // Process the Petri net with the selected transition
            PetriNetDTO updatedPetriNetDTO = petriNetService.resolveConflict(petriNetDTO, selectedTransitionId);
            return ResponseEntity.ok(updatedPetriNetDTO);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error resolving conflict: " + e.getMessage());
        }
    }
}
