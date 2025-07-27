package org.petrinet.client;

public class ArcDTO {

    private String id;
    private String type;
    private String incomingId;
    private String outgoingId;

    public ArcDTO(String id, String type, String incomingId, String outgoingId) {
        this.id = id;
        this.type = type;
        this.incomingId = incomingId;
        this.outgoingId = outgoingId;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getIncomingId() {
        return incomingId;
    }

    public void setIncomingId(String incomingId) {
        this.incomingId = incomingId;
    }

    public String getOutgoingId() {
        return outgoingId;
    }

    public void setOutgoingId(String outgoingId) {
        this.outgoingId = outgoingId;
    }
}

