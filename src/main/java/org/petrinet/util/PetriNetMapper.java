package org.petrinet.util;

import org.petrinet.client.ArcDTO;
import org.petrinet.client.PlaceDTO;
import org.petrinet.client.TransitionDTO;
import org.petrinet.service.model.Arc;
import org.petrinet.service.model.Place;
import org.petrinet.service.model.Transition;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

public class PetriNetMapper {


    public static Place dtoToPlace(PlaceDTO dto) {
        System.out.println("DEBUG Mapper: Mapping PlaceDTO (ID: " + dto.getId() + ", Tokens: " + dto.getTokens() + ", Bounded: " + dto.isBounded() + ", Capacity: " + dto.getCapacity() + ")");
        Place mappedPlace = new Place(dto.getId(), dto.getTokens(), dto.isBounded(), dto.getCapacity());
        System.out.println("DEBUG Mapper: Created Place Model (ID: " + mappedPlace.getId() + ", Tokens: " + mappedPlace.getTokens() + ", Bounded: " + mappedPlace.isBounded() + ", Capacity: " + mappedPlace.getCapacity() + ")");
        return mappedPlace;
    }

    public static Transition dtoToTransition(TransitionDTO dto) {
        return new Transition(dto.getId(), dto.getEnabled(), dto.getArcIds());
    }

    public static Arc dtoToArc(ArcDTO dto) {
        return switch (dto.getType()) {
            case "REGULAR" -> new Arc.RegularArc(dto.getId(), dto.getIncomingId(), dto.getOutgoingId());
            case "INHIBITOR" -> new Arc.InhibitorArc(dto.getId(), dto.getIncomingId(), dto.getOutgoingId());
            case "BIDIRECTIONAL" -> new Arc.BidirectionalArc(dto.getId(), dto.getIncomingId(), dto.getOutgoingId());
            default -> throw new IllegalArgumentException("Unexpected value of arc ID: " + dto.getId() + ", of type: "+ dto.getType() + ". Or,is an Unsupported arc type");
        };
    }

    public static List<Transition> dtoToTransitionList(List<TransitionDTO> dtos) {
        return dtos.stream()
                .map(PetriNetMapper::dtoToTransition)
                .collect(Collectors.toList());
    }

    public static Map<String, Place> mapPlacesToMap(List<PlaceDTO> placeDTOs) {
        return placeDTOs.stream()
                .map(PetriNetMapper::dtoToPlace)
                .collect(Collectors.toMap(Place::getId, place -> place));
    }

    public static Map<String, Arc> mapArcsToMap(List<ArcDTO> arcDTOs) {
        return arcDTOs.stream()
                .map(PetriNetMapper::dtoToArc)
                .collect(Collectors.toMap(Arc::getId, arc -> arc));
    }
}

