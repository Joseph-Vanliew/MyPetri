package org.petrinet;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.petrinet.client.*;
import org.petrinet.service.PetriNetAnalysisService;
import org.petrinet.service.PetriNetService;

import java.util.Arrays;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Test class for PetriNetAnalysisService.
 * Tests various analysis methods including reachability, liveness, boundedness, and structural analysis.
 */
class AnalysisServiceTest {

    private PetriNetAnalysisService analysisService;
    private PetriNetService petriNetService;

    @BeforeEach
    void setUp() {
        petriNetService = new PetriNetService();
        analysisService = new PetriNetAnalysisService(petriNetService);
    }

    @Test
    void analyzeReachableStates_SimpleNet_ReturnsCorrectCount() {
        // Given: A simple Petri net with one place containing a token, one transition, and one output place
        PlaceDTO place1 = new PlaceDTO("p1", 1, false, null);
        PlaceDTO place2 = new PlaceDTO("p2", 0, false, null);
        
        TransitionDTO transition = new TransitionDTO("t1", false, Arrays.asList("arc1"));
        
        ArcDTO arc = new ArcDTO("arc1", "REGULAR", "p1", "t1");
        ArcDTO arc2 = new ArcDTO("arc2", "REGULAR", "t1", "p2");
        
        PetriNetDTO petriNet = new PetriNetDTO(
            Arrays.asList(place1, place2),
            Arrays.asList(transition),
            Arrays.asList(arc, arc2)
        );

        // When: Analyzing reachable states
        AnalysisResultDTO result = analysisService.analyzeReachableStates(petriNet);

        // Then: Should return valid analysis results with reachable states
        assertNotNull(result);
        assertEquals("Reachable States", result.getAnalysisType());
        assertTrue(result.getReachableStatesCount() > 0);
        assertTrue(result.getExploredStatesCount() > 0);
        assertNotNull(result.getDetails());
    }

    @Test
    void analyzeLiveness_DeadlockNet_DetectsDeadlock() {
        // Given: A Petri net with no tokens in input places (deadlock state)
        PlaceDTO place1 = new PlaceDTO("p1", 0, false, null);
        PlaceDTO place2 = new PlaceDTO("p2", 0, false, null);
        
        TransitionDTO transition = new TransitionDTO("t1", false, Arrays.asList("arc1"));
        
        ArcDTO arc = new ArcDTO("arc1", "REGULAR", "p1", "t1");
        ArcDTO arc2 = new ArcDTO("arc2", "REGULAR", "t1", "p2");
        
        PetriNetDTO petriNet = new PetriNetDTO(
            Arrays.asList(place1, place2),
            Arrays.asList(transition),
            Arrays.asList(arc, arc2)
        );

        // When: Analyzing liveness
        AnalysisResultDTO result = analysisService.analyzeLiveness(petriNet);

        // Then: Should detect deadlock with no enabled transitions
        assertNotNull(result);
        assertEquals("Liveness Analysis", result.getAnalysisType());
        assertTrue(result.isHasDeadlock());
        assertEquals(0, result.getEnabledTransitionsCount());
        assertTrue(result.getDetails().contains("DEADLOCK DETECTED"));
    }

    @Test
    void analyzeLiveness_EnabledTransitions_ReturnsCorrectCount() {
        // Given: A Petri net with tokens in input places (enabled transitions)
        PlaceDTO place1 = new PlaceDTO("p1", 1, false, null);
        PlaceDTO place2 = new PlaceDTO("p2", 0, false, null);
        
        TransitionDTO transition = new TransitionDTO("t1", false, Arrays.asList("arc1"));
        
        ArcDTO arc = new ArcDTO("arc1", "REGULAR", "p1", "t1");
        ArcDTO arc2 = new ArcDTO("arc2", "REGULAR", "t1", "p2");
        
        PetriNetDTO petriNet = new PetriNetDTO(
            Arrays.asList(place1, place2),
            Arrays.asList(transition),
            Arrays.asList(arc, arc2)
        );

        // When: Analyzing liveness
        AnalysisResultDTO result = analysisService.analyzeLiveness(petriNet);

        // Then: Should report enabled transitions with no deadlock
        assertNotNull(result);
        assertEquals("Liveness Analysis", result.getAnalysisType());
        assertFalse(result.isHasDeadlock());
        assertEquals(1, result.getEnabledTransitionsCount());
        assertTrue(result.getDetails().contains("1 transitions are enabled"));
    }

    @Test
    void analyzeBoundedness_MixedPlaces_ReturnsCorrectCounts() {
        // Given: A Petri net with both bounded and unbounded places
        PlaceDTO boundedPlace = new PlaceDTO("p1", 0, true, 5);
        PlaceDTO unboundedPlace = new PlaceDTO("p2", 0, false, null);
        
        TransitionDTO transition = new TransitionDTO("t1", false, Arrays.asList("arc1"));
        
        ArcDTO arc = new ArcDTO("arc1", "REGULAR", "p1", "t1");
        ArcDTO arc2 = new ArcDTO("arc2", "REGULAR", "t1", "p2");
        
        PetriNetDTO petriNet = new PetriNetDTO(
            Arrays.asList(boundedPlace, unboundedPlace),
            Arrays.asList(transition),
            Arrays.asList(arc, arc2)
        );

        // When: Analyzing boundedness
        AnalysisResultDTO result = analysisService.analyzeBoundedness(petriNet);

        // Then: Should correctly count bounded and unbounded places
        assertNotNull(result);
        assertEquals("Boundedness Analysis", result.getAnalysisType());
        assertEquals(1, result.getBoundedPlacesCount());
        assertEquals(1, result.getUnboundedPlacesCount());
        assertTrue(result.getDetails().contains("1 bounded places and 1 unbounded places"));
    }

    @Test
    void analyzeBoundedness_AllUnbounded_ReturnsCorrectCounts() {
        // Given: A Petri net with all unbounded places
        PlaceDTO place1 = new PlaceDTO("p1", 0, false, null);
        PlaceDTO place2 = new PlaceDTO("p2", 0, false, null);
        
        TransitionDTO transition = new TransitionDTO("t1", false, Arrays.asList("arc1"));
        
        ArcDTO arc = new ArcDTO("arc1", "REGULAR", "p1", "t1");
        ArcDTO arc2 = new ArcDTO("arc2", "REGULAR", "t1", "p2");
        
        PetriNetDTO petriNet = new PetriNetDTO(
            Arrays.asList(place1, place2),
            Arrays.asList(transition),
            Arrays.asList(arc, arc2)
        );

        // When: Analyzing boundedness
        AnalysisResultDTO result = analysisService.analyzeBoundedness(petriNet);

        // Then: Should report all places as unbounded
        assertNotNull(result);
        assertEquals("Boundedness Analysis", result.getAnalysisType());
        assertEquals(0, result.getBoundedPlacesCount());
        assertEquals(2, result.getUnboundedPlacesCount());
        assertTrue(result.getDetails().contains("0 bounded places and 2 unbounded places"));
    }

    @Test
    void computeIncidenceMatrix_SimpleNet_ReturnsCorrectMatrix() {
        // Given: A simple Petri net with one transition consuming from one place and producing to another
        PlaceDTO place1 = new PlaceDTO("p1", 0, false, null);
        PlaceDTO place2 = new PlaceDTO("p2", 0, false, null);
        
        TransitionDTO transition = new TransitionDTO("t1", false, Arrays.asList("arc1", "arc2"));
        
        ArcDTO arc1 = new ArcDTO("arc1", "REGULAR", "p1", "t1"); // Place -> Transition
        ArcDTO arc2 = new ArcDTO("arc2", "REGULAR", "t1", "p2"); // Transition -> Place
        
        PetriNetDTO petriNet = new PetriNetDTO(
            Arrays.asList(place1, place2),
            Arrays.asList(transition),
            Arrays.asList(arc1, arc2)
        );

        // When: Computing incidence matrix
        AnalysisResultDTO result = analysisService.computeIncidenceMatrix(petriNet);

        // Then: Should return correct matrix dimensions and values
        assertNotNull(result);
        assertEquals("Incidence Matrix", result.getAnalysisType());
        assertNotNull(result.getIncidenceMatrix());
        assertEquals(2, result.getIncidenceMatrix().length); // 2 places
        assertEquals(1, result.getIncidenceMatrix()[0].length); // 1 transition
        
        // Check matrix values: place1 should have -1 (consumption), place2 should have +1 (production)
        assertEquals(-1, result.getIncidenceMatrix()[0][0]); // p1 -> t1 (consumption)
        assertEquals(1, result.getIncidenceMatrix()[1][0]);  // t1 -> p2 (production)
        
        assertTrue(result.getDetails().contains("2 places × 1 transitions"));
    }

    @Test
    void computeIncidenceMatrix_BidirectionalArc_ReturnsCorrectMatrix() {
        // Given: A Petri net with a bidirectional arc between place and transition
        PlaceDTO place = new PlaceDTO("p1", 0, false, null);
        TransitionDTO transition = new TransitionDTO("t1", false, Arrays.asList("arc1"));
        
        ArcDTO arc = new ArcDTO("arc1", "BIDIRECTIONAL", "p1", "t1");
        
        PetriNetDTO petriNet = new PetriNetDTO(
            Arrays.asList(place),
            Arrays.asList(transition),
            Arrays.asList(arc)
        );

        // When: Computing incidence matrix
        AnalysisResultDTO result = analysisService.computeIncidenceMatrix(petriNet);

        // Then: Should return matrix with net change of 0 for bidirectional arc
        assertNotNull(result);
        assertEquals("Incidence Matrix", result.getAnalysisType());
        assertNotNull(result.getIncidenceMatrix());
        assertEquals(1, result.getIncidenceMatrix().length); // 1 place
        assertEquals(1, result.getIncidenceMatrix()[0].length); // 1 transition
        
        // Bidirectional arc should result in net change of 0 (-1 + 1 = 0)
        assertEquals(0, result.getIncidenceMatrix()[0][0]);
    }

    @Test
    void performStructuralAnalysis_SimpleNet_ReturnsCorrectCounts() {
        // Given: A Petri net with different arc types and isolated elements
        PlaceDTO place1 = new PlaceDTO("p1", 0, false, null);
        PlaceDTO place2 = new PlaceDTO("p2", 0, false, null);
        PlaceDTO isolatedPlace = new PlaceDTO("p3", 0, false, null);
        
        TransitionDTO transition = new TransitionDTO("t1", false, Arrays.asList("arc1", "arc2"));
        TransitionDTO isolatedTransition = new TransitionDTO("t2", false, Arrays.asList());
        
        ArcDTO regularArc = new ArcDTO("arc1", "REGULAR", "p1", "t1");
        ArcDTO inhibitorArc = new ArcDTO("arc2", "INHIBITOR", "p2", "t1");
        
        PetriNetDTO petriNet = new PetriNetDTO(
            Arrays.asList(place1, place2, isolatedPlace),
            Arrays.asList(transition, isolatedTransition),
            Arrays.asList(regularArc, inhibitorArc)
        );

        // When: Performing structural analysis
        AnalysisResultDTO result = analysisService.performStructuralAnalysis(petriNet);

        // Then: Should correctly count arc types and isolated elements
        assertNotNull(result);
        assertEquals("Structural Analysis", result.getAnalysisType());
        assertEquals(1, result.getRegularArcsCount());
        assertEquals(1, result.getInhibitorArcsCount());
        assertEquals(0, result.getBidirectionalArcsCount());
        assertEquals(1, result.getIsolatedPlacesCount()); // p3 is isolated
        assertEquals(1, result.getIsolatedTransitionsCount()); // t2 is isolated
        
        assertTrue(result.getDetails().contains("1 regular, 1 inhibitor, 0 bidirectional arcs"));
        assertTrue(result.getDetails().contains("1 isolated places, 1 isolated transitions"));
    }

    @Test
    void performStructuralAnalysis_AllArcTypes_ReturnsCorrectCounts() {
        // Given: A Petri net with all three arc types (regular, inhibitor, bidirectional)
        PlaceDTO place1 = new PlaceDTO("p1", 0, false, null);
        PlaceDTO place2 = new PlaceDTO("p2", 0, false, null);
        PlaceDTO place3 = new PlaceDTO("p3", 0, false, null);
        
        TransitionDTO transition1 = new TransitionDTO("t1", false, Arrays.asList("arc1", "arc2", "arc3"));
        TransitionDTO transition2 = new TransitionDTO("t2", false, Arrays.asList("arc4"));
        
        ArcDTO regularArc = new ArcDTO("arc1", "REGULAR", "p1", "t1");
        ArcDTO inhibitorArc = new ArcDTO("arc2", "INHIBITOR", "p2", "t1");
        ArcDTO bidirectionalArc = new ArcDTO("arc3", "BIDIRECTIONAL", "p3", "t1");
        ArcDTO regularArc2 = new ArcDTO("arc4", "REGULAR", "t2", "p1");
        
        PetriNetDTO petriNet = new PetriNetDTO(
            Arrays.asList(place1, place2, place3),
            Arrays.asList(transition1, transition2),
            Arrays.asList(regularArc, inhibitorArc, bidirectionalArc, regularArc2)
        );

        // When: Performing structural analysis
        AnalysisResultDTO result = analysisService.performStructuralAnalysis(petriNet);

        // Then: Should correctly count all arc types with no isolated elements
        assertNotNull(result);
        assertEquals("Structural Analysis", result.getAnalysisType());
        assertEquals(2, result.getRegularArcsCount());
        assertEquals(1, result.getInhibitorArcsCount());
        assertEquals(1, result.getBidirectionalArcsCount());
        assertEquals(0, result.getIsolatedPlacesCount());
        assertEquals(0, result.getIsolatedTransitionsCount());
        
        assertTrue(result.getDetails().contains("2 regular, 1 inhibitor, 1 bidirectional arcs"));
        assertTrue(result.getDetails().contains("0 isolated places, 0 isolated transitions"));
    }

    @Test
    void analyzeReachableStates_EmptyNet_ReturnsZeroStates() {
        // Given: An empty Petri net with no places, transitions, or arcs
        PetriNetDTO petriNet = new PetriNetDTO(
            Arrays.asList(),
            Arrays.asList(),
            Arrays.asList()
        );

        // When: Analyzing reachable states
        AnalysisResultDTO result = analysisService.analyzeReachableStates(petriNet);

        // Then: Should return only the initial state with no exploration needed
        assertNotNull(result);
        assertEquals("Reachable States", result.getAnalysisType());
        assertEquals(1, result.getReachableStatesCount()); // Only initial state
        assertEquals(1, result.getExploredStatesCount());
        assertFalse(result.isReachedMaxLimit());
    }

    @Test
    void analyzeLiveness_EmptyNet_ReturnsNoDeadlock() {
        // Given: An empty Petri net with no places, transitions, or arcs
        PetriNetDTO petriNet = new PetriNetDTO(
            Arrays.asList(),
            Arrays.asList(),
            Arrays.asList()
        );

        // When: Analyzing liveness
        AnalysisResultDTO result = analysisService.analyzeLiveness(petriNet);

        // Then: Should report no deadlock and no enabled transitions
        assertNotNull(result);
        assertEquals("Liveness Analysis", result.getAnalysisType());
        assertFalse(result.isHasDeadlock());
        assertEquals(0, result.getEnabledTransitionsCount());
    }

    @Test
    void analyzeBoundedness_EmptyNet_ReturnsZeroCounts() {
        // Given: An empty Petri net with no places, transitions, or arcs
        PetriNetDTO petriNet = new PetriNetDTO(
            Arrays.asList(),
            Arrays.asList(),
            Arrays.asList()
        );

        // When: Analyzing boundedness
        AnalysisResultDTO result = analysisService.analyzeBoundedness(petriNet);

        // Then: Should report zero counts for both bounded and unbounded places
        assertNotNull(result);
        assertEquals("Boundedness Analysis", result.getAnalysisType());
        assertEquals(0, result.getBoundedPlacesCount());
        assertEquals(0, result.getUnboundedPlacesCount());
    }

    @Test
    void computeIncidenceMatrix_EmptyNet_ReturnsEmptyMatrix() {
        // Given: An empty Petri net with no places, transitions, or arcs
        PetriNetDTO petriNet = new PetriNetDTO(
            Arrays.asList(),
            Arrays.asList(),
            Arrays.asList()
        );

        // When: Computing incidence matrix
        AnalysisResultDTO result = analysisService.computeIncidenceMatrix(petriNet);

        // Then: Should return empty matrix with correct dimensions
        assertNotNull(result);
        assertEquals("Incidence Matrix", result.getAnalysisType());
        assertNotNull(result.getIncidenceMatrix());
        assertEquals(0, result.getIncidenceMatrix().length);
        assertTrue(result.getDetails().contains("0 places × 0 transitions"));
    }

    @Test
    void performStructuralAnalysis_EmptyNet_ReturnsZeroCounts() {
        // Given: An empty Petri net with no places, transitions, or arcs
        PetriNetDTO petriNet = new PetriNetDTO(
            Arrays.asList(),
            Arrays.asList(),
            Arrays.asList()
        );

        // When: Performing structural analysis
        AnalysisResultDTO result = analysisService.performStructuralAnalysis(petriNet);

        // Then: Should report zero counts for all arc types and isolated elements
        assertNotNull(result);
        assertEquals("Structural Analysis", result.getAnalysisType());
        assertEquals(0, result.getRegularArcsCount());
        assertEquals(0, result.getInhibitorArcsCount());
        assertEquals(0, result.getBidirectionalArcsCount());
        assertEquals(0, result.getIsolatedPlacesCount());
        assertEquals(0, result.getIsolatedTransitionsCount());
    }

    @Test
    void analyzeReachableStates_ComplexNet_HandlesLargeStateSpace() {
        // Given: A complex Petri net with multiple places containing tokens and cyclic transitions
        List<PlaceDTO> places = Arrays.asList(
            new PlaceDTO("p1", 5, false, null),
            new PlaceDTO("p2", 3, false, null),
            new PlaceDTO("p3", 2, false, null)
        );
        
        List<TransitionDTO> transitions = Arrays.asList(
            new TransitionDTO("t1", false, Arrays.asList("arc1", "arc2")),
            new TransitionDTO("t2", false, Arrays.asList("arc3", "arc4")),
            new TransitionDTO("t3", false, Arrays.asList("arc5", "arc6"))
        );
        
        List<ArcDTO> arcs = Arrays.asList(
            new ArcDTO("arc1", "REGULAR", "p1", "t1"),
            new ArcDTO("arc2", "REGULAR", "t1", "p2"),
            new ArcDTO("arc3", "REGULAR", "p2", "t2"),
            new ArcDTO("arc4", "REGULAR", "t2", "p3"),
            new ArcDTO("arc5", "REGULAR", "p3", "t3"),
            new ArcDTO("arc6", "REGULAR", "t3", "p1")
        );
        
        PetriNetDTO petriNet = new PetriNetDTO(places, transitions, arcs);

        // When: Analyzing reachable states
        AnalysisResultDTO result = analysisService.analyzeReachableStates(petriNet);

        // Then: Should handle large state space and return valid results
        assertNotNull(result);
        assertEquals("Reachable States", result.getAnalysisType());
        assertTrue(result.getReachableStatesCount() > 0);
        assertTrue(result.getExploredStatesCount() > 0);
        // May or may not hit the limit depending on the implementation
        assertNotNull(result.getDetails());
    }
} 