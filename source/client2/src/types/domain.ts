// Domain-specific types for Petri net elements and business logic

import type { ElementBase } from './common';

// Petri Net Element Types
export interface Place extends ElementBase {
  type: 'place';
  tokens: number;
  capacity?: number;
  bounded: boolean;
  radius: number;
}

export interface Transition extends ElementBase {
  type: 'transition';
  enabled: boolean;
  arcIds: string[];
}

export interface Arc extends ElementBase {
  type: 'arc';
  sourceId: string;
  targetId: string;
  weight: number;
  arcType: 'normal' | 'inhibitor' | 'reset';
}

export interface TextElement extends ElementBase {
  type: 'text';
  text: string;
  fontSize: number;
  fontFamily: string;
  color: string;
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
}

export interface ShapeElement extends ElementBase {
  type: 'shape';
  shapeType: 'rectangle' | 'circle' | 'triangle' | 'diamond';
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
}

// Union type for all elements
export type Element = Place | Transition | Arc | TextElement | ShapeElement;

// Simulation Types
export interface SimulationState {
  isRunning: boolean;
  isPaused: boolean;
  currentStep: number;
  maxSteps: number;
  speed: number;
  firedTransitions: string[];
  conflictingTransitions: string[];
  conflictResolutionMode: boolean;
}

export interface TokenAnimation {
  id: string;
  fromPlaceId: string;
  toPlaceId: string;
  startTime: number;
  duration: number;
  isActive: boolean;
}

// Validation Types
export interface ValidationConfig {
  inputPlaces: string[];
  outputPlaces: string[];
  maxTokens: number;
  maxSteps: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  steps: number;
  finalState: Record<string, number>; // placeId -> tokenCount
}

// Analysis Types
export interface AnalysisConfig {
  analysisType: 'reachability' | 'liveness' | 'boundedness' | 'safety';
  parameters: Record<string, any>;
}

export interface AnalysisResult {
  analysisType: string;
  result: any;
  metadata: {
    executionTime: number;
    timestamp: number;
  };
} 