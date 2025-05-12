// src/types.ts


export const GRID_CELL_SIZE = 50; // Pixels per grid cell for aspect rations ranging from 16:9 to 21:9
export type GridPosition = { gridX: number; gridY: number };


// --------------------------
// API Request/Response Types 
// --------------------------
export interface PetriNetDTO {
    places: {
        id: string;
        tokens: number;
        name?: string;
        x?: number;
        y?: number;
        radius?: number;
        bounded?: boolean;
        capacity?: number | null;
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
    zoomLevel?: number;
    panOffset?: { x: number; y: number };
}

// --------------------------
// UI State Types 
// --------------------------
export interface UIPlace {
    id: string;
    tokens: number;
    name: string,
    x: number;
    y: number;
    radius: number;
    bounded: boolean;
    capacity: number | null;
}

export interface UITransition {
    id: string;
    enabled: boolean;
    arcIds: string[];
    name: string,
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface UIArc {
    id: string;
    type: 'REGULAR' | 'INHIBITOR' | 'BIDIRECTIONAL';
    incomingId: string;
    outgoingId: string;
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
    message?: string;
    errors?: string[];
    outputMatches?: Record<string, boolean>;
    finalState?: PetriNetDTO;
    conflictingTransitions?: string[];
}

export interface ValidatorPageConfig {
    inputConfigs: PlaceConfig[];
    outputConfigs: PlaceConfig[];
    validationResult: ValidationResult | null;
    emptyInputFields: {[index: number]: boolean};
    emptyOutputFields: {[index: number]: boolean};
}

// --------------------------
// Page and project data types
// --------------------------
export interface PetriNetPageData {
    id: string;
    title: string;
    places: UIPlace[];
    transitions: UITransition[];
    arcs: UIArc[];
    deterministicMode: boolean; 
    conflictResolutionMode: boolean;
    conflictingTransitions: string[];
    selectedElements: string[];
    history: {
        places: UIPlace[][];
        transitions: UITransition[][];
        arcs: UIArc[][];
        title: string[];
    };
    zoomLevel?: number;
    panOffset?: { x: number; y: number };
    validatorConfigs?: ValidatorPageConfig;
}

export interface ProjectDTO {
    projectTitle: string;
    pages: Record<string, PetriNetPageData>;
    pageOrder: string[];
    activePageId: string | null;
    version?: string; // For future compatibility, e.g., "1.0.0"
}