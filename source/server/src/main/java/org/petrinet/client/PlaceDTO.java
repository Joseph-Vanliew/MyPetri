package org.petrinet.client;


public class PlaceDTO {
    private String id;
    private int tokens;
    private boolean bounded = false; // Default to unbounded
    private Integer capacity = null; // Use Integer wrapper type to allow null

    public PlaceDTO() {
    }

    public PlaceDTO(String id, int tokens) {
        this(id, tokens, false, null);
    }

    public PlaceDTO(String id, int tokens, boolean bounded, Integer capacity) {
        this.id = id;
        this.tokens = tokens;
        this.setBounded(bounded); // Use setter to handle capacity consistency
        if (this.bounded) {
            this.setCapacity(capacity); // Use setter for validation
            // Ensure initial tokens don't exceed capacity
            if (this.capacity != null && this.tokens > this.capacity) {
                this.tokens = this.capacity;
            }
        }
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

    public boolean isBounded() {
        return bounded;
    }

    public void setBounded(boolean bounded) {
        this.bounded = bounded;
        if (!bounded) {
            this.capacity = null;
        }
    }

    public Integer getCapacity() {
        return capacity;
    }

    public void setCapacity(Integer capacity) {
        if (this.bounded) {
            // Only set capacity if bounded, ensure non-negative
            this.capacity = (capacity != null && capacity >= 0) ? capacity : 0;
            // Adjust current tokens if they now exceed the new capacity
            if (this.tokens > this.capacity) {
                this.tokens = this.capacity;
            }
        } else {
            // Should not set capacity if not bounded, keep it null
            this.capacity = null;
        }
    }
}
