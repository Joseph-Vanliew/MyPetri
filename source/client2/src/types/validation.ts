// Validation types for form validation and error handling

// Form Validation
export interface ValidationRule<T = any> {
  required?: boolean;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: T) => boolean | string;
  message?: string;
}

export interface FormValidationResult<T = any> {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  value: T;
}

export interface FormValidation<T = Record<string, any>> {
  fields: Record<keyof T, ValidationRule>;
  validate: (data: T) => FormValidationResult<T>;
  validateField: (field: keyof T, value: any) => FormValidationResult<any>;
}

// Element Validation
export interface ElementValidationRule {
  type: 'place' | 'transition' | 'arc' | 'text' | 'shape';
  rules: {
    name?: ValidationRule<string>;
    position?: ValidationRule<{ x: number; y: number }>;
    size?: ValidationRule<{ width: number; height: number }>;
    [key: string]: ValidationRule<any> | undefined;
  };
}

export interface ElementValidationResult {
  elementId: string;
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Project Validation
export interface ProjectValidationRule {
  name: ValidationRule<string>;
  pages: ValidationRule<any[]>;
  elements: ValidationRule<any[]>;
}

export interface ProjectValidationResult {
  projectId: string;
  isValid: boolean;
  errors: string[];
  warnings: string[];
  elementResults: ElementValidationResult[];
}

// Petri Net Specific Validation
export interface PetriNetValidationRule {
  places: {
    tokens: ValidationRule<number>;
    capacity: ValidationRule<number>;
    radius: ValidationRule<number>;
  };
  transitions: {
    enabled: ValidationRule<boolean>;
  };
  arcs: {
    weight: ValidationRule<number>;
    sourceId: ValidationRule<string>;
    targetId: ValidationRule<string>;
  };
}

export interface PetriNetValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  placeResults: ElementValidationResult[];
  transitionResults: ElementValidationResult[];
  arcResults: ElementValidationResult[];
}

// Error Types
export interface ValidationError {
  type: 'validation' | 'business' | 'system';
  code: string;
  message: string;
  field?: string;
  elementId?: string;
  severity: 'error' | 'warning' | 'info';
}

export interface ValidationWarning {
  type: 'validation' | 'business' | 'system';
  code: string;
  message: string;
  field?: string;
  elementId?: string;
  suggestion?: string;
} 