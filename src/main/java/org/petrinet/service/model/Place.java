package org.petrinet.service.model;

public class Place {
    private final String id;
    private int tokens;

    public Place(String id, int tokens) {
        this.id = id;
        this.tokens = tokens;
    }

    //Getters and Setters

    public String getId() {
        return id;
    }

    public int getTokens() {
        return tokens;
    }

    public void setTokens(int tokens) {
        this.tokens = Math.max(0, tokens); // Ensure tokens can't be negative
    }

    public void addToken () {
        this.tokens++;
    }
    public void removeTokens () {
        if(this.tokens > 0) {
            this.tokens--;
        }
    }
}
