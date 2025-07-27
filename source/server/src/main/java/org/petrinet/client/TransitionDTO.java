package org.petrinet.client;

import java.util.List;

public class TransitionDTO {

    private String id;
    private boolean enabled;

    private List<String> arcIds;



    public TransitionDTO(String id, boolean enabled, List<String> arcIds ) {
        this.id = id;
        this.enabled = enabled;
        this.arcIds = arcIds;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
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

    public void setArcIds(List<String> arcIds) {
        this.arcIds = arcIds;
    }
}
