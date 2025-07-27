// Validation-related types

export interface PlaceConfig {
  placeId: string;
  tokens: number;
}

export interface PetriNetValidationRequest {
  petriNet: any; // Will be resolved in index.ts - PetriNetDTO
  inputConfigs: PlaceConfig[];
  expectedOutputs: PlaceConfig[];
}

export interface ValidationResult {
  valid: boolean;
  message?: string;
  errors?: string[];
  outputMatches?: Record<string, boolean>;
  finalState?: any; // Will be resolved in index.ts - PetriNetDTO
  conflictingTransitions?: string[];
}

export interface ValidatorPageConfig {
  inputConfigs: PlaceConfig[];
  outputConfigs: PlaceConfig[];
  validationResult: ValidationResult | null;
  emptyInputFields: {[index: number]: boolean};
  emptyOutputFields: {[index: number]: boolean};
} 