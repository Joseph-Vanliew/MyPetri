package org.petrinet.client;


public class PlaceDTO {
    private String id;
    private int tokens;

    public PlaceDTO(String id, int tokens) {
        this.id = id;
        this.tokens = tokens;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public int getTokens() {
        return tokens;
    }

    public void setTokens(int tokens) {
        this.tokens = tokens;
    }
}
