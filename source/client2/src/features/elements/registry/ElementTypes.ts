import type { ElementType } from '../../../types/common.js';

// Element type constants
export const ELEMENT_TYPES = {
  PLACE: 'place' as const,
  TRANSITION: 'transition' as const,
  ARC: 'arc' as const,
  TEXT: 'text' as const,
  SHAPE: 'shape' as const,
} as const;

// Element type array for easy iteration
export const ELEMENT_TYPE_ARRAY: ElementType[] = [
  ELEMENT_TYPES.PLACE,
  ELEMENT_TYPES.TRANSITION,
  ELEMENT_TYPES.ARC,
  ELEMENT_TYPES.TEXT,
  ELEMENT_TYPES.SHAPE,
];

// Element display names
export const ELEMENT_DISPLAY_NAMES: Record<ElementType, string> = {
  [ELEMENT_TYPES.PLACE]: 'Place',
  [ELEMENT_TYPES.TRANSITION]: 'Transition',
  [ELEMENT_TYPES.ARC]: 'Arc',
  [ELEMENT_TYPES.TEXT]: 'Text',
  [ELEMENT_TYPES.SHAPE]: 'Shape',
};

// Element descriptions
export const ELEMENT_DESCRIPTIONS: Record<ElementType, string> = {
  [ELEMENT_TYPES.PLACE]: 'A place that can hold tokens',
  [ELEMENT_TYPES.TRANSITION]: 'A transition that can fire when enabled',
  [ELEMENT_TYPES.ARC]: 'A connection between places and transitions (supports normal, inhibitor, reset, and bidirectional)',
  [ELEMENT_TYPES.TEXT]: 'Text element for annotations',
  [ELEMENT_TYPES.SHAPE]: 'Geometric shape for diagrams',
};

// Element icons (placeholder - we'll add actual icons later)
export const ELEMENT_ICONS: Record<ElementType, string> = {
  [ELEMENT_TYPES.PLACE]: '⭕',
  [ELEMENT_TYPES.TRANSITION]: '⬜',
  [ELEMENT_TYPES.ARC]: '➖',
  [ELEMENT_TYPES.TEXT]: 'T',
  [ELEMENT_TYPES.SHAPE]: '⬟',
};

// Default sizes for each element type
export const ELEMENT_DEFAULT_SIZES: Record<ElementType, { width: number; height: number }> = {
  [ELEMENT_TYPES.PLACE]: { width: 60, height: 60 },
  [ELEMENT_TYPES.TRANSITION]: { width: 40, height: 40 },
  [ELEMENT_TYPES.ARC]: { width: 100, height: 2 },
  [ELEMENT_TYPES.TEXT]: { width: 80, height: 20 },
  [ELEMENT_TYPES.SHAPE]: { width: 50, height: 50 },
};

// Minimum sizes for each element type
export const ELEMENT_MIN_SIZES: Record<ElementType, { width: number; height: number }> = {
  [ELEMENT_TYPES.PLACE]: { width: 30, height: 30 },
  [ELEMENT_TYPES.TRANSITION]: { width: 20, height: 20 },
  [ELEMENT_TYPES.ARC]: { width: 10, height: 1 },
  [ELEMENT_TYPES.TEXT]: { width: 20, height: 10 },
  [ELEMENT_TYPES.SHAPE]: { width: 20, height: 20 },
};

// Maximum sizes for each element type
export const ELEMENT_MAX_SIZES: Record<ElementType, { width: number; height: number }> = {
  [ELEMENT_TYPES.PLACE]: { width: 200, height: 200 },
  [ELEMENT_TYPES.TRANSITION]: { width: 150, height: 150 },
  [ELEMENT_TYPES.ARC]: { width: 1000, height: 10 },
  [ELEMENT_TYPES.TEXT]: { width: 500, height: 100 },
  [ELEMENT_TYPES.SHAPE]: { width: 300, height: 300 },
};

// Element categories for grouping in UI
export const ELEMENT_CATEGORIES = {
  PETRI_NET: 'PETRI_NET',
  ANNOTATION: 'ANNOTATION',
  DECORATION: 'DECORATION',
} as const;

export const ELEMENT_CATEGORY_NAMES: Record<string, string> = {
  [ELEMENT_CATEGORIES.PETRI_NET]: 'Petri Net Elements',
  [ELEMENT_CATEGORIES.ANNOTATION]: 'Annotations',
  [ELEMENT_CATEGORIES.DECORATION]: 'Decorations',
};

// Element type to category mapping
export const ELEMENT_TYPE_CATEGORIES: Record<ElementType, string> = {
  [ELEMENT_TYPES.PLACE]: ELEMENT_CATEGORIES.PETRI_NET,
  [ELEMENT_TYPES.TRANSITION]: ELEMENT_CATEGORIES.PETRI_NET,
  [ELEMENT_TYPES.ARC]: ELEMENT_CATEGORIES.PETRI_NET,
  [ELEMENT_TYPES.TEXT]: ELEMENT_CATEGORIES.ANNOTATION,
  [ELEMENT_TYPES.SHAPE]: ELEMENT_CATEGORIES.DECORATION,
};

// Helper function to get elements by category
export const getElementsByCategory = (category: string): ElementType[] => {
  return ELEMENT_TYPE_ARRAY.filter(type => ELEMENT_TYPE_CATEGORIES[type] === category);
};

// Helper function to get category for an element type
export const getElementCategory = (type: ElementType): string => {
  return ELEMENT_TYPE_CATEGORIES[type];
}; 