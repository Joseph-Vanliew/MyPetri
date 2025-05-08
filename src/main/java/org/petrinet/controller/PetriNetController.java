package org.petrinet.controller;

import org.petrinet.service.PetriNetService;
import org.petrinet.client.PetriNetDTO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
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

    @PostMapping("/api/process/page/{pageId}/process")
    public ResponseEntity<?> processPetriNet(
            @PathVariable String pageId,
            @RequestBody PetriNetDTO currentPetriNetState) {
        try {
            PetriNetDTO nextPetriNetState = petriNetService.processPetriNet(currentPetriNetState);
            return ResponseEntity.ok(nextPetriNetState);
        } catch (Exception e) {
            // It's good practice to log the exception here
            return ResponseEntity.badRequest().body("Error processing Petri net for page " + pageId + ": " + e.getMessage());
        }
    }
    
    @PostMapping("/api/process/resolve/page/{pageId}/resolve")
    public ResponseEntity<?> resolveConflict(
            @PathVariable String pageId,
            @RequestBody PetriNetDTO petriNetInConflict) {
        try {
            String selectedTransitionId = petriNetInConflict.getSelectedTransitionId(); 
            if (selectedTransitionId == null || selectedTransitionId.isEmpty()) {
                return ResponseEntity.badRequest().body("No transition selected for conflict resolution on page " + pageId);
            }
            
            PetriNetDTO resolvedPetriNetState = petriNetService.resolveConflict(petriNetInConflict, selectedTransitionId);
            return ResponseEntity.ok(resolvedPetriNetState);
        } catch (Exception e) {
            // Log exception
            return ResponseEntity.badRequest().body("Error resolving conflict for page " + pageId + ": " + e.getMessage());
        }
    }
}
