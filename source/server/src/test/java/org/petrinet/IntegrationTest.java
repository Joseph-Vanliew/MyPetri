package org.petrinet;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureWebMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import org.petrinet.client.*;

import java.util.Arrays;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Integration tests for the full Petri net application stack.
 * These tests verify the complete request-response cycle including:
 * - Controllers
 * - Services
 * - Domain models
 * - Data validation
 * - Error handling
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureWebMvc
@TestPropertySource(properties = {
    "spring.datasource.url=jdbc:h2:mem:testdb",
    "spring.datasource.driverClassName=org.h2.Driver",
    "spring.datasource.username=sa",
    "spring.datasource.password=",
    "spring.jpa.database-platform=org.hibernate.dialect.H2Dialect",
    "spring.jpa.hibernate.ddl-auto=create-drop"
})
class IntegrationTest {

    @Autowired
    private WebApplicationContext webApplicationContext;

    @Autowired
    private ObjectMapper objectMapper;

    private MockMvc mockMvc;

    private PetriNetDTO samplePetriNet;
    private PetriNetValidationDTO sampleValidationRequest;

    @BeforeEach
    void setUp() {
        // Given: Setup MockMvc with full application context
        mockMvc = MockMvcBuilders.webAppContextSetup(webApplicationContext).build();

        // Given: Sample Petri net data for testing
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

    // ==================== PETRI NET PROCESSING INTEGRATION TESTS ====================

    @Test
    void processPetriNet_ValidNet_ProcessesSuccessfully() throws Exception {
        // Given: A valid Petri net with tokens in place1
        
        // When & Then: Processing should move tokens from p1 to p2
        mockMvc.perform(post("/api/process/page/test-page/process")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(samplePetriNet)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.places").exists())
            .andExpect(jsonPath("$.places[?(@.id=='p1')].tokens").value(1)) // Should have 1 token left
            .andExpect(jsonPath("$.places[?(@.id=='p2')].tokens").value(1)) // Should have 1 token gained
            .andExpect(jsonPath("$.transitions[0].enabled").value(true)); // Transition should still be enabled (1 token left)
    }

    @Test
    void processPetriNet_EmptyNet_ReturnsEmptyResult() throws Exception {
        // Given: Empty Petri net
        PetriNetDTO emptyNet = new PetriNetDTO(
            Arrays.asList(),
            Arrays.asList(),
            Arrays.asList()
        );

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
    void processPetriNet_NoEnabledTransitions_ReturnsSameState() throws Exception {
        // Given: Petri net with no enabled transitions (place1 has 0 tokens)
        PlaceDTO place1 = new PlaceDTO("p1", 0, false, null);
        PlaceDTO place2 = new PlaceDTO("p2", 0, false, null);
        
        TransitionDTO transition = new TransitionDTO("t1", false, Arrays.asList("arc1", "arc2"));
        
        ArcDTO arc1 = new ArcDTO("arc1", "REGULAR", "p1", "t1");
        ArcDTO arc2 = new ArcDTO("arc2", "REGULAR", "t1", "p2");
        
        PetriNetDTO noTokensNet = new PetriNetDTO(
            Arrays.asList(place1, place2),
            Arrays.asList(transition),
            Arrays.asList(arc1, arc2)
        );

        // When & Then: Should return same state when no transitions can fire
        mockMvc.perform(post("/api/process/page/test-page/process")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(noTokensNet)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.places[?(@.id=='p1')].tokens").value(0))
            .andExpect(jsonPath("$.places[?(@.id=='p2')].tokens").value(0));
    }

    // ==================== VALIDATION INTEGRATION TESTS ====================

    @Test
    void validatePetriNet_ValidConfiguration_ReturnsSuccess() throws Exception {
        // Given: Valid validation request with input and expected output

        // When & Then: Should validate successfully
        mockMvc.perform(post("/api/page/test-page/validate")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(sampleValidationRequest)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.valid").exists())
            .andExpect(jsonPath("$.message").exists());
    }

    @Test
    void validatePetriNet_NoInputTokens_ReturnsValidationFailure() throws Exception {
        // Given: Validation request with no input tokens
        PetriNetValidationDTO noInputRequest = new PetriNetValidationDTO();
        noInputRequest.setPlaces(samplePetriNet.getPlaces());
        noInputRequest.setTransitions(samplePetriNet.getTransitions());
        noInputRequest.setArcs(samplePetriNet.getArcs());
        noInputRequest.setInputConfigs(Arrays.asList()); // Empty list instead of PlaceConfig
        noInputRequest.setExpectedOutputs(Arrays.asList(
            new PlaceDTO("p2", 1)
        ));

        // When & Then: Should fail validation due to no input tokens
        mockMvc.perform(post("/api/page/test-page/validate")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(noInputRequest)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.valid").value(false))
            .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("No initial tokens provided")));
    }

    // ==================== ANALYSIS INTEGRATION TESTS ====================

    @Test
    void analyzeReachableStates_ValidNet_ReturnsAnalysis() throws Exception {
        // Given: Valid Petri net for analysis

        // When & Then: Should return reachable states analysis
        mockMvc.perform(post("/api/analysis/reachable-states")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(samplePetriNet)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.analysisType").value("Reachable States"))
            .andExpect(jsonPath("$.reachableStatesCount").exists())
            .andExpect(jsonPath("$.details").exists());
    }

    @Test
    void analyzeLiveness_ValidNet_ReturnsLivenessAnalysis() throws Exception {
        // Given: Valid Petri net for liveness analysis

        // When & Then: Should return liveness analysis
        mockMvc.perform(post("/api/analysis/liveness")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(samplePetriNet)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.analysisType").value("Liveness Analysis"))
            .andExpect(jsonPath("$.hasDeadlock").exists())
            .andExpect(jsonPath("$.enabledTransitionsCount").exists());
    }

    @Test
    void analyzeBoundedness_ValidNet_ReturnsBoundednessAnalysis() throws Exception {
        // Given: Valid Petri net for boundedness analysis

        // When & Then: Should return boundedness analysis
        mockMvc.perform(post("/api/analysis/boundedness")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(samplePetriNet)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.analysisType").value("Boundedness Analysis"))
            .andExpect(jsonPath("$.boundedPlacesCount").exists())
            .andExpect(jsonPath("$.unboundedPlacesCount").exists());
    }

    @Test
    void computeIncidenceMatrix_ValidNet_ReturnsMatrix() throws Exception {
        // Given: Valid Petri net for incidence matrix

        // When & Then: Should return incidence matrix
        mockMvc.perform(post("/api/analysis/incidence-matrix")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(samplePetriNet)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.analysisType").value("Incidence Matrix"))
            .andExpect(jsonPath("$.incidenceMatrix").exists())
            .andExpect(jsonPath("$.details").exists());
    }

    @Test
    void performStructuralAnalysis_ValidNet_ReturnsStructuralAnalysis() throws Exception {
        // Given: Valid Petri net for structural analysis

        // When & Then: Should return structural analysis
        mockMvc.perform(post("/api/analysis/structural")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(samplePetriNet)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.analysisType").value("Structural Analysis"))
            .andExpect(jsonPath("$.regularArcsCount").exists())
            .andExpect(jsonPath("$.inhibitorArcsCount").exists())
            .andExpect(jsonPath("$.bidirectionalArcsCount").exists());
    }

    // ==================== ERROR HANDLING INTEGRATION TESTS ====================

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
        // When & Then: Wrong content type should return 415
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
        // When & Then: GET method should return 405 for POST-only endpoints
        mockMvc.perform(get("/api/process/page/test-page/process"))
            .andExpect(status().isMethodNotAllowed());

        mockMvc.perform(get("/api/page/test-page/validate"))
            .andExpect(status().isMethodNotAllowed());

        mockMvc.perform(get("/api/analysis/reachable-states"))
            .andExpect(status().isMethodNotAllowed());
    }

    // ==================== COMPLEX SCENARIO INTEGRATION TESTS ====================

    @Test
    void complexPetriNet_WithMultipleTransitions_ProcessesCorrectly() throws Exception {
        // Given: Complex Petri net with multiple places and transitions in non-deterministic mode
        PlaceDTO place1 = new PlaceDTO("p1", 3, false, null);
        PlaceDTO place2 = new PlaceDTO("p2", 0, false, null);
        PlaceDTO place3 = new PlaceDTO("p3", 0, false, null);
        
        TransitionDTO transition1 = new TransitionDTO("t1", false, Arrays.asList("arc1", "arc2"));
        TransitionDTO transition2 = new TransitionDTO("t2", false, Arrays.asList("arc3", "arc4"));
        
        ArcDTO arc1 = new ArcDTO("arc1", "REGULAR", "p1", "t1");
        ArcDTO arc2 = new ArcDTO("arc2", "REGULAR", "t1", "p2");
        ArcDTO arc3 = new ArcDTO("arc3", "REGULAR", "p1", "t2");
        ArcDTO arc4 = new ArcDTO("arc4", "REGULAR", "t2", "p3");
        
        PetriNetDTO complexNet = new PetriNetDTO(
            Arrays.asList(place1, place2, place3),
            Arrays.asList(transition1, transition2),
            Arrays.asList(arc1, arc2, arc3, arc4)
        );

        // When & Then: Should process complex net correctly (only one transition fires per step)
        mockMvc.perform(post("/api/process/page/test-page/process")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(complexNet)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.places[?(@.id=='p1')].tokens").value(2)); // Should have 2 tokens left (3-1=2)
    }

    @Test
    void complexPetriNet_DeterministicMode_ShowsConflict() throws Exception {
        // Given: Complex Petri net with multiple places and transitions in deterministic mode
        PlaceDTO place1 = new PlaceDTO("p1", 3, false, null);
        PlaceDTO place2 = new PlaceDTO("p2", 0, false, null);
        PlaceDTO place3 = new PlaceDTO("p3", 0, false, null);
        
        TransitionDTO transition1 = new TransitionDTO("t1", false, Arrays.asList("arc1", "arc2"));
        TransitionDTO transition2 = new TransitionDTO("t2", false, Arrays.asList("arc3", "arc4"));
        
        ArcDTO arc1 = new ArcDTO("arc1", "REGULAR", "p1", "t1");
        ArcDTO arc2 = new ArcDTO("arc2", "REGULAR", "t1", "p2");
        ArcDTO arc3 = new ArcDTO("arc3", "REGULAR", "p1", "t2");
        ArcDTO arc4 = new ArcDTO("arc4", "REGULAR", "t2", "p3");
        
        PetriNetDTO complexNet = new PetriNetDTO(
            Arrays.asList(place1, place2, place3),
            Arrays.asList(transition1, transition2),
            Arrays.asList(arc1, arc2, arc3, arc4)
        );
        complexNet.setDeterministicMode(true);

        // When & Then: Should show conflict in deterministic mode (both transitions enabled)
        mockMvc.perform(post("/api/process/page/test-page/process")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(complexNet)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.places[?(@.id=='p1')].tokens").value(3)) // No tokens consumed (conflict)
            .andExpect(jsonPath("$.places[?(@.id=='p2')].tokens").value(0)) // No tokens produced (conflict)
            .andExpect(jsonPath("$.places[?(@.id=='p3')].tokens").value(0)) // No tokens produced (conflict)
            .andExpect(jsonPath("$.transitions[?(@.id=='t1')].enabled").value(true)) // Both transitions enabled
            .andExpect(jsonPath("$.transitions[?(@.id=='t2')].enabled").value(true)); // Both transitions enabled
    }

    @Test
    void boundedPlace_WithCapacity_RespectsLimits() throws Exception {
        // Given: Petri net with bounded place
        PlaceDTO boundedPlace = new PlaceDTO("p1", 0, true, 2); // Capacity of 2, starts with 0
        PlaceDTO place2 = new PlaceDTO("p2", 3, false, null);
        
        TransitionDTO transition = new TransitionDTO("t1", false, Arrays.asList("arc1", "arc2"));
        
        ArcDTO arc1 = new ArcDTO("arc1", "REGULAR", "p2", "t1"); // p2 -> t1 (consumption)
        ArcDTO arc2 = new ArcDTO("arc2", "REGULAR", "t1", "p1"); // t1 -> p1 (production)
        
        PetriNetDTO boundedNet = new PetriNetDTO(
            Arrays.asList(boundedPlace, place2),
            Arrays.asList(transition),
            Arrays.asList(arc1, arc2)
        );

        // When & Then: Should respect bounded place capacity
        mockMvc.perform(post("/api/process/page/test-page/process")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(boundedNet)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.places[?(@.id=='p1')].tokens").value(1)) // Should have 1 token (transition adds 1)
            .andExpect(jsonPath("$.places[?(@.id=='p2')].tokens").value(2)); // Should have 2 tokens left (3-1=2)
    }
} 