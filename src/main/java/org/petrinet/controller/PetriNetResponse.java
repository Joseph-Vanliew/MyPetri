package org.petrinet.controller;

import org.petrinet.client.ArcDTO;

import org.petrinet.client.PlaceDTO;
import org.petrinet.client.TransitionDTO;

import java.util.List;

public class PetriNetResponse {
    private List<TransitionDTO> transitions;
    private List<PlaceDTO> places;
    private List<ArcDTO> arcs;

}
