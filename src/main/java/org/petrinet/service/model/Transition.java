package org.petrinet.service.model;

import java.util.ArrayList;
import java.util.List;

public class Transition {

    private final String id;
    boolean enabled;
    private final List<String> arcIds;

    public Transition(String id, boolean enabled, List<String> arcIds) {
        this.id = id;
        this.enabled = enabled;
        this.arcIds = new ArrayList<>(arcIds);
    }

    public String getId() {
        return id;
    }

    public boolean getEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public List<String> getArcIds() {
        return arcIds;
    }

}
