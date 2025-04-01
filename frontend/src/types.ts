// src/types.ts

// --------------------------
// API Request/Response Types (Mirror Java DTOs)
// --------------------------

export const GRID_CELL_SIZE = 50; // Pixels per grid cell for aspect rations ranging from 16:9 to 21:9
export type GridPosition = { gridX: number; gridY: number };

export interface PetriNetDTO {
    places: {
        id: string;
        tokens: number;
        name?: string;
        x?: number;
        y?: number;
        radius?: number;
    }[];
    transitions: {
        id: string;
        enabled: boolean;
        arcIds: string[];
        name?: string;
        x?: number;
        y?: number;
        width?: number;
        height?: number;
    }[];
    arcs: {
        id: string;
        type: 'REGULAR' | 'INHIBITOR' | 'BIDIRECTIONAL';
        incomingId: string;
        outgoingId: string;
    }[];
    deterministicMode?: boolean;
    selectedTransitionId?: string;
    title?: string;
}

export interface PlaceDTO {
    id: string;
    tokens: number;
}

export interface TransitionDTO {
    id: string;
    enabled: boolean;
    arcIds: string[];
}

export interface ArcDTO {
    id: string;
    type: "REGULAR" | "INHIBITOR" | "BIDIRECTIONAL";
    incomingId: string;
    outgoingId: string;
}

// --------------------------
// UI State Types (Additional frontend-only fields)
// --------------------------
export interface UIPlace extends PlaceDTO {
    name: string,
    x: number;
    y: number;
    radius: number;
}

export interface UITransition extends TransitionDTO {
    name: string,
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface UIArc extends ArcDTO {

}

// --------------------------
// Validator Types
// --------------------------
export interface PlaceConfig {
    placeId: string;
    tokens: number;
}

export interface PetriNetValidationRequest {
    petriNet: PetriNetDTO;
    inputConfigs: PlaceConfig[];
    expectedOutputs: PlaceConfig[];
}

export interface ValidationResult {
    valid: boolean;
    message: string;
    conflictingTransitions?: string[];
    finalState?: PetriNetDTO;
    outputMatches?: Record<string, boolean>;
}