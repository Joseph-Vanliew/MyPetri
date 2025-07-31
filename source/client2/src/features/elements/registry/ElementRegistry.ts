import type { ElementType, ElementBase } from '../../../types/common.js';

// Element behavior interface
export interface ElementBehavior {
  // Rendering
  render: (element: ElementBase) => React.ReactElement;
  
  // Interaction
  onSelect?: (element: ElementBase) => void;
  onDeselect?: (element: ElementBase) => void;
  onDragStart?: (element: ElementBase, event: React.MouseEvent) => void;
  onDrag?: (element: ElementBase, event: React.MouseEvent) => void;
  onDragEnd?: (element: ElementBase, event: React.MouseEvent) => void;
  onResize?: (element: ElementBase, newSize: { width: number; height: number }) => void;
  
  // Validation
  validate?: (element: ElementBase) => { isValid: boolean; errors: string[] };
  
  // Creation
  createDefault?: (position: { x: number; y: number }) => ElementBase;
  
  // Properties
  getDefaultSize?: () => { width: number; height: number };
  getMinSize?: () => { width: number; height: number };
  getMaxSize?: () => { width: number; height: number };
}

// Registry class
class ElementRegistry {
  private behaviors = new Map<ElementType, ElementBehavior>();
  // private renderers = new Map<ElementType, React.ComponentType<any>>(); // Will be used for component rendering later

  // Register a new element type
  register(type: ElementType, behavior: ElementBehavior): void {
    this.behaviors.set(type, behavior);
  }

  // Get behavior for an element type
  getBehavior(type: ElementType): ElementBehavior | undefined {
    return this.behaviors.get(type);
  }

  // Get all registered element types
  getRegisteredTypes(): ElementType[] {
    return Array.from(this.behaviors.keys());
  }

  // Check if an element type is registered
  isRegistered(type: ElementType): boolean {
    return this.behaviors.has(type);
  }

  // Create a default element of a given type
  createDefaultElement(type: ElementType, position: { x: number; y: number }): ElementBase | null {
    const behavior = this.behaviors.get(type);
    if (!behavior?.createDefault) {
      return null;
    }
    return behavior.createDefault(position);
  }

  // Validate an element
  validateElement(element: ElementBase): { isValid: boolean; errors: string[] } {
    const behavior = this.behaviors.get(element.type);
    if (!behavior?.validate) {
      return { isValid: true, errors: [] };
    }
    return behavior.validate(element);
  }

  // Get default size for an element type
  getDefaultSize(type: ElementType): { width: number; height: number } | null {
    const behavior = this.behaviors.get(type);
    return behavior?.getDefaultSize?.() || null;
  }

  // Get min size for an element type
  getMinSize(type: ElementType): { width: number; height: number } | null {
    const behavior = this.behaviors.get(type);
    return behavior?.getMinSize?.() || null;
  }

  // Get max size for an element type
  getMaxSize(type: ElementType): { width: number; height: number } | null {
    const behavior = this.behaviors.get(type);
    return behavior?.getMaxSize?.() || null;
  }
}

// Singleton instance
export const elementRegistry = new ElementRegistry();

// Export the registry instance
export default elementRegistry; 