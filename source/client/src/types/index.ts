// Main types index - exports all types from organized files

// Common types and constants
export * from './common';

// Core domain types
export * from './domain';

// API types
export * from './api';

// Validation types
export * from './validation';

// Simulation types
export * from './simulation';

// UI types
export * from './ui';

export type { 
  UIPlace, 
  UITransition, 
  UIArc, 
  PetriNetPageData, 
  ProjectDTO,
  PageSnapshot 
} from './domain';

export type { 
  PetriNetDTO 
} from './api';

export type { 
  ValidationResult, 
  ValidatorPageConfig,
  PlaceConfig,
  PetriNetValidationRequest 
} from './validation';

export type { 
  ITokenAnimator, 
  UseSimulationProps 
} from './simulation';

// Default values and utilities
export const createDefaultPageData = (id: string, title: string): PetriNetPageData => ({
  id,
  title,
      places: [],
    transitions: [],
    arcs: [],
    textBoxes: [],
    deterministicMode: false,
  conflictResolutionMode: false,
  conflictingTransitions: [],
  selectedElements: [],
      history: { places: [], transitions: [], arcs: [], textBoxes: [], title: [] },
  zoomLevel: 1,
  panOffset: { x: 0, y: 0 }
});

import { PetriNetPageData } from './domain'; 