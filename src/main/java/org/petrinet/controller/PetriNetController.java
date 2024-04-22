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

    @PostMapping("/api/petrinet")
    public ResponseEntity<?> processPetriNet(@RequestBody PetriNetDTO petriNetDTO) {
        try {
            PetriNetDTO updatedPetriNetDTO = petriNetService.processPetriNet(petriNetDTO);
            return ResponseEntity.ok(updatedPetriNetDTO);
        } catch (Exception e) {
            // Handle specific exceptions here as needed
            return ResponseEntity.badRequest().body("Error processing Petri net: " + e.getMessage());
        }
    }

}
