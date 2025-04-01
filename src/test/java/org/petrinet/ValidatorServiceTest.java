package org.petrinet;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.petrinet.client.*;
import org.petrinet.service.PetriNetService;
import org.petrinet.service.PetriNetValidatorService;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Unit tests for the {@link PetriNetValidatorService}.
 */
@ExtendWith(MockitoExtension.class)
public class ValidatorServiceTest {

    @Mock
    private PetriNetService mockPetriNetService;

    @InjectMocks
    private PetriNetValidatorService validatorService;

    private PetriNetValidationDTO baseValidationRequest;

    @BeforeEach
    void setUp() {
        // Basic setup usable by multiple tests, can be overridden
        List<PlaceDTO> places = List.of(new PlaceDTO("p1", 0), new PlaceDTO("p2", 0));
        List<TransitionDTO> transitions = List.of(new TransitionDTO("t1", false, new ArrayList<>()));
        List<ArcDTO> arcs = new ArrayList<>();
        
        baseValidationRequest = new PetriNetValidationDTO();
        baseValidationRequest.setPlaces(places);
        baseValidationRequest.setTransitions(transitions);
        baseValidationRequest.setArcs(arcs);
        baseValidationRequest.setInputConfigs(new ArrayList<>());
        baseValidationRequest.setExpectedOutputs(new ArrayList<>());
    }

    // Helper method to create a PlaceConfig
    private PetriNetValidationDTO.PlaceConfig placeConfig(String id, int tokens) {
        PetriNetValidationDTO.PlaceConfig config = new PetriNetValidationDTO.PlaceConfig();
        config.setPlaceId(id);
        config.setTokens(tokens);
        return config;
    }
    
    // Helper method to create a copy for mocking purposes
     private PetriNetDTO createDTOCopy(PetriNetDTO original) {
        List<PlaceDTO> placesCopy = original.getPlaces().stream()
            .map(p -> new PlaceDTO(p.getId(), p.getTokens()))
            .toList();
        List<TransitionDTO> transitionsCopy = original.getTransitions().stream()
            .map(t -> new TransitionDTO(t.getId(), t.getEnabled(), new ArrayList<>(t.getArcIds())))
            .toList();
         List<ArcDTO> arcsCopy = original.getArcs().stream()
            .map(a -> new ArcDTO(a.getId(), a.getType(), a.getIncomingId(), a.getOutgoingId()))
            .toList();
         
        PetriNetDTO copy = new PetriNetDTO(placesCopy, transitionsCopy, arcsCopy);
        copy.setDeterministicMode(original.getDeterministicMode()); // Preserve mode
        return copy;
    }


    @Test
    void validate_Success_NetReachesExpectedState() {
        // Given: Simple net p1 --t1--> p2, with initial token in p1, expecting 1 token in p2
        baseValidationRequest.setPlaces(List.of(new PlaceDTO("p1", 0), new PlaceDTO("p2", 0)));
        baseValidationRequest.setTransitions(List.of(new TransitionDTO("t1", false, List.of("a1", "a2"))));
        baseValidationRequest.setArcs(List.of(
            new ArcDTO("a1", "REGULAR", "p1", "t1"),
            new ArcDTO("a2", "REGULAR", "t1", "p2")
        ));
        baseValidationRequest.setInputConfigs(List.of(placeConfig("p1", 1))); 
        baseValidationRequest.setExpectedOutputs(List.of(placeConfig("p2", 1)));

        // Given: Mocked simulation steps
        // State after firing t1 (p1=0, p2=1), no transitions enabled (end state)
        PetriNetDTO finalStateMock = new PetriNetDTO(
            List.of(new PlaceDTO("p1", 0), new PlaceDTO("p2", 1)),
            List.of(new TransitionDTO("t1", false, List.of("a1", "a2"))), // t1 is now disabled
            List.of(new ArcDTO("a1", "REGULAR", "p1", "t1"), new ArcDTO("a2", "REGULAR", "t1", "p2"))
        );
        finalStateMock.setDeterministicMode(true);

        // Given: Mock behavior for PetriNetService
        when(mockPetriNetService.processPetriNet(any(PetriNetDTO.class)))
            .thenAnswer(invocation -> {
                 PetriNetDTO currentState = invocation.getArgument(0);
                 // If it's the initial state (p1 has token), return the final state
                 if (currentState.getPlaces().stream().anyMatch(p -> p.getId().equals("p1") && p.getTokens() == 1)) {
                     return createDTOCopy(finalStateMock);
                 } else { 
                     // Otherwise, it's the final state, return it again with no enabled transitions
                     PetriNetDTO endState = createDTOCopy(finalStateMock);
                     endState.getTransitions().forEach(t -> t.setEnabled(false));
                     return endState;
                 }
            });

        // When: The validation service is called
        ValidationResultDTO result = validatorService.validatePetriNet(baseValidationRequest);

        // Then: Validation should succeed and final state should match expected
        assertTrue(result.isValid(), "Validation should be successful.");
        assertTrue(result.getMessage().contains("successful"), "Message should indicate success.");
        assertNotNull(result.getFinalState(), "Final state should be recorded.");
        assertEquals(0, result.getFinalState().getPlaces().stream().filter(p -> p.getId().equals("p1")).findFirst().get().getTokens());
        assertEquals(1, result.getFinalState().getPlaces().stream().filter(p -> p.getId().equals("p2")).findFirst().get().getTokens());
        assertTrue(result.getOutputMatches().getOrDefault("p2", false), "Output match for p2 should be true.");
        verify(mockPetriNetService, atLeastOnce()).processPetriNet(any(PetriNetDTO.class));
    }

    @Test
    void validate_Failure_ConflictDetected() {
        // Given: A net where p1 enables both t1 and t2 with a single token
        baseValidationRequest.setPlaces(List.of(new PlaceDTO("p1", 0), new PlaceDTO("p_out1", 0), new PlaceDTO("p_out2", 0)));
        baseValidationRequest.setTransitions(List.of(
            new TransitionDTO("t1", false, List.of("a1_in", "a1_out")),
            new TransitionDTO("t2", false, List.of("a2_in", "a2_out"))
        ));
        baseValidationRequest.setArcs(List.of(
            new ArcDTO("a1_in", "REGULAR", "p1", "t1"), new ArcDTO("a1_out", "REGULAR", "t1", "p_out1"),
            new ArcDTO("a2_in", "REGULAR", "p1", "t2"), new ArcDTO("a2_out", "REGULAR", "t2", "p_out2")
        ));
        baseValidationRequest.setInputConfigs(List.of(placeConfig("p1", 1))); 
        baseValidationRequest.setExpectedOutputs(List.of()); 

        // Given: Mocked simulation state where conflict occurs (both t1 and t2 enabled)
        PetriNetDTO conflictState = new PetriNetDTO(
            List.of(new PlaceDTO("p1", 1), new PlaceDTO("p_out1", 0), new PlaceDTO("p_out2", 0)),
            List.of(
                new TransitionDTO("t1", true, List.of("a1_in", "a1_out")), 
                new TransitionDTO("t2", true, List.of("a2_in", "a2_out"))  
            ),
             List.of(
                 new ArcDTO("a1_in", "REGULAR", "p1", "t1"), new ArcDTO("a1_out", "REGULAR", "t1", "p_out1"),
                 new ArcDTO("a2_in", "REGULAR", "p1", "t2"), new ArcDTO("a2_out", "REGULAR", "t2", "p_out2")
             )
        );
        conflictState.setDeterministicMode(true); 

        // Given: Mock behavior returning the conflict state
        when(mockPetriNetService.processPetriNet(any(PetriNetDTO.class))).thenReturn(conflictState);

        // When: The validation service is called
        ValidationResultDTO result = validatorService.validatePetriNet(baseValidationRequest);

        // Then: Validation should fail, indicate conflict, and list conflicting transitions
        assertFalse(result.isValid(), "Validation should fail due to conflict.");
        assertTrue(result.getMessage().contains("conflict detected"), "Message should indicate conflict.");
        assertNotNull(result.getConflictingTransitions(), "Conflicting transitions list should not be null.");
        assertEquals(2, result.getConflictingTransitions().size(), "Should list 2 conflicting transitions.");
        assertTrue(result.getConflictingTransitions().contains("t1"));
        assertTrue(result.getConflictingTransitions().contains("t2"));
        assertNotNull(result.getFinalState(), "Final state (at conflict) should be recorded.");
        assertEquals(1, result.getFinalState().getPlaces().stream().filter(p -> p.getId().equals("p1")).findFirst().get().getTokens());
        assertTrue(result.getFinalState().getTransitions().stream().filter(t -> t.getId().equals("t1")).findFirst().get().getEnabled());
        assertTrue(result.getFinalState().getTransitions().stream().filter(t -> t.getId().equals("t2")).findFirst().get().getEnabled());
        verify(mockPetriNetService, times(1)).processPetriNet(any(PetriNetDTO.class));
    }

    @Test
    void validate_Failure_InfiniteLoop_StateRepetition() {
        // Given: A net that cycles between two states: p1 <-> p2
        baseValidationRequest.setPlaces(List.of(new PlaceDTO("p1", 0), new PlaceDTO("p2", 0)));
        baseValidationRequest.setTransitions(List.of(
            new TransitionDTO("t1", false, List.of("a1_in", "a1_out")), // p1 -> t1 -> p2
            new TransitionDTO("t2", false, List.of("a2_in", "a2_out"))  // p2 -> t2 -> p1
        ));
        baseValidationRequest.setArcs(List.of(
            new ArcDTO("a1_in", "REGULAR", "p1", "t1"), new ArcDTO("a1_out", "REGULAR", "t1", "p2"),
            new ArcDTO("a2_in", "REGULAR", "p2", "t2"), new ArcDTO("a2_out", "REGULAR", "t2", "p1")
        ));
        baseValidationRequest.setInputConfigs(List.of(placeConfig("p1", 1))); // Start with 1 token in p1
        baseValidationRequest.setExpectedOutputs(List.of()); // Output doesn't matter

        // Given: Mocked simulation states that cycle
        PetriNetDTO state_p1_1_p2_0 = new PetriNetDTO(
            List.of(new PlaceDTO("p1", 1), new PlaceDTO("p2", 0)),
            List.of(new TransitionDTO("t1", true, List.of("a1_in", "a1_out")), new TransitionDTO("t2", false, List.of("a2_in", "a2_out"))),
            baseValidationRequest.getArcs()
        );
        state_p1_1_p2_0.setDeterministicMode(true);

        PetriNetDTO state_p1_0_p2_1 = new PetriNetDTO(
            List.of(new PlaceDTO("p1", 0), new PlaceDTO("p2", 1)),
            List.of(new TransitionDTO("t1", false, List.of("a1_in", "a1_out")), new TransitionDTO("t2", true, List.of("a2_in", "a2_out"))),
            baseValidationRequest.getArcs()
        );
        state_p1_0_p2_1.setDeterministicMode(true);

        // Given: Mock behavior cycling between states
        when(mockPetriNetService.processPetriNet(any(PetriNetDTO.class)))
            .thenAnswer(invocation -> {
                PetriNetDTO currentState = invocation.getArgument(0);
                // If p1 has token, return state where p2 has token
                if (currentState.getPlaces().stream().anyMatch(p -> p.getId().equals("p1") && p.getTokens() == 1)) {
                    return createDTOCopy(state_p1_0_p2_1);
                } 
                // If p2 has token, return state where p1 has token (completing the loop)
                else if (currentState.getPlaces().stream().anyMatch(p -> p.getId().equals("p2") && p.getTokens() == 1)) {
                     return createDTOCopy(state_p1_1_p2_0);
                } else {
                    // Should not be reached in loop scenario before detection
                    return currentState; 
                }
            });

        // When: The validation service is called
        ValidationResultDTO result = validatorService.validatePetriNet(baseValidationRequest);

        // Then: Validation should fail and indicate infinite loop by state repetition
        assertFalse(result.isValid(), "Validation should fail due to infinite loop (state repetition).");
        assertTrue(result.getMessage().contains("Infinite loop detected"), "Message should indicate infinite loop.");
        assertTrue(result.getMessage().contains("same token distribution"), "Message should specify state repetition.");
        assertNotNull(result.getFinalState(), "Final state (at loop detection) should be recorded.");
        // Check it stopped at the state it detected as a repeat (p1:1,p2:0)
        assertEquals(1, result.getFinalState().getPlaces().stream().filter(p -> p.getId().equals("p1")).findFirst().get().getTokens());
        assertEquals(0, result.getFinalState().getPlaces().stream().filter(p -> p.getId().equals("p2")).findFirst().get().getTokens());
        // Corrected expectation: Process is called twice before detection on the 3rd loop iteration start
        verify(mockPetriNetService, times(2)).processPetriNet(any(PetriNetDTO.class)); 
    }

    @Test
    void validate_Failure_InfiniteLoop_MaxIterations() {
        // Given: A net where a transition always fires but the state doesn't exactly repeat (e.g., unbounded growth)
        // Simple example: p1 -> t1 -> p1 (but we mock it to always enable t1)
         baseValidationRequest.setPlaces(List.of(new PlaceDTO("p1", 0)));
         baseValidationRequest.setTransitions(List.of(new TransitionDTO("t1", false, List.of("a1", "a2"))));
         baseValidationRequest.setArcs(List.of(
             new ArcDTO("a1", "REGULAR", "p1", "t1"),
             new ArcDTO("a2", "REGULAR", "t1", "p1")
         ));
         baseValidationRequest.setInputConfigs(List.of(placeConfig("p1", 1)));
         baseValidationRequest.setExpectedOutputs(List.of());
 
         // Given: Mock behavior where processPetriNet always returns a state with t1 enabled,
         // AND modifies the state signature each time to bypass state repetition check.
         when(mockPetriNetService.processPetriNet(any(PetriNetDTO.class)))
             .thenAnswer(invocation -> {
                 PetriNetDTO currentState = invocation.getArgument(0);
                 PetriNetDTO nextState = createDTOCopy(currentState);
                 // Ensure t1 is always enabled
                 nextState.getTransitions().stream()
                                      .filter(t -> t.getId().equals("t1"))
                                      .findFirst().ifPresent(t -> t.setEnabled(true));
                 // CRUCIAL: Modify the state to change the signature
                 // Increment token count in p1 to simulate non-repeating state
                 nextState.getPlaces().stream()
                          .filter(p -> p.getId().equals("p1"))
                          .findFirst().ifPresent(p -> p.setTokens(p.getTokens() + 1));
                 return nextState;
             });
 
         // When: The validation service is called
         ValidationResultDTO result = validatorService.validatePetriNet(baseValidationRequest);
 
         // Then: Validation should fail due to exceeding max iterations
         assertFalse(result.isValid(), "Validation should fail due to max iterations.");
         assertTrue(result.getMessage().contains("exceeded the maximum allowed number of iterations"), "Message should indicate max iterations exceeded.");
         assertNotNull(result.getFinalState(), "Final state (at max iterations) should be recorded.");
         // Verify processPetriNet was called maxIterations times (default is 1000 in service)
         // Corrected expectation: Loop runs 1000 times, check fails on 1001st iteration start before the call
         verify(mockPetriNetService, times(1000)).processPetriNet(any(PetriNetDTO.class));
    }

    @Test
    void validate_Failure_IncorrectFinalState() {
        // Given: Simple net p1 --t1--> p2
        baseValidationRequest.setPlaces(List.of(new PlaceDTO("p1", 0), new PlaceDTO("p2", 0)));
        baseValidationRequest.setTransitions(List.of(new TransitionDTO("t1", false, List.of("a1", "a2"))));
        baseValidationRequest.setArcs(List.of(
            new ArcDTO("a1", "REGULAR", "p1", "t1"),
            new ArcDTO("a2", "REGULAR", "t1", "p2")
        ));
        baseValidationRequest.setInputConfigs(List.of(placeConfig("p1", 1))); // Start with 1 token in p1
        // Given: Expecting an incorrect number of tokens in p2
        baseValidationRequest.setExpectedOutputs(List.of(placeConfig("p2", 99))); // Expect 99 tokens in p2

        // Given: Mocked simulation ending with p2=1
        PetriNetDTO finalStateMock = new PetriNetDTO(
            List.of(new PlaceDTO("p1", 0), new PlaceDTO("p2", 1)), // Actual final state
            List.of(new TransitionDTO("t1", false, List.of("a1", "a2"))), // t1 disabled
            baseValidationRequest.getArcs()
        );
        finalStateMock.setDeterministicMode(true);

        // Given: Mock behavior leading to the final state
         when(mockPetriNetService.processPetriNet(any(PetriNetDTO.class)))
            .thenAnswer(invocation -> {
                 PetriNetDTO currentState = invocation.getArgument(0);
                 if (currentState.getPlaces().stream().anyMatch(p -> p.getId().equals("p1") && p.getTokens() == 1)) {
                     return createDTOCopy(finalStateMock);
                 } else { 
                     PetriNetDTO endState = createDTOCopy(finalStateMock);
                     endState.getTransitions().forEach(t -> t.setEnabled(false));
                     return endState;
                 }
            });

        // When: The validation service is called
        ValidationResultDTO result = validatorService.validatePetriNet(baseValidationRequest);

        // Then: Validation should fail due to mismatch in expected output
        assertFalse(result.isValid(), "Validation should fail due to incorrect final state.");
        assertTrue(result.getMessage().contains("failed"), "Message should indicate failure.");
        assertTrue(result.getMessage().contains("Place p2 has 1 tokens, expected 99"), "Message should detail the mismatch.");
        assertNotNull(result.getFinalState(), "Final state should be recorded.");
        assertEquals(1, result.getFinalState().getPlaces().stream().filter(p -> p.getId().equals("p2")).findFirst().get().getTokens());
        assertNotNull(result.getOutputMatches(), "Output matches map should exist.");
        assertFalse(result.getOutputMatches().getOrDefault("p2", true), "Output match for p2 should be false.");
        verify(mockPetriNetService, atLeastOnce()).processPetriNet(any(PetriNetDTO.class));
    }

    @Test
    void validate_Failure_MissingOutputPlace() {
        // Given: Simple net p1 --t1--> p2
        baseValidationRequest.setPlaces(List.of(new PlaceDTO("p1", 0), new PlaceDTO("p2", 0)));
        baseValidationRequest.setTransitions(List.of(new TransitionDTO("t1", false, List.of("a1", "a2"))));
        baseValidationRequest.setArcs(List.of(
            new ArcDTO("a1", "REGULAR", "p1", "t1"),
            new ArcDTO("a2", "REGULAR", "t1", "p2")
        ));
        baseValidationRequest.setInputConfigs(List.of(placeConfig("p1", 1))); // Start with 1 token in p1
        // Given: Expecting output for a non-existent place "p_missing"
        baseValidationRequest.setExpectedOutputs(List.of(placeConfig("p_missing", 1))); 

        // Given: Mocked simulation ending with p1=0, p2=1
         PetriNetDTO finalStateMock = new PetriNetDTO(
            List.of(new PlaceDTO("p1", 0), new PlaceDTO("p2", 1)), // Actual final state
            List.of(new TransitionDTO("t1", false, List.of("a1", "a2"))), // t1 disabled
            baseValidationRequest.getArcs()
        );
        finalStateMock.setDeterministicMode(true);

        // Given: Mock behavior leading to the final state
         when(mockPetriNetService.processPetriNet(any(PetriNetDTO.class)))
            .thenAnswer(invocation -> {
                 PetriNetDTO currentState = invocation.getArgument(0);
                 if (currentState.getPlaces().stream().anyMatch(p -> p.getId().equals("p1") && p.getTokens() == 1)) {
                     return createDTOCopy(finalStateMock);
                 } else { 
                     PetriNetDTO endState = createDTOCopy(finalStateMock);
                     endState.getTransitions().forEach(t -> t.setEnabled(false));
                     return endState;
                 }
            });

        // When: The validation service is called
        ValidationResultDTO result = validatorService.validatePetriNet(baseValidationRequest);

        // Then: Validation should fail due to the missing expected output place
        assertFalse(result.isValid(), "Validation should fail due to missing output place.");
        assertTrue(result.getMessage().contains("failed"), "Message should indicate failure.");
        assertTrue(result.getMessage().contains("Place p_missing not found"), "Message should detail the missing place.");
        assertNotNull(result.getFinalState(), "Final state should be recorded.");
        assertNotNull(result.getOutputMatches(), "Output matches map should exist.");
        assertFalse(result.getOutputMatches().getOrDefault("p_missing", true), "Output match for p_missing should be false.");
        verify(mockPetriNetService, atLeastOnce()).processPetriNet(any(PetriNetDTO.class));
    }

} 