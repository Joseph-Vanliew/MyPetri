package org.petrinet.service.model;

public abstract sealed class Arc permits Arc.RegularArc, Arc.InhibitorArc, Arc.BidirectionalArc{
    private String id;
    private String type;
    private String incomingId;
    private String outgoingId;

    public Arc() {
    }

    public Arc(String id, String type, String incomingId, String outgoingId) {
        this.id = id;
        this.type = type;
        this.incomingId = incomingId;
        this.outgoingId = outgoingId;
    }

    public String getId() {
        return id;
    }

    public String getType() {
        return type;
    }

    public String getIncomingId() {
        return incomingId;
    }

    public String getOutgoingId() {
        return outgoingId;
    }

    public void setOutgoingId(String outgoingId) {
        this.outgoingId = outgoingId;
    }

    public static final class RegularArc extends Arc {
        public RegularArc(String id, String incomingId, String outgoingId) {
            super(id, "REGULAR", incomingId, outgoingId);
        }
    }

    public static final class InhibitorArc extends Arc {
        public InhibitorArc(String id, String incomingId, String outgoingId) {
            super(id, "INHIBITOR", incomingId, outgoingId);
            }
        }

    public static final class BidirectionalArc extends Arc {
        public BidirectionalArc(String id, String incomingId, String outgoingId) {
            super(id, "BIDIRECTIONAL", incomingId, outgoingId);
        }
    }
}
