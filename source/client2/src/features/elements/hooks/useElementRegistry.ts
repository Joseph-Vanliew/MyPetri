import { useCallback, useMemo } from 'react';
import { elementRegistry } from '../registry/ElementRegistry.js';
import { elementBehaviors } from '../registry/ElementBehaviors.js';
import { 
  ELEMENT_TYPE_ARRAY, 
  ELEMENT_DISPLAY_NAMES, 
  ELEMENT_DESCRIPTIONS,
  ELEMENT_ICONS,
  ELEMENT_DEFAULT_SIZES,
  ELEMENT_MIN_SIZES,
  ELEMENT_MAX_SIZES,
  getElementsByCategory,
  getElementCategory
} from '../registry/ElementTypes.js';
import type { ElementType, ElementBase } from '../../../types/common.js';

// Initialize the registry with all behaviors
const initializeRegistry = () => {
  ELEMENT_TYPE_ARRAY.forEach(type => {
    if (!elementRegistry.isRegistered(type)) {
      elementRegistry.register(type, elementBehaviors[type]);
    }
  });
};

// Initialize on module load
initializeRegistry();

export const useElementRegistry = () => {
  // Get all registered element types
  const registeredTypes = useMemo(() => elementRegistry.getRegisteredTypes(), []);

  // Get elements by category
  const getElementsByCategoryCallback = useCallback((category: string) => {
    return getElementsByCategory(category);
  }, []);

  // Get category for an element type
  const getElementCategoryCallback = useCallback((type: ElementType) => {
    return getElementCategory(type);
  }, []);

  // Create a default element
  const createDefaultElement = useCallback((type: ElementType, position: { x: number; y: number }) => {
    return elementRegistry.createDefaultElement(type, position);
  }, []);

  // Validate an element
  const validateElement = useCallback((element: ElementBase) => {
    return elementRegistry.validateElement(element);
  }, []);

  // Get default size for an element type
  const getDefaultSize = useCallback((type: ElementType) => {
    return elementRegistry.getDefaultSize(type);
  }, []);

  // Get min size for an element type
  const getMinSize = useCallback((type: ElementType) => {
    return elementRegistry.getMinSize(type);
  }, []);

  // Get max size for an element type
  const getMaxSize = useCallback((type: ElementType) => {
    return elementRegistry.getMaxSize(type);
  }, []);

  // Check if an element type is registered
  const isRegistered = useCallback((type: ElementType) => {
    return elementRegistry.isRegistered(type);
  }, []);

  // Get element info
  const getElementInfo = useCallback((type: ElementType) => {
    return {
      type,
      displayName: ELEMENT_DISPLAY_NAMES[type],
      description: ELEMENT_DESCRIPTIONS[type],
      icon: ELEMENT_ICONS[type],
      defaultSize: ELEMENT_DEFAULT_SIZES[type],
      minSize: ELEMENT_MIN_SIZES[type],
      maxSize: ELEMENT_MAX_SIZES[type],
      category: getElementCategory(type),
    };
  }, []);

  // Get all element info
  const getAllElementInfo = useMemo(() => {
    return registeredTypes.map(type => getElementInfo(type));
  }, [registeredTypes, getElementInfo]);

  return {
    // Registry state
    registeredTypes,
    getAllElementInfo,
    
    // Utility functions
    getElementsByCategory: getElementsByCategoryCallback,
    getElementCategory: getElementCategoryCallback,
    createDefaultElement,
    validateElement,
    getDefaultSize,
    getMinSize,
    getMaxSize,
    isRegistered,
    getElementInfo,
    
    // Direct access to constants
    ELEMENT_DISPLAY_NAMES,
    ELEMENT_DESCRIPTIONS,
    ELEMENT_ICONS,
    ELEMENT_DEFAULT_SIZES,
    ELEMENT_MIN_SIZES,
    ELEMENT_MAX_SIZES,
  };
}; 