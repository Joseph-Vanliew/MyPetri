package org.petrinet;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.petrinet.client.ArcDTO;
import org.petrinet.client.PlaceDTO;
import org.petrinet.client.TransitionDTO;
import org.petrinet.service.model.Arc;
import org.petrinet.service.model.Place;
import org.petrinet.service.model.Transition;
import org.petrinet.util.PetriNetMapper;

import java.util.List;
import java.util.Map;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.*;

public class MapperTest {

    static Stream<Arguments> arcProvider() {
        return Stream.of(
                Arguments.of("arc1", "REGULAR", "place1", "trans1", Arc.RegularArc.class, null),
                Arguments.of("arc2", "INHIBITOR", "place2", "trans2", Arc.InhibitorArc.class, null),
                Arguments.of("arc3", "BIDIRECTIONAL", "place3", "trans3", Arc.BidirectionalArc.class, null)
        );
    }

    static Stream<Arguments> arcDTOProvider() {
        return Stream.of(
                Arguments.of(List.of(), 0),
                Arguments.of(List.of(new ArcDTO("arc1", "REGULAR", "place1", "trans1")), 1),
                Arguments.of(List.of(
                        new ArcDTO("arc1", "REGULAR", "place1", "trans1"),
                        new ArcDTO("arc2", "INHIBITOR", "place2", "trans2"),
                        new ArcDTO("arc3", "BIDIRECTIONAL", "place3", "trans3")
                ), 3)
        );
    }

    static Stream<Arguments> transitionListProvider() {
        return Stream.of(
                Arguments.of(List.of(), 0),
                Arguments.of(List.of(new TransitionDTO("id1", true, List.of("arc1", "arc2"))), 1),
                Arguments.of(List.of(
                        new TransitionDTO("id1", true, List.of("arc1", "arc2")),
                        new TransitionDTO("id2", false, List.of("arc3", "arc4"))
                ), 2)
        );
    }

    static Stream<Arguments> placeDTOProvider() {
        return Stream.of(
                Arguments.of(List.of(), 0),
                Arguments.of(List.of(new PlaceDTO("id1", 5)), 1),
                Arguments.of(List.of(
                        new PlaceDTO("id1", 5),
                        new PlaceDTO("id2", 10)
                ), 2)
        );
    }

    @ParameterizedTest
    @MethodSource("arcProvider")
    void testDtoToArc(String id, String type, String incomingId, String outgoingId,
                      Class<?> expectedType, String expectedMessage) {
        ArcDTO dto = new ArcDTO(id, type, incomingId, outgoingId);
        if (expectedType != null) {
            Arc arc = PetriNetMapper.dtoToArc(dto);
            assertTrue(expectedType.isInstance(arc), "Arc should be an instance of " + expectedType.getSimpleName());
            assertEquals(id, arc.getId(), "Arc ID should match");
            assertEquals(incomingId, arc.getIncomingId(), "Incoming ID should match");
            assertEquals(outgoingId, arc.getOutgoingId(), "Outgoing ID should match");
        } else {
            Exception exception = assertThrows(IllegalArgumentException.class, () -> PetriNetMapper.dtoToArc(dto));
            assertEquals(expectedMessage, exception.getMessage(), "IllegalArgumentException for unknown arc types");
        }
    }

    @ParameterizedTest
    @MethodSource("transitionListProvider")
    void testDtoToTransitionList(List<TransitionDTO> dtos, int expectedSize) {
        List<Transition> transitions = PetriNetMapper.dtoToTransitionList(dtos);

        assertEquals(expectedSize, transitions.size(), "The size of the transition list should match");

        for (int i = 0; i < dtos.size(); i++) {
            TransitionDTO dto = dtos.get(i);
            Transition transition = transitions.get(i);

            assertEquals(dto.getId(), transition.getId(), "Transition ID should match");
            assertEquals(dto.getEnabled(), transition.getEnabled(), "Transition enabled state should match");
            assertEquals(dto.getArcIds(), transition.getArcIds(), "Transition arcIds should match");
        }
    }

    @ParameterizedTest
    @MethodSource("placeDTOProvider")
    void testMapPlacesToMap(List<PlaceDTO> placeDTOs, int expectedSize) {
        Map<String, Place> placesMap = PetriNetMapper.mapPlacesToMap(placeDTOs);

        assertEquals(expectedSize, placesMap.size(), "The size of the places map should match the expected size.");

        placeDTOs.forEach(dto -> {
            assertTrue(placesMap.containsKey(dto.getId()), "Map should contain key for DTO ID: " + dto.getId());
            Place place = placesMap.get(dto.getId());
            assertEquals(dto.getTokens(), place.getTokens(), "Tokens count should match for ID: " + dto.getId());
        });
    }

    @ParameterizedTest
    @MethodSource("arcDTOProvider")
    void testMapArcsToMap(List<ArcDTO> arcDTOs, int expectedSize) {
        // Assuming that the UNKNOWN type should throw an exception
        if (arcDTOs.stream().anyMatch(dto -> dto.getType().equals("UNKNOWN"))) {
            assertThrows(IllegalArgumentException.class, () -> PetriNetMapper.mapArcsToMap(arcDTOs),
                    "Should throw an exception for unknown arc types");
        } else {
            Map<String, Arc> arcsMap = PetriNetMapper.mapArcsToMap(arcDTOs);

            assertEquals(expectedSize, arcsMap.size(), "The size of the arcs map should match the expected size.");

            // Verifying each DTO was transformed correctly to the map
            arcDTOs.forEach(dto -> {
                assertTrue(arcsMap.containsKey(dto.getId()), "Map should contain key for DTO ID: " + dto.getId());
                Arc arc = arcsMap.get(dto.getId());
                assertEquals(dto.getId(), arc.getId(), "Arc ID should match");
                assertEquals(dto.getIncomingId(), arc.getIncomingId(), "Arc incomingId should match");
                assertEquals(dto.getOutgoingId(), arc.getOutgoingId(), "Arc outgoingId should match");

                switch (dto.getType().toUpperCase()) {
                    case "REGULAR":
                        assertInstanceOf(Arc.RegularArc.class, arc, "arc: " + arc.getId() + ", is  an instance of a RegularArc");
                        break;
                    case "INHIBITOR":
                        assertInstanceOf(Arc.InhibitorArc.class, arc,  "arc: " + arc.getId() + ", is  an instance of a InhibitorArc");
                        break;
                    case "BIDIRECTIONAL":
                        assertInstanceOf(Arc.BidirectionalArc.class, arc, "arc: " + arc.getId() + ", is  an instance of a BidirectionalArc");
                        break;
                    default:
                        throw new IllegalArgumentException("Unknown arc type: " + dto.getType() + "ID: " + dto.getId());
                }
            });
        }
    }
}



