package org.petrinet;

import org.junit.jupiter.api.Test;
import org.petrinet.client.ArcDTO;
import org.petrinet.client.PetriNetDTO;
import org.petrinet.client.PlaceDTO;
import org.petrinet.client.TransitionDTO;
import org.petrinet.service.PetriNetService;
import org.petrinet.service.model.Arc;
import org.petrinet.service.model.Place;
import org.petrinet.service.model.Transition;

import java.util.*;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;

public class ServiceTest {

    /**
     evaluateTransition Unit Tests
     ___________________________________________________________________
      **/
    @Test
    void evaluateTransition_onePlaceOneTokenOneTransition_IsEnabled_Test() {
        // Given
        PetriNetDTO inputDto = new PetriNetDTO(
                List.of(new PlaceDTO("place1", 1)), // One token
                List.of(new TransitionDTO("trans1", true, List.of("arc1"))),
                List.of(new ArcDTO("arc1", "REGULAR", "place1", "trans1"))
        );

        PetriNetService service = new PetriNetService();

        // When
        PetriNetDTO resultDto = service.processPetriNet(inputDto);

        // Then
        assertTrue(resultDto.getTransitions().stream()
                        .anyMatch(TransitionDTO::getEnabled),
                "At least one transition should be enabled with one token.");
    }

    @Test
    void evaluateTransition_onePlaceZeroTokensTransition_NotEnabled_Test() {
        // Given
        PetriNetDTO inputDto = new PetriNetDTO(
                List.of(new PlaceDTO("place1", 0)),
                List.of(new TransitionDTO("trans1", true, List.of("arc1"))),
                List.of(new ArcDTO("arc1", "REGULAR", "place1", "trans1"))
        );

        PetriNetService service = new PetriNetService();

        // When
        PetriNetDTO resultDto = service.processPetriNet(inputDto);

        // Then
        assertTrue(resultDto.getTransitions().stream()
                        .noneMatch(TransitionDTO::getEnabled),
                "Transition should not be enabled due to zero tokens.");
    }

    @Test
    void evaluateTransition_OneTransitionEnabledAnotherNot_Test() {
        //Given
        PetriNetDTO petriNetDTO = new PetriNetDTO(
                List.of(new PlaceDTO("place1", 3),
                        new PlaceDTO("place2", 0)),
                List.of( new TransitionDTO("trans1", true, List.of("arc1")),
                         new TransitionDTO("trans2", true, List.of("arc2"))),
                List.of(new ArcDTO("arc1", "REGULAR", "place1", "trans1"),
                        new ArcDTO("arc2", "REGULAR", "place2","trans2"))
        );

        PetriNetService service = new PetriNetService();

        // When
        PetriNetDTO resultDto = service.processPetriNet(petriNetDTO);

        // Then
        Optional<TransitionDTO> resultTrans1 = resultDto.getTransitions().stream()
                .filter(t -> t.getId().equals("trans1"))
                .findFirst();
        Optional<TransitionDTO> resultTrans2 = resultDto.getTransitions().stream()
                .filter(t -> t.getId().equals("trans2"))
                .findFirst();

        assertTrue(resultTrans1.isPresent() && resultTrans1.get().getEnabled(),
                "Transition 'trans1' should be enabled due to sufficient tokens.");
        assertTrue(resultTrans2.isPresent() && !resultTrans2.get().getEnabled(),
                "Transition 'trans2' should not be enabled due to insufficient tokens.");
    }

    @Test
    void evaluateTransition_InhibitorArcOneTransitionWithTokens_NotEnabled_Test(){
        PlaceDTO placeWithTokens = new PlaceDTO("place1", 3);
        TransitionDTO inhibitedTransition = new TransitionDTO("trans1", true, List.of("arc1"));
        ArcDTO inhibitorArc = new ArcDTO("arc1", "INHIBITOR", "place1", "trans1");

        PetriNetDTO petriNetDTO = new PetriNetDTO(
                List.of(placeWithTokens),
                List.of(inhibitedTransition),
                List.of(inhibitorArc)
        );

        PetriNetService service = new PetriNetService();

        // When
        PetriNetDTO resultDto = service.processPetriNet(petriNetDTO);

        // Then
        assertFalse(resultDto.getTransitions().getFirst().getEnabled(),
                "Transition 'trans1' should not be enabled as it's linked via an Inhibitor Arc" +
                        " with tokens present in the connected place node.");
    }

    @Test
    void evaluateTransition_InhibitorArcOneTransitionWithoutTokens_Enabled_Test(){
        PlaceDTO placeWithTokens = new PlaceDTO("place1", 0);
        TransitionDTO inhibitedTransition = new TransitionDTO("trans1", true, List.of("arc1"));
        ArcDTO inhibitorArc = new ArcDTO("arc1", "INHIBITOR", "place1", "trans1");

        PetriNetDTO petriNetDTO = new PetriNetDTO(
                List.of(placeWithTokens),
                List.of(inhibitedTransition),
                List.of(inhibitorArc)
        );
        PetriNetService service = new PetriNetService();

        // When
        PetriNetDTO resultDto = service.processPetriNet(petriNetDTO);

        assertTrue(resultDto.getTransitions().getFirst().getEnabled(),
                "Transition 'trans1' should remain enabled as its linked to an Inhibitor Arc" +
                        " without tokens present in the connected place node.");

    }

    @Test
    void evaluateTransition_OnlyOneOutgoingArc_Enabled_Test() {
        // Given
        PlaceDTO place1 = new PlaceDTO("place1", 1);
        TransitionDTO transitionWithOutgoingOnly = new TransitionDTO("trans1", true, List.of("arc1"));
        ArcDTO outgoingArc = new ArcDTO("arc1", "REGULAR", "trans1", "place1");

        PetriNetDTO petriNetDTO = new PetriNetDTO(
                List.of(place1),
                List.of(transitionWithOutgoingOnly),
                List.of(outgoingArc)
        );

        PetriNetService service = new PetriNetService();

        // When
        PetriNetDTO resultDto = service.processPetriNet(petriNetDTO);

        // Then
        assertTrue(resultDto.getTransitions().getFirst().getEnabled(),
                "Transition 'trans1' should be enabled as it only has outgoing arcs and no inhibiting conditions.");
    }

    @Test
    void evaluateTransition_BidirectionalArc_Enabled_Test() {
        // Given
        PlaceDTO place = new PlaceDTO("place1", 1);  // Initially has one token
        TransitionDTO transition = new TransitionDTO("trans1", true, List.of("arc1"));
        ArcDTO bidirectionalArc = new ArcDTO("arc1", "BIDIRECTIONAL", "place1", "trans1");

        PetriNetDTO petriNetDTO = new PetriNetDTO(
                List.of(place),
                List.of(transition),
                List.of(bidirectionalArc)
        );

        PetriNetService service = new PetriNetService();

        // When
        PetriNetDTO resultDto = service.processPetriNet(petriNetDTO);

        // Then
        assertTrue(resultDto.getTransitions().getFirst().getEnabled(),
                "Transition 'trans1' should be enabled as it's linked via a Bidirectional Arc with sufficient tokens.");
        assertEquals(1, resultDto.getPlaces().getFirst().getTokens(),
                "The token count at 'place1' should remain unchanged after the transition fires.");
    }

    @Test
    void evaluateTransition_ExactTokenRequirements_Enabled_Test() {
        // Setup
        Map<String, Arc> arcsMap = new HashMap<>();
        Map<String, Place> placesMap = new HashMap<>();

        Place sourcePlace = new Place("source", 2);  // Exactly 2 tokens available
        placesMap.put("source", sourcePlace);
        Arc regularArc = new Arc.RegularArc("arc1", "source", "trans1");
        arcsMap.put("arc1", regularArc);
        Transition transition = new Transition("trans1", true, List.of("arc1"));

        PetriNetService service = new PetriNetService();

        // Act
        boolean result = service.evaluateTransition(transition, arcsMap, placesMap);

        // Assert
        assertTrue(result, "Transition should be enabled since available tokens exactly meet the requirement.");
    }

    @Test
    void evaluateTransition_RegularArc_SufficientTokens_Enabled_Test() {
        Map<String, Arc> arcsMap = new HashMap<>();
        Map<String, Place> placesMap = new HashMap<>();

        Place sourcePlace = new Place("source", 3);  // 3 tokens available
        placesMap.put("source", sourcePlace);
        Arc regularArc = new Arc.RegularArc("arc1", "source", "trans1");
        arcsMap.put("arc1", regularArc);
        Transition transition = new Transition("trans1", true, List.of("arc1"));

        PetriNetService service = new PetriNetService();

        boolean result = service.evaluateTransition(transition, arcsMap, placesMap);

        assertTrue(result, "Transition should be enabled since available tokens meet or exceed the requirement.");
    }

    @Test
    void evaluateTransition_BidirectionalArc_SufficientTokens_Enabled_Test() {
        Map<String, Arc> arcsMap = new HashMap<>();
        Map<String, Place> placesMap = new HashMap<>();

        Place sourcePlace = new Place("source", 4);  // 4 tokens available
        placesMap.put("source", sourcePlace);
        Arc bidirectionalArc = new Arc.BidirectionalArc("arc2", "source", "trans1");
        arcsMap.put("arc2", bidirectionalArc);
        Transition transition = new Transition("trans1", true, List.of("arc2"));

        PetriNetService service = new PetriNetService();

        boolean result = service.evaluateTransition(transition, arcsMap, placesMap);

        assertTrue(result, "Transition should be enabled as sufficient tokens are available for the bidirectional arc.");
    }

    /**
     updateTokensForFiringTransitions Unit Tests
     _____________________________________________
     **/
    @Test
    void updateTokensForFiringTransition_RegularArc_Incoming_RemovesTokens() {
        //Setup
        Map<String, Arc> arcsMap = new HashMap<>();
        Map<String, Place> placesMap = new HashMap<>();
        Place sourcePlace = new Place("place1", 5);
        placesMap.put("place1", sourcePlace);
        Arc regularArc = new Arc.RegularArc("arc1", "place1", "trans1");
        arcsMap.put("arc1", regularArc);
        Transition transition = new Transition("trans1", true, List.of("arc1"));

        //Act
        PetriNetService service = new PetriNetService();
        service.updateTokensForFiringTransition(transition, arcsMap, placesMap);

        //Assert
        assertEquals(4, sourcePlace.getTokens(), "Source place should have one less token.");
    }

    @Test
    void updateTokensForFiringTransition_RegularArc_Outgoing_AddsTokens() {
        //Setup
        Map<String, Arc> arcsMap = new HashMap<>();
        Map<String, Place> placesMap = new HashMap<>();
        Place targetPlace = new Place("place2", 1);
        placesMap.put("place2", targetPlace);
        Arc regularArc = new Arc.RegularArc("arc1", "trans1", "place2");
        arcsMap.put("arc1", regularArc);
        Transition transition = new Transition("trans1", true, List.of("arc1"));

        //Act
        PetriNetService service = new PetriNetService();
        service.updateTokensForFiringTransition(transition, arcsMap, placesMap);

        //Assert
        assertEquals(2, targetPlace.getTokens(), "Target place should have one more token.");
    }

    @Test
    void updateTokensForFiringTransition_IncomingRegularArc_NoTokens_NoChange() {
        //Given
        Map<String, Arc> arcsMap = new HashMap<>();
        Map<String, Place> placesMap = new HashMap<>();
        Place sourcePlace = new Place("place1", 0);  // Zero tokens
        placesMap.put("place1", sourcePlace);
        Arc regularArc = new Arc.RegularArc("arc1", "place1", "trans1");
        arcsMap.put("arc1", regularArc);
        Transition transition = new Transition("trans1", true, List.of("arc1"));

        //When
        PetriNetService service = new PetriNetService();
        service.updateTokensForFiringTransition(transition, arcsMap, placesMap);

        //Then
        assertEquals(0, sourcePlace.getTokens(), "No tokens should be removed because source place started with zero.");
    }

    @Test
    void updateTokensForFiringTransition_OutgoingArc_NullPlace_NoChange() {
        // Given
        Map<String, Arc> arcsMap = new HashMap<>();
        Map<String, Place> placesMap = new HashMap<>();
        Arc regularArc = new Arc.RegularArc("arc1", "trans1", "nonExistentPlace");
        arcsMap.put("arc1", regularArc);
        Transition transition = new Transition("trans1", true, List.of("arc1"));

        // When
        PetriNetService service = new PetriNetService();
        service.updateTokensForFiringTransition(transition, arcsMap, placesMap);

        // Then
        assertFalse(placesMap.containsKey("nonExistentPlace"), "No tokens should be added because the target place does not exist.");
    }

    @Test
    void updateTokensForFiringTransition_IncomingArc_NullPlace_NoChange() {
        // Given
        Map<String, Arc> arcsMap = new HashMap<>();
        Map<String, Place> placesMap = new HashMap<>();
        Arc regularArc = new Arc.RegularArc("arc1", "nonExistentPlace","trans1");
        arcsMap.put("arc1", regularArc);
        Transition transition = new Transition("trans1", true, List.of("arc1"));

        // When
        PetriNetService service = new PetriNetService();
        service.updateTokensForFiringTransition(transition, arcsMap, placesMap);

        // Then
        assertFalse(placesMap.containsKey("nonExistentPlace"), "No tokens should be added because the target place does not exist.");
    }

    @Test
    void updateTokensForFiringTransition_DirectionalityHandling() {
        //Given
        Place sourcePlace = new Place("place1", 1);
        Place targetPlace = new Place("place2", 0);
        Map<String, Place> placesMap = new HashMap<>();
        placesMap.put("place1", sourcePlace);
        placesMap.put("place2", targetPlace);


        Arc incomingArc = new Arc.RegularArc("arc1", "place1", "trans1");  // Simulates incoming to transition
        Arc outgoingArc = new Arc.RegularArc("arc2", "trans1", "place2");  // Simulates outgoing from transition
        Map<String, Arc> arcsMap = new HashMap<>();
        arcsMap.put("arc1", incomingArc);
        arcsMap.put("arc2", outgoingArc);

        //Transition with both incoming and outgoing arcs
        Transition transition = new Transition("trans1", true, List.of("arc1", "arc2"));

        //When
        PetriNetService service = new PetriNetService();
        service.updateTokensForFiringTransition(transition, arcsMap, placesMap);

        // Then
        assertEquals(0, sourcePlace.getTokens(), "Incoming arc should have removed a token from the source place.");
        assertEquals(1, targetPlace.getTokens(), "Outgoing arc should have added a token to the target place.");
    }

    @Test
    void updateTokensForFiringTransition_NullArcs_NoTokenChange() {
        //Given
        Place sourcePlace = new Place("place1", 5);
        Place targetPlace = new Place("place2", 2);
        Map<String, Place> placesMap = new HashMap<>();
        placesMap.put("place1", sourcePlace);
        placesMap.put("place2", targetPlace);

        //intentionally missing from the arcsMap to simulate null references
        Map<String, Arc> arcsMap = new HashMap<>();
        // "arc1" and "arc2" will be referenced in the transition but not added to arcsMap

        //transition with references to non-existent arcs
        Transition transition = new Transition("trans1", true, List.of("arc1", "arc2"));

        //When
        PetriNetService service = new PetriNetService();
        service.updateTokensForFiringTransition(transition, arcsMap, placesMap);

        //Then
        assertEquals(5, sourcePlace.getTokens(), "Source place's tokens should remain unchanged.");
        assertEquals(2, targetPlace.getTokens(), "Target place's tokens should remain unchanged.");
    }

    @Test
    void updateTokensForFiringTransition_NonMatchingIDs_NoTokenChange() {
        //Given
        Place sourcePlace = new Place("place1", 3);  // Place linked but should remain unaffected
        Place targetPlace = new Place("place2", 1);  // Another linked place that should also remain unaffected
        Map<String, Place> placesMap = new HashMap<>();
        placesMap.put("place1", sourcePlace);
        placesMap.put("place2", targetPlace);

        // arcs that do not match the transition ID
        Arc nonMatchingArc1 = new Arc.RegularArc("arc1", "place1", "notTrans1");  // Incorrect outgoingId
        Arc nonMatchingArc2 = new Arc.RegularArc("arc2", "notTrans1", "place2");  // Incorrect incomingId
        Map<String, Arc> arcsMap = new HashMap<>();
        arcsMap.put("arc1", nonMatchingArc1);
        arcsMap.put("arc2", nonMatchingArc2);

        //transition with IDs that don't match any arc directions
        Transition transition = new Transition("trans1", true, List.of("arc1", "arc2"));
        //When
        PetriNetService service = new PetriNetService();
        service.updateTokensForFiringTransition(transition, arcsMap, placesMap);
        //Then
        assertEquals(3, sourcePlace.getTokens(), "Source place's tokens should remain unchanged due to non-matching outgoingId.");
        assertEquals(1, targetPlace.getTokens(), "Target place's tokens should remain unchanged due to non-matching incomingId.");
    }

    @Test
    void updateTokensForFiringTransition_Inhibitor_NoTokenAddition() {
        //This shouldn't be allowed but in case it is, it should not do anything.
        // Setup
        Place targetPlaceInhibitor = new Place("targetInhibitor", 5);
        Map<String, Place> placesMap = new HashMap<>();
        placesMap.put("targetInhibitor", targetPlaceInhibitor);

        Arc inhibitorArc = new Arc.InhibitorArc("arc3", "trans1", "targetInhibitor");
        Map<String, Arc> arcsMap = new HashMap<>();
        arcsMap.put("arc3", inhibitorArc);

        Transition transition = new Transition("trans1", true, List.of("arc3"));

        // Act
        PetriNetService service = new PetriNetService();
        service.updateTokensForFiringTransition(transition, arcsMap, placesMap);

        // Assert
        assertEquals(5, targetPlaceInhibitor.getTokens(), "Target place for Inhibitor Arc should not have additional tokens.");
    }

    @Test
    void updateTokensForFiringTransition_SingleBidirectionalArc_MaintainsTokens() {
        // Setup
        Map<String, Arc> arcsMap = new HashMap<>();
        Map<String, Place> placesMap = new HashMap<>();
        
        // Place with initial tokens
        Place sourcePlace = new Place("place1", 3);
        placesMap.put("place1", sourcePlace);
        
        // Bidirectional arc from place to transition
        Arc bidirectionalArc = new Arc.BidirectionalArc("arc1", "place1", "trans1");
        arcsMap.put("arc1", bidirectionalArc);
        
        // Transition with the bidirectional arc
        Transition transition = new Transition("trans1", true, List.of("arc1"));
        
        // Act
        PetriNetService service = new PetriNetService();
        service.updateTokensForFiringTransition(transition, arcsMap, placesMap);
        
        // Assert
        assertEquals(3, sourcePlace.getTokens(), 
            "Place should maintain the same number of tokens after firing a transition with a bidirectional arc");
    }
    
    @Test
    void updateTokensForFiringTransition_BidirectionalAndRegularArc_CorrectTokenHandling() {
        // Setup
        Map<String, Arc> arcsMap = new HashMap<>();
        Map<String, Place> placesMap = new HashMap<>();
        
        // Places with initial tokens
        Place place1 = new Place("place1", 3); // Connected via bidirectional arc
        Place place2 = new Place("place2", 2); // Connected via regular arc
        Place place3 = new Place("place3", 0); // Target place for transition output
        
        placesMap.put("place1", place1);
        placesMap.put("place2", place2);
        placesMap.put("place3", place3);
        
        // Bidirectional arc from place1 to transition
        Arc bidirectionalArc = new Arc.BidirectionalArc("arc1", "place1", "trans1");
        // Regular arc from place2 to transition
        Arc regularIncomingArc = new Arc.RegularArc("arc2", "place2", "trans1");
        // Regular arc from transition to place3
        Arc regularOutgoingArc = new Arc.RegularArc("arc3", "trans1", "place3");
        
        arcsMap.put("arc1", bidirectionalArc);
        arcsMap.put("arc2", regularIncomingArc);
        arcsMap.put("arc3", regularOutgoingArc);
        
        // Transition with all arcs
        Transition transition = new Transition("trans1", true, List.of("arc1", "arc2", "arc3"));
        
        // Act
        PetriNetService service = new PetriNetService();
        service.updateTokensForFiringTransition(transition, arcsMap, placesMap);
        
        // Assert
        assertEquals(3, place1.getTokens(), 
            "Place with bidirectional arc should maintain the same number of tokens");
        assertEquals(1, place2.getTokens(), 
            "Place with regular incoming arc should lose one token");
        assertEquals(1, place3.getTokens(), 
            "Place with regular outgoing arc should gain one token");
    }

    @Test
    void processPetriNet_BidirectionalArc_TokensRemainUnchanged() {
        // Given
        PlaceDTO place1 = new PlaceDTO("place1", 3);
        TransitionDTO transition = new TransitionDTO("trans1", true, List.of("arc1"));
        ArcDTO bidirectionalArc = new ArcDTO("arc1", "BIDIRECTIONAL", "place1", "trans1");
        
        PetriNetDTO petriNetDTO = new PetriNetDTO(
            List.of(place1),
            List.of(transition),
            List.of(bidirectionalArc)
        );
        
        PetriNetService service = new PetriNetService();
        
        // When
        PetriNetDTO resultDto = service.processPetriNet(petriNetDTO);
        
        // Then
        Optional<PlaceDTO> resultPlace = resultDto.getPlaces().stream()
            .filter(p -> p.getId().equals("place1"))
            .findFirst();
            
        assertTrue(resultPlace.isPresent(), "Place should exist in result");
        assertEquals(3, resultPlace.get().getTokens(), 
            "Place connected by bidirectional arc should maintain the same token count");
        
        Optional<TransitionDTO> resultTransition = resultDto.getTransitions().stream()
            .filter(t -> t.getId().equals("trans1"))
            .findFirst();
            
        assertTrue(resultTransition.isPresent(), "Transition should exist in result");
        assertTrue(resultTransition.get().getEnabled(), 
            "Transition should be enabled with bidirectional arc and tokens in place");
    }

    @Test
    void processPetriNet_BidirectionalAndRegularArc_CorrectFiring() {
        // Given
        PlaceDTO place1 = new PlaceDTO("place1", 3); // Connected via bidirectional arc
        PlaceDTO place2 = new PlaceDTO("place2", 2); // Connected via regular arc
        PlaceDTO place3 = new PlaceDTO("place3", 0); // Target for output
        
        TransitionDTO transition = new TransitionDTO("trans1", true, 
            List.of("arc1", "arc2", "arc3"));
            
        ArcDTO bidirectionalArc = new ArcDTO("arc1", "BIDIRECTIONAL", "place1", "trans1");
        ArcDTO regularIncomingArc = new ArcDTO("arc2", "REGULAR", "place2", "trans1");
        ArcDTO regularOutgoingArc = new ArcDTO("arc3", "REGULAR", "trans1", "place3");
        
        PetriNetDTO petriNetDTO = new PetriNetDTO(
            List.of(place1, place2, place3),
            List.of(transition),
            List.of(bidirectionalArc, regularIncomingArc, regularOutgoingArc)
        );
        
        PetriNetService service = new PetriNetService();
        
        // When
        PetriNetDTO resultDto = service.processPetriNet(petriNetDTO);
        
        // Then
        Map<String, Integer> tokenCounts = resultDto.getPlaces().stream()
            .collect(Collectors.toMap(PlaceDTO::getId, PlaceDTO::getTokens));
            
        assertEquals(3, tokenCounts.get("place1"), 
            "Place with bidirectional arc should maintain the same token count");
        assertEquals(1, tokenCounts.get("place2"), 
            "Place with regular incoming arc should lose one token");
        assertEquals(1, tokenCounts.get("place3"), 
            "Place with regular outgoing arc should gain one token");
            
        Optional<TransitionDTO> resultTransition = resultDto.getTransitions().stream()
            .filter(t -> t.getId().equals("trans1"))
            .findFirst();
            
        assertTrue(resultTransition.isPresent() && resultTransition.get().getEnabled(),
            "Transition should be enabled after firing");
    }

    /**
     calculateTotalIncomingTransitionCounts Unit Tests
     ________________________________________________________
     **/

    /**
     convertDomainModelToDTO Unit Tests Through indirect testing of processPetriNet
     _____________________________________________________________________
     **/
    @Test
    void processPetriNet_WithSupportedArcTypes() {
        // Setup PetriNetDTO with various supported arc types
        List<PlaceDTO> placeDTOs = List.of(new PlaceDTO("place1", 5));
        List<ArcDTO> arcDTOs = List.of(
                new ArcDTO("arc1", "REGULAR", "place1", "trans1"),
                new ArcDTO("arc2", "INHIBITOR", "place1", "trans1"),
                new ArcDTO("arc3", "BIDIRECTIONAL", "place1", "trans1")
        );
        List<TransitionDTO> transitionDTOs = List.of(new TransitionDTO("trans1", true, List.of("arc1", "arc2", "arc3")));

        PetriNetDTO inputDto = new PetriNetDTO(placeDTOs, transitionDTOs, arcDTOs);
        PetriNetService service = new PetriNetService();

        // Act
        PetriNetDTO resultDto = service.processPetriNet(inputDto);

        // Assert
        assertNotNull(resultDto);
        assertEquals(3, resultDto.getArcs().size()); // Ensure all arcs are processed
        resultDto.getArcs().forEach(arc -> assertTrue(List.of("REGULAR", "INHIBITOR", "BIDIRECTIONAL").contains(arc.getType())));
    }

    @Test
    public void processPetriNet_WithUnsupportedArcType_ShouldThrowException() {

        List<PlaceDTO> placeDTOs = List.of(
                new PlaceDTO("place1", 5)
        );
        List<ArcDTO> arcDTOs = List.of(
                new ArcDTO("arc1", "REGULAR", "place1", "trans1"),
                new ArcDTO("arc2", "INHIBITOR", "place1", "trans1"),
                new ArcDTO("arc3", "UNSUPPORTED", "place1", "trans1")  // Unsupported type
        );
        List<TransitionDTO> transitionDTOs = List.of(
                new TransitionDTO("trans1", true, List.of("arc1", "arc2", "arc3"))
        );

        PetriNetService service = new PetriNetService();
        PetriNetDTO inputDto = new PetriNetDTO(placeDTOs, transitionDTOs, arcDTOs);

        assertThrows(IllegalArgumentException.class, () -> {
            service.processPetriNet(inputDto);
        }, "Expected to throw IllegalArgumentException due to unsupported arc type but did not");
    }

    @Test
    void processPetriNet_MultipleIterations_TokensEmptyFromSourcePlace() {
        // Given: A Petri net with one place containing 3 tokens and one transition
        PetriNetDTO inputDto = new PetriNetDTO(
                List.of(
                    new PlaceDTO("place1", 3),
                    new PlaceDTO("place2", 0)
                ),
                List.of(new TransitionDTO("trans1", true, List.of("arc1", "arc2"))),
                List.of(
                    new ArcDTO("arc1", "REGULAR", "place1", "trans1"),
                    new ArcDTO("arc2", "REGULAR", "trans1", "place2")
                )
        );

        PetriNetService service = new PetriNetService();

        // When: Process the Petri net multiple times
        PetriNetDTO result1 = service.processPetriNet(inputDto);
        PetriNetDTO result2 = service.processPetriNet(result1);
        PetriNetDTO result3 = service.processPetriNet(result2);

        // Then: Tokens should be consumed and eventually the source place should be empty
        Optional<PlaceDTO> place1Result = result3.getPlaces().stream()
                .filter(p -> p.getId().equals("place1"))
                .findFirst();

        assertTrue(place1Result.isPresent(), "Place1 should exist in the result");
        assertEquals(0, place1Result.get().getTokens(), "Place1 should have 0 tokens after multiple iterations");
    }

    // ==================== RESOLVE CONFLICT TESTS ====================

    @Test
    void resolveConflict_ValidConflictResolution_ResolvesSuccessfully() {
        // Given: A Petri net with two enabled transitions (conflict state)
        PetriNetDTO conflictNet = new PetriNetDTO(
                List.of(
                    new PlaceDTO("place1", 2),
                    new PlaceDTO("place2", 0),
                    new PlaceDTO("place3", 0)
                ),
                List.of(
                    new TransitionDTO("trans1", true, List.of("arc1", "arc2")),
                    new TransitionDTO("trans2", true, List.of("arc3", "arc4"))
                ),
                List.of(
                    new ArcDTO("arc1", "REGULAR", "place1", "trans1"),
                    new ArcDTO("arc2", "REGULAR", "trans1", "place2"),
                    new ArcDTO("arc3", "REGULAR", "place1", "trans2"),
                    new ArcDTO("arc4", "REGULAR", "trans2", "place3")
                )
        );
        conflictNet.setDeterministicMode(true);

        PetriNetService service = new PetriNetService();

        // When: Resolve conflict by selecting trans1
        PetriNetDTO result = service.resolveConflict(conflictNet, "trans1");

        // Then: trans1 should fire, consuming tokens from place1 and adding to place2
        Optional<PlaceDTO> place1 = result.getPlaces().stream()
                .filter(p -> p.getId().equals("place1"))
                .findFirst();
        Optional<PlaceDTO> place2 = result.getPlaces().stream()
                .filter(p -> p.getId().equals("place2"))
                .findFirst();
        Optional<PlaceDTO> place3 = result.getPlaces().stream()
                .filter(p -> p.getId().equals("place3"))
                .findFirst();

        assertTrue(place1.isPresent(), "Place1 should exist");
        assertTrue(place2.isPresent(), "Place2 should exist");
        assertTrue(place3.isPresent(), "Place3 should exist");

        assertEquals(1, place1.get().getTokens(), "Place1 should have 1 token remaining (2-1)");
        assertEquals(1, place2.get().getTokens(), "Place2 should have 1 token (0+1)");
        assertEquals(0, place3.get().getTokens(), "Place3 should have 0 tokens (trans2 didn't fire)");
    }

    @Test
    void resolveConflict_InvalidTransitionId_ThrowsException() {
        // Given: A Petri net with conflict
        PetriNetDTO conflictNet = new PetriNetDTO(
                List.of(
                    new PlaceDTO("place1", 2),
                    new PlaceDTO("place2", 0)
                ),
                List.of(
                    new TransitionDTO("trans1", true, List.of("arc1", "arc2"))
                ),
                List.of(
                    new ArcDTO("arc1", "REGULAR", "place1", "trans1"),
                    new ArcDTO("arc2", "REGULAR", "trans1", "place2")
                )
        );

        PetriNetService service = new PetriNetService();

        // When & Then: Should throw exception for invalid transition ID
        IllegalArgumentException exception = assertThrows(
            IllegalArgumentException.class,
            () -> service.resolveConflict(conflictNet, "nonexistent-transition"),
            "Should throw IllegalArgumentException for invalid transition ID"
        );

        assertEquals("Selected transition not found: nonexistent-transition", exception.getMessage());
    }

    @Test
    void resolveConflict_EmptyTransitionId_ThrowsException() {
        // Given: A Petri net with conflict
        PetriNetDTO conflictNet = new PetriNetDTO(
                List.of(
                    new PlaceDTO("place1", 2),
                    new PlaceDTO("place2", 0)
                ),
                List.of(
                    new TransitionDTO("trans1", true, List.of("arc1", "arc2"))
                ),
                List.of(
                    new ArcDTO("arc1", "REGULAR", "place1", "trans1"),
                    new ArcDTO("arc2", "REGULAR", "trans1", "place2")
                )
        );

        PetriNetService service = new PetriNetService();

        // When & Then: Should throw exception for empty transition ID
        IllegalArgumentException exception = assertThrows(
            IllegalArgumentException.class,
            () -> service.resolveConflict(conflictNet, ""),
            "Should throw IllegalArgumentException for empty transition ID"
        );

        assertEquals("Selected transition not found: ", exception.getMessage());
    }

    @Test
    void resolveConflict_NullTransitionId_ThrowsException() {
        // Given: A Petri net with conflict
        PetriNetDTO conflictNet = new PetriNetDTO(
                List.of(
                    new PlaceDTO("place1", 2),
                    new PlaceDTO("place2", 0)
                ),
                List.of(
                    new TransitionDTO("trans1", true, List.of("arc1", "arc2"))
                ),
                List.of(
                    new ArcDTO("arc1", "REGULAR", "place1", "trans1"),
                    new ArcDTO("arc2", "REGULAR", "trans1", "place2")
                )
        );

        PetriNetService service = new PetriNetService();

        // When & Then: Should throw exception for null transition ID
        IllegalArgumentException exception = assertThrows(
            IllegalArgumentException.class,
            () -> service.resolveConflict(conflictNet, null),
            "Should throw IllegalArgumentException for null transition ID"
        );

        assertEquals("Selected transition not found: null", exception.getMessage());
    }

    @Test
    void resolveConflict_DeterministicMode_NewConflictAfterResolution() {
        // Given: A Petri net that will have a new conflict after resolution
        PetriNetDTO conflictNet = new PetriNetDTO(
                List.of(
                    new PlaceDTO("place1", 3),
                    new PlaceDTO("place2", 0),
                    new PlaceDTO("place3", 0)
                ),
                List.of(
                    new TransitionDTO("trans1", true, List.of("arc1", "arc2")),
                    new TransitionDTO("trans2", true, List.of("arc3", "arc4"))
                ),
                List.of(
                    new ArcDTO("arc1", "REGULAR", "place1", "trans1"),
                    new ArcDTO("arc2", "REGULAR", "trans1", "place2"),
                    new ArcDTO("arc3", "REGULAR", "place1", "trans2"),
                    new ArcDTO("arc4", "REGULAR", "trans2", "place3")
                )
        );
        conflictNet.setDeterministicMode(true);

        PetriNetService service = new PetriNetService();

        // When: Resolve conflict by selecting trans1
        PetriNetDTO result = service.resolveConflict(conflictNet, "trans1");

        // Then: Should have a new conflict (both transitions enabled again)
        long enabledTransitions = result.getTransitions().stream()
                .filter(TransitionDTO::getEnabled)
                .count();

        assertEquals(2, enabledTransitions, "Should have 2 enabled transitions after resolution (new conflict)");
    }

    @Test
    void resolveConflict_NonDeterministicMode_NoNewConflict() {
        // Given: A Petri net in non-deterministic mode
        PetriNetDTO conflictNet = new PetriNetDTO(
                List.of(
                    new PlaceDTO("place1", 3),
                    new PlaceDTO("place2", 0),
                    new PlaceDTO("place3", 0)
                ),
                List.of(
                    new TransitionDTO("trans1", true, List.of("arc1", "arc2")),
                    new TransitionDTO("trans2", true, List.of("arc3", "arc4"))
                ),
                List.of(
                    new ArcDTO("arc1", "REGULAR", "place1", "trans1"),
                    new ArcDTO("arc2", "REGULAR", "trans1", "place2"),
                    new ArcDTO("arc3", "REGULAR", "place1", "trans2"),
                    new ArcDTO("arc4", "REGULAR", "trans2", "place3")
                )
        );
        conflictNet.setDeterministicMode(false);

        PetriNetService service = new PetriNetService();

        // When: Resolve conflict by selecting trans1
        PetriNetDTO result = service.resolveConflict(conflictNet, "trans1");

        // Then: Should not have new conflict in non-deterministic mode
        long enabledTransitions = result.getTransitions().stream()
                .filter(TransitionDTO::getEnabled)
                .count();

        assertEquals(2, enabledTransitions, "Should still have 2 enabled transitions in non-deterministic mode");
    }

    @Test
    void resolveConflict_WithBidirectionalArc_CorrectTokenHandling() {
        // Given: A Petri net with bidirectional arc
        PetriNetDTO conflictNet = new PetriNetDTO(
                List.of(
                    new PlaceDTO("place1", 2),
                    new PlaceDTO("place2", 1)
                ),
                List.of(
                    new TransitionDTO("trans1", true, List.of("arc1"))
                ),
                List.of(
                    new ArcDTO("arc1", "BIDIRECTIONAL", "place1", "place2")
                )
        );
        conflictNet.setDeterministicMode(true);

        PetriNetService service = new PetriNetService();

        // When: Resolve conflict by selecting trans1
        PetriNetDTO result = service.resolveConflict(conflictNet, "trans1");

        // Then: Tokens should remain unchanged (bidirectional arc)
        Optional<PlaceDTO> place1 = result.getPlaces().stream()
                .filter(p -> p.getId().equals("place1"))
                .findFirst();
        Optional<PlaceDTO> place2 = result.getPlaces().stream()
                .filter(p -> p.getId().equals("place2"))
                .findFirst();

        assertTrue(place1.isPresent(), "Place1 should exist");
        assertTrue(place2.isPresent(), "Place2 should exist");

        assertEquals(2, place1.get().getTokens(), "Place1 should have 2 tokens (bidirectional arc)");
        assertEquals(1, place2.get().getTokens(), "Place2 should have 1 token (bidirectional arc)");
    }

    @Test
    void resolveConflict_WithInhibitorArc_CorrectTokenHandling() {
        // Given: A Petri net with inhibitor arc
        PetriNetDTO conflictNet = new PetriNetDTO(
                List.of(
                    new PlaceDTO("place1", 2),
                    new PlaceDTO("place2", 0),
                    new PlaceDTO("place3", 0)
                ),
                List.of(
                    new TransitionDTO("trans1", true, List.of("arc1", "arc2")),
                    new TransitionDTO("trans2", true, List.of("arc3", "arc4"))
                ),
                List.of(
                    new ArcDTO("arc1", "REGULAR", "place1", "trans1"),
                    new ArcDTO("arc2", "REGULAR", "trans1", "place2"),
                    new ArcDTO("arc3", "INHIBITOR", "place3", "trans2"),
                    new ArcDTO("arc4", "REGULAR", "trans2", "place3")
                )
        );
        conflictNet.setDeterministicMode(true);

        PetriNetService service = new PetriNetService();

        // When: Resolve conflict by selecting trans2 (inhibitor arc)
        PetriNetDTO result = service.resolveConflict(conflictNet, "trans2");

        // Then: trans2 should fire (inhibitor arc allows it since place3 has 0 tokens)
        Optional<PlaceDTO> place3 = result.getPlaces().stream()
                .filter(p -> p.getId().equals("place3"))
                .findFirst();

        assertTrue(place3.isPresent(), "Place3 should exist");
        assertEquals(1, place3.get().getTokens(), "Place3 should have 1 token (trans2 fired)");
    }

    @Test
    void resolveConflict_PreservesDeterministicMode() {
        // Given: A Petri net with deterministic mode set
        PetriNetDTO conflictNet = new PetriNetDTO(
                List.of(
                    new PlaceDTO("place1", 2),
                    new PlaceDTO("place2", 0)
                ),
                List.of(
                    new TransitionDTO("trans1", true, List.of("arc1", "arc2"))
                ),
                List.of(
                    new ArcDTO("arc1", "REGULAR", "place1", "trans1"),
                    new ArcDTO("arc2", "REGULAR", "trans1", "place2")
                )
        );
        conflictNet.setDeterministicMode(true);

        PetriNetService service = new PetriNetService();

        // When: Resolve conflict
        PetriNetDTO result = service.resolveConflict(conflictNet, "trans1");

        // Then: Deterministic mode should be preserved
        assertTrue(result.getDeterministicMode(), "Deterministic mode should be preserved");
    }

    @Test
    void resolveConflict_WithBoundedPlace_RespectsCapacity() {
        // Given: A Petri net with bounded place
        PetriNetDTO conflictNet = new PetriNetDTO(
                List.of(
                    new PlaceDTO("place1", 2, true, 3),
                    new PlaceDTO("place2", 0, true, 1)
                ),
                List.of(
                    new TransitionDTO("trans1", true, List.of("arc1", "arc2"))
                ),
                List.of(
                    new ArcDTO("arc1", "REGULAR", "place1", "trans1"),
                    new ArcDTO("arc2", "REGULAR", "trans1", "place2")
                )
        );
        conflictNet.setDeterministicMode(true);

        PetriNetService service = new PetriNetService();

        // When: Resolve conflict
        PetriNetDTO result = service.resolveConflict(conflictNet, "trans1");

        // Then: Bounded place should respect capacity
        Optional<PlaceDTO> place2 = result.getPlaces().stream()
                .filter(p -> p.getId().equals("place2"))
                .findFirst();

        assertTrue(place2.isPresent(), "Place2 should exist");
        assertEquals(1, place2.get().getTokens(), "Place2 should have 1 token (at capacity)");
        assertTrue(place2.get().isBounded(), "Place2 should be bounded");
        assertEquals(1, place2.get().getCapacity(), "Place2 should have capacity 1");
    }

    @Test
    void resolveConflict_ComplexScenario_MultiplePlacesAndTransitions() {
        // Given: A complex Petri net with multiple places and transitions
        PetriNetDTO conflictNet = new PetriNetDTO(
                List.of(
                    new PlaceDTO("place1", 3),
                    new PlaceDTO("place2", 1),
                    new PlaceDTO("place3", 0),
                    new PlaceDTO("place4", 0)
                ),
                List.of(
                    new TransitionDTO("trans1", true, List.of("arc1", "arc2")),
                    new TransitionDTO("trans2", true, List.of("arc3", "arc4")),
                    new TransitionDTO("trans3", true, List.of("arc5", "arc6"))
                ),
                List.of(
                    new ArcDTO("arc1", "REGULAR", "place1", "trans1"),
                    new ArcDTO("arc2", "REGULAR", "trans1", "place3"),
                    new ArcDTO("arc3", "REGULAR", "place2", "trans2"),
                    new ArcDTO("arc4", "REGULAR", "trans2", "place4"),
                    new ArcDTO("arc5", "REGULAR", "place1", "trans3"),
                    new ArcDTO("arc6", "REGULAR", "trans3", "place2")
                )
        );
        conflictNet.setDeterministicMode(true);

        PetriNetService service = new PetriNetService();

        // When: Resolve conflict by selecting trans1
        PetriNetDTO result = service.resolveConflict(conflictNet, "trans1");

        // Then: Complex scenario should be handled correctly
        Optional<PlaceDTO> place1 = result.getPlaces().stream()
                .filter(p -> p.getId().equals("place1"))
                .findFirst();
        Optional<PlaceDTO> place3 = result.getPlaces().stream()
                .filter(p -> p.getId().equals("place3"))
                .findFirst();

        assertTrue(place1.isPresent(), "Place1 should exist");
        assertTrue(place3.isPresent(), "Place3 should exist");

        assertEquals(2, place1.get().getTokens(), "Place1 should have 2 tokens remaining (3-1)");
        assertEquals(1, place3.get().getTokens(), "Place3 should have 1 token (0+1)");
    }
}
