import type { Element } from '../../../types/domain';

/**
 * Get bounding box for an element, accounting for element-specific geometry
 */
export function getElementBounds(element: Element): { x: number; y: number; width: number; height: number } {
  if (element.type === 'place') {
    const radius = (element as any).radius || element.width / 2;
    return {
      x: element.x,
      y: element.y,
      width: radius * 2,
      height: radius * 2,
    };
  }
  
  // For all other elements, use width/height directly
  return {
    x: element.x,
    y: element.y,
    width: element.width,
    height: element.height,
  };
}

