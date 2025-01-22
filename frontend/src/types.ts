// src/types.ts

// --------------------------
// API Request/Response Types (Mirror Java DTOs)
// --------------------------

export const GRID_CELL_SIZE = 50; // Pixels per grid cell
export type GridPosition = { gridX: number; gridY: number };

export interface PetriNetDTO {
    places: PlaceDTO[];
    transitions: TransitionDTO[];
    arcs: ArcDTO[];
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
    incomingId: string; // Matches Java field name
    outgoingId: string; // Matches Java field name
}

// --------------------------
// UI State Types (Additional frontend-only fields)
// --------------------------
export interface UIPlace extends PlaceDTO {
    x: number;  // Canvas position (not sent to backend)
    y: number;
}

export interface UITransition extends TransitionDTO {
    x: number;  // Canvas position (not sent to backend)
    y: number;
}

export interface UIArc extends ArcDTO {
    // No extra fields needed, but could add UI-specific props later
}