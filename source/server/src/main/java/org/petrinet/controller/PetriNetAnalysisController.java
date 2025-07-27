package org.petrinet.controller;

import org.petrinet.client.AnalysisResultDTO;
import org.petrinet.client.PetriNetDTO;
import org.petrinet.service.PetriNetAnalysisService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/analysis")
public class PetriNetAnalysisController {

    private final PetriNetAnalysisService analysisService;

    @Autowired
    public PetriNetAnalysisController(PetriNetAnalysisService analysisService) {
        this.analysisService = analysisService;
    }

    @PostMapping("/reachable-states")
    public ResponseEntity<AnalysisResultDTO> analyzeReachableStates(@RequestBody PetriNetDTO petriNetDTO) {
        try {
            AnalysisResultDTO result = analysisService.analyzeReachableStates(petriNetDTO);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new AnalysisResultDTO("Reachable States", "Error: " + e.getMessage()));
        }
    }

    @PostMapping("/liveness")
    public ResponseEntity<AnalysisResultDTO> analyzeLiveness(@RequestBody PetriNetDTO petriNetDTO) {
        try {
            AnalysisResultDTO result = analysisService.analyzeLiveness(petriNetDTO);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new AnalysisResultDTO("Liveness", "Error: " + e.getMessage()));
        }
    }

    @PostMapping("/boundedness")
    public ResponseEntity<AnalysisResultDTO> analyzeBoundedness(@RequestBody PetriNetDTO petriNetDTO) {
        try {
            AnalysisResultDTO result = analysisService.analyzeBoundedness(petriNetDTO);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new AnalysisResultDTO("Boundedness", "Error: " + e.getMessage()));
        }
    }

    @PostMapping("/incidence-matrix")
    public ResponseEntity<AnalysisResultDTO> computeIncidenceMatrix(@RequestBody PetriNetDTO petriNetDTO) {
        try {
            AnalysisResultDTO result = analysisService.computeIncidenceMatrix(petriNetDTO);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new AnalysisResultDTO("Incidence Matrix", "Error: " + e.getMessage()));
        }
    }

    @PostMapping("/structural")
    public ResponseEntity<AnalysisResultDTO> performStructuralAnalysis(@RequestBody PetriNetDTO petriNetDTO) {
        try {
            AnalysisResultDTO result = analysisService.performStructuralAnalysis(petriNetDTO);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new AnalysisResultDTO("Structural Analysis", "Error: " + e.getMessage()));
        }
    }
} 