package org.petrinet.client;

import java.util.List;

public class PetriNetDTO {
    private List<PlaceDTO> places;
    private List<TransitionDTO> transitions;
    private List<ArcDTO> arcs;
    private String selectedTransitionId;
    private Boolean deterministicMode;

    public PetriNetDTO() {}

    public PetriNetDTO(List<PlaceDTO> places, List<TransitionDTO> transitions, List<ArcDTO> arcs) {
        this.places = places;
        this.transitions = transitions;
        this.arcs = arcs;
    }

    public List<PlaceDTO> getPlaces() {
        return places;
    }

    public void setPlaces(List<PlaceDTO> places) {
        this.places = places;
    }

    public List<TransitionDTO> getTransitions() {
        return transitions;
    }

    public void setTransitions(List<TransitionDTO> transitions) {
        this.transitions = transitions;
    }

    public List<ArcDTO> getArcs() {
        return arcs;
    }

    public void setArcs(List<ArcDTO> arcs) {
        this.arcs = arcs;
    }
    
    public String getSelectedTransitionId() {
        return selectedTransitionId;
    }
    
    public void setSelectedTransitionId(String selectedTransitionId) {
        this.selectedTransitionId = selectedTransitionId;
    }
    
    public Boolean getDeterministicMode() {
        return deterministicMode;
    }
    
    public void setDeterministicMode(Boolean deterministicMode) {
        this.deterministicMode = deterministicMode;
    }
}
