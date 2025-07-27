package org.petrinet.client;

import java.util.List;

/**
 * Data Transfer Object for Petri net analysis results.
 * Contains the results of various analysis operations performed on Petri nets.
 */
public class AnalysisResultDTO {
    private String analysisType;
    private String details;
    private boolean hasDeadlock;
    private int reachableStatesCount;
    private int exploredStatesCount;
    private boolean reachedMaxLimit;
    private int enabledTransitionsCount;
    private int boundedPlacesCount;
    private int unboundedPlacesCount;
    private int[][] incidenceMatrix;
    private int regularArcsCount;
    private int inhibitorArcsCount;
    private int bidirectionalArcsCount;
    private int isolatedPlacesCount;
    private int isolatedTransitionsCount;
    private List<String> reachableStates;

    // Constructors
    public AnalysisResultDTO() {}

    public AnalysisResultDTO(String analysisType, String details) {
        this.analysisType = analysisType;
        this.details = details;
    }

    // Getters and Setters
    public String getAnalysisType() {
        return analysisType;
    }

    public void setAnalysisType(String analysisType) {
        this.analysisType = analysisType;
    }

    public String getDetails() {
        return details;
    }

    public void setDetails(String details) {
        this.details = details;
    }

    public boolean isHasDeadlock() {
        return hasDeadlock;
    }

    public void setHasDeadlock(boolean hasDeadlock) {
        this.hasDeadlock = hasDeadlock;
    }

    public int getReachableStatesCount() {
        return reachableStatesCount;
    }

    public void setReachableStatesCount(int reachableStatesCount) {
        this.reachableStatesCount = reachableStatesCount;
    }

    public int getExploredStatesCount() {
        return exploredStatesCount;
    }

    public void setExploredStatesCount(int exploredStatesCount) {
        this.exploredStatesCount = exploredStatesCount;
    }

    public boolean isReachedMaxLimit() {
        return reachedMaxLimit;
    }

    public void setReachedMaxLimit(boolean reachedMaxLimit) {
        this.reachedMaxLimit = reachedMaxLimit;
    }

    public int getEnabledTransitionsCount() {
        return enabledTransitionsCount;
    }

    public void setEnabledTransitionsCount(int enabledTransitionsCount) {
        this.enabledTransitionsCount = enabledTransitionsCount;
    }

    public int getBoundedPlacesCount() {
        return boundedPlacesCount;
    }

    public void setBoundedPlacesCount(int boundedPlacesCount) {
        this.boundedPlacesCount = boundedPlacesCount;
    }

    public int getUnboundedPlacesCount() {
        return unboundedPlacesCount;
    }

    public void setUnboundedPlacesCount(int unboundedPlacesCount) {
        this.unboundedPlacesCount = unboundedPlacesCount;
    }

    public int[][] getIncidenceMatrix() {
        return incidenceMatrix;
    }

    public void setIncidenceMatrix(int[][] incidenceMatrix) {
        this.incidenceMatrix = incidenceMatrix;
    }

    public int getRegularArcsCount() {
        return regularArcsCount;
    }

    public void setRegularArcsCount(int regularArcsCount) {
        this.regularArcsCount = regularArcsCount;
    }

    public int getInhibitorArcsCount() {
        return inhibitorArcsCount;
    }

    public void setInhibitorArcsCount(int inhibitorArcsCount) {
        this.inhibitorArcsCount = inhibitorArcsCount;
    }

    public int getBidirectionalArcsCount() {
        return bidirectionalArcsCount;
    }

    public void setBidirectionalArcsCount(int bidirectionalArcsCount) {
        this.bidirectionalArcsCount = bidirectionalArcsCount;
    }

    public int getIsolatedPlacesCount() {
        return isolatedPlacesCount;
    }

    public void setIsolatedPlacesCount(int isolatedPlacesCount) {
        this.isolatedPlacesCount = isolatedPlacesCount;
    }

    public int getIsolatedTransitionsCount() {
        return isolatedTransitionsCount;
    }

    public void setIsolatedTransitionsCount(int isolatedTransitionsCount) {
        this.isolatedTransitionsCount = isolatedTransitionsCount;
    }

    public List<String> getReachableStates() {
        return reachableStates;
    }

    public void setReachableStates(List<String> reachableStates) {
        this.reachableStates = reachableStates;
    }
} 