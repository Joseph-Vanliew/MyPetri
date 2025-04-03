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
        /* INSERT START */
        System.out.println("DEBUG Controller: Received /api/process request DTO:");
        try {
            // Attempt to log JSON using Jackson if available (add import com.fasterxml.jackson.databind.ObjectMapper;)
            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            System.out.println(mapper.writerWithDefaultPrettyPrinter().writeValueAsString(petriNetDTO));
        } catch (Exception e) {
            // Fallback logging if Jackson fails or is not easily available
            System.out.println("    (Basic toString): " + petriNetDTO);
            // Consider logging place details manually if needed
            if (petriNetDTO != null && petriNetDTO.getPlaces() != null) {
                petriNetDTO.getPlaces().forEach(p -> 
                    System.out.println("        Place ID: " + p.getId() + ", Tokens: " + p.getTokens() + ", Bounded: " + p.isBounded() + ", Capacity: " + p.getCapacity())
                );
            }
        }
        System.out.println("--- End of DTO Log ---");
        /* INSERT END */
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
