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