import React from 'react';
import type { ElementBase } from '../../../types/common.js';
import type { Place, Transition, Arc, TextElement, ShapeElement } from '../../../types/domain.js';
import type { ElementBehavior } from './ElementRegistry.js';
import { 
  ELEMENT_TYPES, 
  ELEMENT_DEFAULT_SIZES, 
  ELEMENT_MIN_SIZES, 
  ELEMENT_MAX_SIZES 
} from './ElementTypes.js';

// Place behavior
export const placeBehavior: ElementBehavior = {
  // Rendering - will be implemented in Place.tsx
  render: (element: ElementBase) => {
    // This will be replaced with actual Place component
    return React.createElement('div', { key: element.id }, 'Place');
  },

  // Creation
  createDefault: (position: { x: number; y: number }): Place => ({
    id: `place_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: 'place',
    x: position.x,
    y: position.y,
    width: ELEMENT_DEFAULT_SIZES[ELEMENT_TYPES.PLACE].width,
    height: ELEMENT_DEFAULT_SIZES[ELEMENT_TYPES.PLACE].height,
    tokens: 0,
    capacity: undefined,
    name: 'Place',
    isSelected: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    bounded: false,
    radius: 30,
  }),

  // Properties
  getDefaultSize: () => ELEMENT_DEFAULT_SIZES[ELEMENT_TYPES.PLACE],
  getMinSize: () => ELEMENT_MIN_SIZES[ELEMENT_TYPES.PLACE],
  getMaxSize: () => ELEMENT_MAX_SIZES[ELEMENT_TYPES.PLACE],

  // Validation
  validate: (element: ElementBase): { isValid: boolean; errors: string[] } => {
    const place = element as Place;
    const errors: string[] = [];

    if (place.tokens < 0) {
      errors.push('Token count cannot be negative');
    }

    if (place.capacity !== undefined && place.capacity <= 0) {
      errors.push('Capacity must be positive');
    }

    if (place.capacity !== undefined && place.tokens > place.capacity) {
      errors.push('Token count cannot exceed capacity');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  },
};

// Transition behavior
export const transitionBehavior: ElementBehavior = {
  // Rendering - will be implemented in Transition.tsx
  render: (element: ElementBase) => {
    // This will be replaced with actual Transition component
    return React.createElement('div', { key: element.id }, 'Transition');
  },

  // Creation
  createDefault: (position: { x: number; y: number }): Transition => ({
    id: `transition_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: 'transition',
    x: position.x,
    y: position.y,
    width: ELEMENT_DEFAULT_SIZES[ELEMENT_TYPES.TRANSITION].width,
    height: ELEMENT_DEFAULT_SIZES[ELEMENT_TYPES.TRANSITION].height,
    name: 'Transition',
    isSelected: false,
    enabled: false,
    arcIds: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }),

  // Properties
  getDefaultSize: () => ELEMENT_DEFAULT_SIZES[ELEMENT_TYPES.TRANSITION],
  getMinSize: () => ELEMENT_MIN_SIZES[ELEMENT_TYPES.TRANSITION],
  getMaxSize: () => ELEMENT_MAX_SIZES[ELEMENT_TYPES.TRANSITION],

  // Validation
  validate: (element: ElementBase): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    // No specific validation for transitions yet
    // element parameter will be used for validation logic later
    if (element.type !== 'transition') {
      errors.push('Invalid element type for transition validation');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  },
};

// Arc behavior
export const arcBehavior: ElementBehavior = {
  // Rendering - will be implemented in Arc.tsx
  render: (element: ElementBase) => {
    // This will be replaced with actual Arc component
    return React.createElement('div', { key: element.id }, 'Arc');
  },

  // Creation
  createDefault: (position: { x: number; y: number }): Arc => ({
    id: `arc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: 'arc',
    x: position.x,
    y: position.y,
    width: ELEMENT_DEFAULT_SIZES[ELEMENT_TYPES.ARC].width,
    height: ELEMENT_DEFAULT_SIZES[ELEMENT_TYPES.ARC].height,
    name: 'Arc',
    isSelected: false,
    sourceId: '',
    targetId: '',
    weight: 1,
    arcType: 'normal' as const, // Can be 'normal', 'inhibitor', 'reset', or 'bidirectional'
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }),

  // Properties
  getDefaultSize: () => ELEMENT_DEFAULT_SIZES[ELEMENT_TYPES.ARC],
  getMinSize: () => ELEMENT_MIN_SIZES[ELEMENT_TYPES.ARC],
  getMaxSize: () => ELEMENT_MAX_SIZES[ELEMENT_TYPES.ARC],

  // Validation
  validate: (element: ElementBase): { isValid: boolean; errors: string[] } => {
    const arc = element as Arc;
    const errors: string[] = [];

    if (!arc.sourceId) {
      errors.push('Arc must have a source element');
    }

    if (!arc.targetId) {
      errors.push('Arc must have a target element');
    }

    if (arc.sourceId === arc.targetId) {
      errors.push('Arc cannot connect an element to itself');
    }

    if (arc.weight <= 0) {
      errors.push('Arc weight must be positive');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  },
};

// Text behavior
export const textBehavior: ElementBehavior = {
  // Rendering - will be implemented in Text.tsx
  render: (element: ElementBase) => {
    // This will be replaced with actual Text component
    return React.createElement('div', { key: element.id }, 'Text');
  },

  // Creation
  createDefault: (position: { x: number; y: number }): TextElement => ({
    id: `text_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: 'text',
    x: position.x,
    y: position.y,
    width: ELEMENT_DEFAULT_SIZES[ELEMENT_TYPES.TEXT].width,
    height: ELEMENT_DEFAULT_SIZES[ELEMENT_TYPES.TEXT].height,
    name: 'Text',
    isSelected: false,
    text: 'Text',
    fontSize: 12,
    fontFamily: 'Arial',
    color: '#000000',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }),

  // Properties
  getDefaultSize: () => ELEMENT_DEFAULT_SIZES[ELEMENT_TYPES.TEXT],
  getMinSize: () => ELEMENT_MIN_SIZES[ELEMENT_TYPES.TEXT],
  getMaxSize: () => ELEMENT_MAX_SIZES[ELEMENT_TYPES.TEXT],

  // Validation
  validate: (element: ElementBase): { isValid: boolean; errors: string[] } => {
    const text = element as TextElement;
    const errors: string[] = [];

    if (!text.text.trim()) {
      errors.push('Text cannot be empty');
    }

    if (text.fontSize <= 0) {
      errors.push('Font size must be positive');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  },
};

// Shape behavior
export const shapeBehavior: ElementBehavior = {
  // Rendering - will be implemented in Shape.tsx
  render: (element: ElementBase) => {
    // This will be replaced with actual Shape component
    return React.createElement('div', { key: element.id }, 'Shape');
  },

  // Creation
  createDefault: (position: { x: number; y: number }): ShapeElement => ({
    id: `shape_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: 'shape',
    x: position.x,
    y: position.y,
    width: ELEMENT_DEFAULT_SIZES[ELEMENT_TYPES.SHAPE].width,
    height: ELEMENT_DEFAULT_SIZES[ELEMENT_TYPES.SHAPE].height,
    name: 'Shape',
    isSelected: false,
    shapeType: 'rectangle',
    fillColor: '#ffffff',
    strokeColor: '#000000',
    strokeWidth: 1,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }),

  // Properties
  getDefaultSize: () => ELEMENT_DEFAULT_SIZES[ELEMENT_TYPES.SHAPE],
  getMinSize: () => ELEMENT_MIN_SIZES[ELEMENT_TYPES.SHAPE],
  getMaxSize: () => ELEMENT_MAX_SIZES[ELEMENT_TYPES.SHAPE],

  // Validation
  validate: (element: ElementBase): { isValid: boolean; errors: string[] } => {
    const shape = element as ShapeElement;
    const errors: string[] = [];

    if (shape.strokeWidth < 0) {
      errors.push('Stroke width cannot be negative');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  },
};

// Helper function to create bidirectional arc
export const createBidirectionalArc = (position: { x: number; y: number }): Arc => ({
  id: `arc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  type: 'arc',
  x: position.x,
  y: position.y,
  width: ELEMENT_DEFAULT_SIZES[ELEMENT_TYPES.ARC].width,
  height: ELEMENT_DEFAULT_SIZES[ELEMENT_TYPES.ARC].height,
  name: 'Bidirectional Arc',
  isSelected: false,
  sourceId: '',
  targetId: '',
  weight: 1,
  arcType: 'bidirectional',
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

// Behavior map for easy access
export const elementBehaviors: Record<string, ElementBehavior> = {
  [ELEMENT_TYPES.PLACE]: placeBehavior,
  [ELEMENT_TYPES.TRANSITION]: transitionBehavior,
  [ELEMENT_TYPES.ARC]: arcBehavior,
  [ELEMENT_TYPES.TEXT]: textBehavior,
  [ELEMENT_TYPES.SHAPE]: shapeBehavior,
}; 