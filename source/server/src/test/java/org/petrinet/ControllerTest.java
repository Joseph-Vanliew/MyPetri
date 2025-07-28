package org.petrinet;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.petrinet.client.*;
import org.petrinet.controller.*;
import org.petrinet.service.*;
import org.springframework.test.context.ContextConfiguration;

import java.util.Arrays;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest({PetriNetController.class, PetriNetValidatorController.class, PetriNetAnalysisController.class})
@ContextConfiguration(classes = org.petrinet.MyPetriApplication.class)
class ControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private PetriNetService petriNetService;

    @MockBean
    private PetriNetValidatorService validatorService;

    @MockBean
    private PetriNetAnalysisService analysisService;

    @Autowired
    private ObjectMapper objectMapper;

    private PetriNetDTO samplePetriNet;
    private ValidationResultDTO sampleValidationResult;
    private AnalysisResultDTO sampleAnalysisResult;
    private PetriNetValidationDTO sampleValidationRequest;

    @BeforeEach
    void setUp() {
        // Given: Sample Petri net data
        PlaceDTO place1 = new PlaceDTO("p1", 2, false, null);
        PlaceDTO place2 = new PlaceDTO("p2", 0, false, null);
        
        TransitionDTO transition = new TransitionDTO("t1", false, Arrays.asList("arc1", "arc2"));
        
        ArcDTO arc1 = new ArcDTO("arc1", "REGULAR", "p1", "t1");
        ArcDTO arc2 = new ArcDTO("arc2", "REGULAR", "t1", "p2");
        
        samplePetriNet = new PetriNetDTO(
            Arrays.asList(place1, place2),
            Arrays.asList(transition),
            Arrays.asList(arc1, arc2)
        );

        // Given: Sample validation result
        sampleValidationResult = new ValidationResultDTO();
        sampleValidationResult.setValid(true);
        sampleValidationResult.setMessage("Petri net is valid");

        // Given: Sample analysis result
        sampleAnalysisResult = new AnalysisResultDTO();
        sampleAnalysisResult.setAnalysisType("Reachable States");
        sampleAnalysisResult.setReachableStatesCount(5);
        sampleAnalysisResult.setDetails("Found 5 reachable states");

        // Given: Sample validation request
        sampleValidationRequest = new PetriNetValidationDTO();
        sampleValidationRequest.setPlaces(samplePetriNet.getPlaces());
        sampleValidationRequest.setTransitions(samplePetriNet.getTransitions());
        sampleValidationRequest.setArcs(samplePetriNet.getArcs());
        sampleValidationRequest.setInputConfigs(Arrays.asList(
            new PlaceDTO("p1", 2)
        ));
        sampleValidationRequest.setExpectedOutputs(Arrays.asList(
            new PlaceDTO("p2", 1)
        ));
    }

    // ==================== PETRI NET CONTROLLER TESTS ====================

    @Test
    void processPetriNet_ValidNet_ReturnsProcessedResult() throws Exception {
        // Given: Mock service returns processed result
        when(petriNetService.processPetriNet(any(PetriNetDTO.class)))
            .thenReturn(samplePetriNet);

        // When & Then: POST request should return processed Petri net
        mockMvc.perform(post("/api/process/page/test-page/process")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(samplePetriNet)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.places").exists())
            .andExpect(jsonPath("$.transitions").exists())
            .andExpect(jsonPath("$.arcs").exists())
            .andExpect(jsonPath("$.places[0].id").value("p1"))
            .andExpect(jsonPath("$.places[0].tokens").value(2));
    }

    @Test
    void processPetriNet_ServiceThrowsException_ReturnsBadRequest() throws Exception {
        // Given: Service throws exception
        when(petriNetService.processPetriNet(any(PetriNetDTO.class)))
            .thenThrow(new RuntimeException("Processing failed"));

        // When & Then: Should return 400 with error message
        mockMvc.perform(post("/api/process/page/test-page/process")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(samplePetriNet)))
            .andExpect(status().isBadRequest())
            .andExpect(content().string("Error processing Petri net for page test-page: Processing failed"));
    }

    @Test
    void processPetriNet_EmptyNet_ReturnsEmptyResult() throws Exception {
        // Given: Empty Petri net
        PetriNetDTO emptyNet = new PetriNetDTO(
            Arrays.asList(),
            Arrays.asList(),
            Arrays.asList()
        );
        when(petriNetService.processPetriNet(any(PetriNetDTO.class)))
            .thenReturn(emptyNet);

        // When & Then: Should handle empty net gracefully
        mockMvc.perform(post("/api/process/page/test-page/process")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(emptyNet)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.places").isArray())
            .andExpect(jsonPath("$.transitions").isArray())
            .andExpect(jsonPath("$.arcs").isArray());
    }

    @Test
    void processPetriNet_InvalidJson_ReturnsBadRequest() throws Exception {
        // When & Then: Invalid JSON should return 400
        mockMvc.perform(post("/api/process/page/test-page/process")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{ invalid json }"))
            .andExpect(status().isBadRequest());
    }

    @Test
    void processPetriNet_EmptyBody_ReturnsBadRequest() throws Exception {
        // When & Then: Empty body should return 400
        mockMvc.perform(post("/api/process/page/test-page/process")
                .contentType(MediaType.APPLICATION_JSON)
                .content(""))
            .andExpect(status().isBadRequest());
    }

    @Test
    void processPetriNet_WrongContentType_ReturnsUnsupportedMediaType() throws Exception {
        // When & Then: Wrong content type should return 415
        mockMvc.perform(post("/api/process/page/test-page/process")
                .contentType(MediaType.TEXT_PLAIN)
                .content("some text"))
            .andExpect(status().isUnsupportedMediaType());
    }

    @Test
    void processPetriNet_GetMethod_ReturnsMethodNotAllowed() throws Exception {
        // When & Then: GET method should return 405
        mockMvc.perform(get("/api/process/page/test-page/process"))
            .andExpect(status().isMethodNotAllowed());
    }

    // ==================== CONFLICT RESOLUTION TESTS ====================

    @Test
    void resolveConflict_ValidRequest_ReturnsResolvedResult() throws Exception {
        // Given: Petri net with selected transition
        PetriNetDTO conflictNet = new PetriNetDTO(
            samplePetriNet.getPlaces(),
            samplePetriNet.getTransitions(),
            samplePetriNet.getArcs()
        );
        conflictNet.setSelectedTransitionId("t1");
        
        when(petriNetService.resolveConflict(any(PetriNetDTO.class), anyString()))
            .thenReturn(samplePetriNet);

        // When & Then: Should resolve conflict successfully
        mockMvc.perform(post("/api/process/resolve/page/test-page/resolve")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(conflictNet)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.places").exists())
            .andExpect(jsonPath("$.transitions").exists());
    }

    @Test
    void resolveConflict_NoSelectedTransition_ReturnsBadRequest() throws Exception {
        // Given: Petri net without selected transition
        PetriNetDTO conflictNet = new PetriNetDTO(
            samplePetriNet.getPlaces(),
            samplePetriNet.getTransitions(),
            samplePetriNet.getArcs()
        );
        conflictNet.setSelectedTransitionId(null);

        // When & Then: Should return 400 for missing transition
        mockMvc.perform(post("/api/process/resolve/page/test-page/resolve")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(conflictNet)))
            .andExpect(status().isBadRequest())
            .andExpect(content().string("No transition selected for conflict resolution on page test-page"));
    }

    @Test
    void resolveConflict_EmptySelectedTransition_ReturnsBadRequest() throws Exception {
        // Given: Petri net with empty selected transition
        PetriNetDTO conflictNet = new PetriNetDTO(
            samplePetriNet.getPlaces(),
            samplePetriNet.getTransitions(),
            samplePetriNet.getArcs()
        );
        conflictNet.setSelectedTransitionId("");

        // When & Then: Should return 400 for empty transition
        mockMvc.perform(post("/api/process/resolve/page/test-page/resolve")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(conflictNet)))
            .andExpect(status().isBadRequest())
            .andExpect(content().string("No transition selected for conflict resolution on page test-page"));
    }

    @Test
    void resolveConflict_ServiceThrowsException_ReturnsBadRequest() throws Exception {
        // Given: Petri net with selected transition
        PetriNetDTO conflictNet = new PetriNetDTO(
            samplePetriNet.getPlaces(),
            samplePetriNet.getTransitions(),
            samplePetriNet.getArcs()
        );
        conflictNet.setSelectedTransitionId("t1");
        
        when(petriNetService.resolveConflict(any(PetriNetDTO.class), anyString()))
            .thenThrow(new RuntimeException("Conflict resolution failed"));

        // When & Then: Should return 400 with error message
        mockMvc.perform(post("/api/process/resolve/page/test-page/resolve")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(conflictNet)))
            .andExpect(status().isBadRequest())
            .andExpect(content().string("Error resolving conflict for page test-page: Conflict resolution failed"));
    }

    @Test
    void resolveConflict_InvalidJson_ReturnsBadRequest() throws Exception {
        // When & Then: Invalid JSON should return 400
        mockMvc.perform(post("/api/process/resolve/page/test-page/resolve")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{ invalid json }"))
            .andExpect(status().isBadRequest());
    }

    @Test
    void resolveConflict_GetMethod_ReturnsMethodNotAllowed() throws Exception {
        // When & Then: GET method should return 405
        mockMvc.perform(get("/api/process/resolve/page/test-page/resolve"))
            .andExpect(status().isMethodNotAllowed());
    }

    // ==================== VALIDATION CONTROLLER TESTS ====================

    @Test
    void validatePetriNet_ValidNet_ReturnsValidationSuccess() throws Exception {
        // Given: Mock service returns validation success
        when(validatorService.validatePetriNet(any(PetriNetValidationDTO.class)))
            .thenReturn(sampleValidationResult);

        // When & Then: POST request should return validation result
        mockMvc.perform(post("/api/page/test-page/validate")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(sampleValidationRequest)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.valid").value(true))
            .andExpect(jsonPath("$.message").value("Petri net is valid"));
    }

    @Test
    void validatePetriNet_InvalidNet_ReturnsValidationFailure() throws Exception {
        // Given: Mock service returns validation failure
        ValidationResultDTO failureResult = new ValidationResultDTO();
        failureResult.setValid(false);
        failureResult.setMessage("Petri net is invalid");
        
        when(validatorService.validatePetriNet(any(PetriNetValidationDTO.class)))
            .thenReturn(failureResult);

        // When & Then: Should return validation failure
        mockMvc.perform(post("/api/page/test-page/validate")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(sampleValidationRequest)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.valid").value(false))
            .andExpect(jsonPath("$.message").value("Petri net is invalid"));
    }

    @Test
    void validatePetriNet_ServiceException_ReturnsBadRequest() throws Exception {
        // Given: Service throws exception
        when(validatorService.validatePetriNet(any(PetriNetValidationDTO.class)))
            .thenThrow(new RuntimeException("Validation error"));

        // When & Then: Should return 400 with plain text error message
        mockMvc.perform(post("/api/page/test-page/validate")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(sampleValidationRequest)))
            .andExpect(status().isBadRequest())
            .andExpect(content().string("Error validating Petri net for page test-page: Validation error"));
    }

    @Test
    void validatePetriNet_InvalidJson_ReturnsBadRequest() throws Exception {
        // When & Then: Invalid JSON should return 400
        mockMvc.perform(post("/api/page/test-page/validate")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{ invalid json }"))
            .andExpect(status().isBadRequest());
    }

    @Test
    void validatePetriNet_EmptyBody_ReturnsBadRequest() throws Exception {
        // When & Then: Empty body should return 400
        mockMvc.perform(post("/api/page/test-page/validate")
                .contentType(MediaType.APPLICATION_JSON)
                .content(""))
            .andExpect(status().isBadRequest());
    }

    @Test
    void validatePetriNet_WrongContentType_ReturnsUnsupportedMediaType() throws Exception {
        // When & Then: Wrong content type should return 415
        mockMvc.perform(post("/api/page/test-page/validate")
                .contentType(MediaType.TEXT_PLAIN)
                .content("some text"))
            .andExpect(status().isUnsupportedMediaType());
    }

    @Test
    void validatePetriNet_GetMethod_ReturnsMethodNotAllowed() throws Exception {
        // When & Then: GET method should return 405
        mockMvc.perform(get("/api/page/test-page/validate"))
            .andExpect(status().isMethodNotAllowed());
    }

    // ==================== ANALYSIS CONTROLLER TESTS ====================

    @Test
    void analyzeReachableStates_ValidNet_ReturnsAnalysisResult() throws Exception {
        // Given: Mock service returns analysis result
        when(analysisService.analyzeReachableStates(any(PetriNetDTO.class)))
            .thenReturn(sampleAnalysisResult);

        // When & Then: Should return analysis result
        mockMvc.perform(post("/api/analysis/reachable-states")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(samplePetriNet)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.analysisType").value("Reachable States"))
            .andExpect(jsonPath("$.reachableStatesCount").value(5));
    }

    @Test
    void analyzeReachableStates_ServiceException_ReturnsBadRequest() throws Exception {
        // Given: Service throws exception
        when(analysisService.analyzeReachableStates(any(PetriNetDTO.class)))
            .thenThrow(new RuntimeException("Analysis failed"));

        // When & Then: Should return 400 with error result
        mockMvc.perform(post("/api/analysis/reachable-states")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(samplePetriNet)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.analysisType").value("Reachable States"))
            .andExpect(jsonPath("$.details").value("Error: Analysis failed"));
    }

    @Test
    void analyzeLiveness_ValidNet_ReturnsLivenessAnalysis() throws Exception {
        // Given: Mock service returns liveness analysis
        AnalysisResultDTO livenessResult = new AnalysisResultDTO();
        livenessResult.setAnalysisType("Liveness Analysis");
        livenessResult.setHasDeadlock(false);
        livenessResult.setEnabledTransitionsCount(2);
        
        when(analysisService.analyzeLiveness(any(PetriNetDTO.class)))
            .thenReturn(livenessResult);

        // When & Then: Should return liveness analysis
        mockMvc.perform(post("/api/analysis/liveness")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(samplePetriNet)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.analysisType").value("Liveness Analysis"))
            .andExpect(jsonPath("$.hasDeadlock").value(false))
            .andExpect(jsonPath("$.enabledTransitionsCount").value(2));
    }

    @Test
    void analyzeLiveness_ServiceException_ReturnsBadRequest() throws Exception {
        // Given: Service throws exception
        when(analysisService.analyzeLiveness(any(PetriNetDTO.class)))
            .thenThrow(new RuntimeException("Liveness analysis failed"));

        // When & Then: Should return 400 with error result
        mockMvc.perform(post("/api/analysis/liveness")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(samplePetriNet)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.analysisType").value("Liveness"))
            .andExpect(jsonPath("$.details").value("Error: Liveness analysis failed"));
    }

    @Test
    void analyzeBoundedness_ValidNet_ReturnsBoundednessAnalysis() throws Exception {
        // Given: Mock service returns boundedness analysis
        AnalysisResultDTO boundednessResult = new AnalysisResultDTO();
        boundednessResult.setAnalysisType("Boundedness Analysis");
        boundednessResult.setBoundedPlacesCount(3);
        boundednessResult.setUnboundedPlacesCount(1);
        
        when(analysisService.analyzeBoundedness(any(PetriNetDTO.class)))
            .thenReturn(boundednessResult);

        // When & Then: Should return boundedness analysis
        mockMvc.perform(post("/api/analysis/boundedness")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(samplePetriNet)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.analysisType").value("Boundedness Analysis"))
            .andExpect(jsonPath("$.boundedPlacesCount").value(3))
            .andExpect(jsonPath("$.unboundedPlacesCount").value(1));
    }

    @Test
    void analyzeBoundedness_ServiceException_ReturnsBadRequest() throws Exception {
        // Given: Service throws exception
        when(analysisService.analyzeBoundedness(any(PetriNetDTO.class)))
            .thenThrow(new RuntimeException("Boundedness analysis failed"));

        // When & Then: Should return 400 with error result
        mockMvc.perform(post("/api/analysis/boundedness")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(samplePetriNet)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.analysisType").value("Boundedness"))
            .andExpect(jsonPath("$.details").value("Error: Boundedness analysis failed"));
    }

    @Test
    void computeIncidenceMatrix_ValidNet_ReturnsIncidenceMatrix() throws Exception {
        // Given: Mock service returns incidence matrix
        AnalysisResultDTO matrixResult = new AnalysisResultDTO();
        matrixResult.setAnalysisType("Incidence Matrix");
        matrixResult.setIncidenceMatrix(new int[][]{{1,0},{0,1}});
        
        when(analysisService.computeIncidenceMatrix(any(PetriNetDTO.class)))
            .thenReturn(matrixResult);

        // When & Then: Should return incidence matrix
        mockMvc.perform(post("/api/analysis/incidence-matrix")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(samplePetriNet)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.analysisType").value("Incidence Matrix"))
            .andExpect(jsonPath("$.incidenceMatrix").exists());
    }

    @Test
    void computeIncidenceMatrix_ServiceException_ReturnsBadRequest() throws Exception {
        // Given: Service throws exception
        when(analysisService.computeIncidenceMatrix(any(PetriNetDTO.class)))
            .thenThrow(new RuntimeException("Matrix computation failed"));

        // When & Then: Should return 400 with error result
        mockMvc.perform(post("/api/analysis/incidence-matrix")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(samplePetriNet)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.analysisType").value("Incidence Matrix"))
            .andExpect(jsonPath("$.details").value("Error: Matrix computation failed"));
    }

    @Test
    void performStructuralAnalysis_ValidNet_ReturnsStructuralAnalysis() throws Exception {
        // Given: Mock service returns structural analysis
        AnalysisResultDTO structuralResult = new AnalysisResultDTO();
        structuralResult.setAnalysisType("Structural Analysis");
        structuralResult.setRegularArcsCount(5);
        structuralResult.setInhibitorArcsCount(2);
        structuralResult.setBidirectionalArcsCount(1);
        
        when(analysisService.performStructuralAnalysis(any(PetriNetDTO.class)))
            .thenReturn(structuralResult);

        // When & Then: Should return structural analysis
        mockMvc.perform(post("/api/analysis/structural")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(samplePetriNet)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.analysisType").value("Structural Analysis"))
            .andExpect(jsonPath("$.regularArcsCount").value(5))
            .andExpect(jsonPath("$.inhibitorArcsCount").value(2))
            .andExpect(jsonPath("$.bidirectionalArcsCount").value(1));
    }

    @Test
    void performStructuralAnalysis_ServiceException_ReturnsBadRequest() throws Exception {
        // Given: Service throws exception
        when(analysisService.performStructuralAnalysis(any(PetriNetDTO.class)))
            .thenThrow(new RuntimeException("Structural analysis failed"));

        // When & Then: Should return 400 with error result
        mockMvc.perform(post("/api/analysis/structural")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(samplePetriNet)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.analysisType").value("Structural Analysis"))
            .andExpect(jsonPath("$.details").value("Error: Structural analysis failed"));
    }

    // ==================== ANALYSIS ENDPOINT ERROR TESTS ====================

    @Test
    void analysisEndpoints_ServiceException_ReturnsBadRequest() throws Exception {
        // Given: All analysis services throw exceptions
        when(analysisService.analyzeReachableStates(any(PetriNetDTO.class)))
            .thenThrow(new RuntimeException("Reachable states failed"));
        when(analysisService.analyzeLiveness(any(PetriNetDTO.class)))
            .thenThrow(new RuntimeException("Liveness failed"));
        when(analysisService.analyzeBoundedness(any(PetriNetDTO.class)))
            .thenThrow(new RuntimeException("Boundedness failed"));
        when(analysisService.computeIncidenceMatrix(any(PetriNetDTO.class)))
            .thenThrow(new RuntimeException("Matrix failed"));
        when(analysisService.performStructuralAnalysis(any(PetriNetDTO.class)))
            .thenThrow(new RuntimeException("Structural failed"));

        // When & Then: All endpoints should return 400 with appropriate error messages
        mockMvc.perform(post("/api/analysis/reachable-states")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(samplePetriNet)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.details").value("Error: Reachable states failed"));

        mockMvc.perform(post("/api/analysis/liveness")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(samplePetriNet)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.details").value("Error: Liveness failed"));

        mockMvc.perform(post("/api/analysis/boundedness")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(samplePetriNet)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.details").value("Error: Boundedness failed"));

        mockMvc.perform(post("/api/analysis/incidence-matrix")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(samplePetriNet)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.details").value("Error: Matrix failed"));

        mockMvc.perform(post("/api/analysis/structural")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(samplePetriNet)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.details").value("Error: Structural failed"));
    }

    @Test
    void analysisEndpoints_EmptyBody_ReturnsBadRequest() throws Exception {
        // When & Then: Empty body should return 400 for all analysis endpoints
        mockMvc.perform(post("/api/analysis/reachable-states")
                .contentType(MediaType.APPLICATION_JSON)
                .content(""))
            .andExpect(status().isBadRequest());

        mockMvc.perform(post("/api/analysis/liveness")
                .contentType(MediaType.APPLICATION_JSON)
                .content(""))
            .andExpect(status().isBadRequest());

        mockMvc.perform(post("/api/analysis/boundedness")
                .contentType(MediaType.APPLICATION_JSON)
                .content(""))
            .andExpect(status().isBadRequest());

        mockMvc.perform(post("/api/analysis/incidence-matrix")
                .contentType(MediaType.APPLICATION_JSON)
                .content(""))
            .andExpect(status().isBadRequest());

        mockMvc.perform(post("/api/analysis/structural")
                .contentType(MediaType.APPLICATION_JSON)
                .content(""))
            .andExpect(status().isBadRequest());
    }

    @Test
    void analysisEndpoints_WrongContentType_ReturnsUnsupportedMediaType() throws Exception {
        // When & Then: Wrong content type should return 415 for all analysis endpoints
        mockMvc.perform(post("/api/analysis/reachable-states")
                .contentType(MediaType.TEXT_PLAIN)
                .content("some text"))
            .andExpect(status().isUnsupportedMediaType());

        mockMvc.perform(post("/api/analysis/liveness")
                .contentType(MediaType.TEXT_PLAIN)
                .content("some text"))
            .andExpect(status().isUnsupportedMediaType());

        mockMvc.perform(post("/api/analysis/boundedness")
                .contentType(MediaType.TEXT_PLAIN)
                .content("some text"))
            .andExpect(status().isUnsupportedMediaType());

        mockMvc.perform(post("/api/analysis/incidence-matrix")
                .contentType(MediaType.TEXT_PLAIN)
                .content("some text"))
            .andExpect(status().isUnsupportedMediaType());

        mockMvc.perform(post("/api/analysis/structural")
                .contentType(MediaType.TEXT_PLAIN)
                .content("some text"))
            .andExpect(status().isUnsupportedMediaType());
    }

    @Test
    void analysisEndpoints_GetMethod_ReturnsMethodNotAllowed() throws Exception {
        // When & Then: GET method should return 405 for all analysis endpoints
        mockMvc.perform(get("/api/analysis/reachable-states"))
            .andExpect(status().isMethodNotAllowed());

        mockMvc.perform(get("/api/analysis/liveness"))
            .andExpect(status().isMethodNotAllowed());

        mockMvc.perform(get("/api/analysis/boundedness"))
            .andExpect(status().isMethodNotAllowed());

        mockMvc.perform(get("/api/analysis/incidence-matrix"))
            .andExpect(status().isMethodNotAllowed());

        mockMvc.perform(get("/api/analysis/structural"))
            .andExpect(status().isMethodNotAllowed());
    }

    // ==================== EDGE CASE TESTS ====================

    @Test
    void allEndpoints_InvalidJson_ReturnsBadRequest() throws Exception {
        // When & Then: Invalid JSON should return 400 for all endpoints
        mockMvc.perform(post("/api/process/page/test-page/process")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{ invalid json }"))
            .andExpect(status().isBadRequest());

        mockMvc.perform(post("/api/page/test-page/validate")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{ invalid json }"))
            .andExpect(status().isBadRequest());

        mockMvc.perform(post("/api/analysis/reachable-states")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{ invalid json }"))
            .andExpect(status().isBadRequest());
    }

    @Test
    void allEndpoints_EmptyBody_ReturnsBadRequest() throws Exception {
        // When & Then: Empty body should return 400 for all endpoints
        mockMvc.perform(post("/api/process/page/test-page/process")
                .contentType(MediaType.APPLICATION_JSON)
                .content(""))
            .andExpect(status().isBadRequest());

        mockMvc.perform(post("/api/page/test-page/validate")
                .contentType(MediaType.APPLICATION_JSON)
                .content(""))
            .andExpect(status().isBadRequest());

        mockMvc.perform(post("/api/analysis/reachable-states")
                .contentType(MediaType.APPLICATION_JSON)
                .content(""))
            .andExpect(status().isBadRequest());
    }

    @Test
    void allEndpoints_WrongContentType_ReturnsUnsupportedMediaType() throws Exception {
        // When & Then: Wrong content type should return 415 for all endpoints
        mockMvc.perform(post("/api/process/page/test-page/process")
                .contentType(MediaType.TEXT_PLAIN)
                .content("some text"))
            .andExpect(status().isUnsupportedMediaType());

        mockMvc.perform(post("/api/page/test-page/validate")
                .contentType(MediaType.TEXT_PLAIN)
                .content("some text"))
            .andExpect(status().isUnsupportedMediaType());

        mockMvc.perform(post("/api/analysis/reachable-states")
                .contentType(MediaType.TEXT_PLAIN)
                .content("some text"))
            .andExpect(status().isUnsupportedMediaType());
    }

    @Test
    void allEndpoints_GetMethod_ReturnsMethodNotAllowed() throws Exception {
        // When & Then: GET method should return 405 for all endpoints
        mockMvc.perform(get("/api/process/page/test-page/process"))
            .andExpect(status().isMethodNotAllowed());

        mockMvc.perform(get("/api/page/test-page/validate"))
            .andExpect(status().isMethodNotAllowed());

        mockMvc.perform(get("/api/analysis/reachable-states"))
            .andExpect(status().isMethodNotAllowed());
    }

    @Test
    void allEndpoints_PutMethod_ReturnsMethodNotAllowed() throws Exception {
        // When & Then: PUT method should return 405 for all endpoints
        mockMvc.perform(put("/api/process/page/test-page/process")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isMethodNotAllowed());

        mockMvc.perform(put("/api/page/test-page/validate")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isMethodNotAllowed());

        mockMvc.perform(put("/api/analysis/reachable-states")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isMethodNotAllowed());
    }

    @Test
    void allEndpoints_DeleteMethod_ReturnsMethodNotAllowed() throws Exception {
        // When & Then: DELETE method should return 405 for all endpoints
        mockMvc.perform(delete("/api/process/page/test-page/process"))
            .andExpect(status().isMethodNotAllowed());

        mockMvc.perform(delete("/api/page/test-page/validate"))
            .andExpect(status().isMethodNotAllowed());

        mockMvc.perform(delete("/api/analysis/reachable-states"))
            .andExpect(status().isMethodNotAllowed());
    }

    @Test
    void allEndpoints_PatchMethod_ReturnsMethodNotAllowed() throws Exception {
        // When & Then: PATCH method should return 405 for all endpoints
        mockMvc.perform(patch("/api/process/page/test-page/process")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isMethodNotAllowed());

        mockMvc.perform(patch("/api/page/test-page/validate")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isMethodNotAllowed());

        mockMvc.perform(patch("/api/analysis/reachable-states")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isMethodNotAllowed());
    }
}
