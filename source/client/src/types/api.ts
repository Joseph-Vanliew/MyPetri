// API Request/Response Types

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

export interface AnalysisResultDTO {
  analysisType: string;
  details: string;
  hasDeadlock?: boolean;
  reachableStatesCount?: number;
  exploredStatesCount?: number;
  reachedMaxLimit?: boolean;
  enabledTransitionsCount?: number;
  boundedPlacesCount?: number;
  unboundedPlacesCount?: number;
  incidenceMatrix?: number[][];
  regularArcsCount?: number;
  inhibitorArcsCount?: number;
  bidirectionalArcsCount?: number;
  isolatedPlacesCount?: number;
  isolatedTransitionsCount?: number;
  reachableStates?: string[];
} 