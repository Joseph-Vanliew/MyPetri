// Core Petri net domain types

export interface UIPlace {
  id: string;
  tokens: number;
  name: string;
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
  name: string;
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

export interface UITextBox {
    id: string;
    text: string;
    x: number;
    y: number;
    width: number;
    height: number;
    fontSize?: number;
    fontFamily?: string;
    color?: string;
    backgroundColor?: string;
    borderColor?: string;
    borderWidth?: number;
}

export interface PageSnapshot {
  places: UIPlace[];
  transitions: UITransition[];
  arcs: UIArc[];
  timestamp: number;
  description?: string;
}

export interface PetriNetPageData {
  id: string;
  title: string;
  places: UIPlace[];
  transitions: UITransition[];
  arcs: UIArc[];
  textBoxes: UITextBox[];
  deterministicMode: boolean;
  conflictResolutionMode: boolean;
  conflictingTransitions: string[];
  selectedElements: string[];
  history: {
    places: UIPlace[][];
    transitions: UITransition[][];
    arcs: UIArc[][];
    textBoxes: UITextBox[][];
    title: string[];
  };
  zoomLevel?: number;
  panOffset?: { x: number; y: number };
  validatorConfigs?: any; // Will be resolved in index.ts - ValidatorPageConfig
  snapshot?: PageSnapshot; // Snapshot of simulation state
}

export interface ProjectDTO {
  projectTitle: string;
  pages: Record<string, PetriNetPageData>;
  pageOrder: string[];
  activePageId: string | null;
  version?: string; // For future compatibility, e.g., "1.0.0"
} 