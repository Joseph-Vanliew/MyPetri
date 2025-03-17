import { GRID_CELL_SIZE } from '../../../types';

/**
 * Converts screen coordinates to SVG coordinates
 */
export function screenToSVGCoordinates(
  clientX: number, 
  clientY: number, 
  svgElement: SVGSVGElement | null
): { x: number, y: number } {
  if (!svgElement) return { x: 0, y: 0 };
  
  // Create a point in screen coordinates
  const point = svgElement.createSVGPoint();
  point.x = clientX;
  point.y = clientY;
  
  // Convert to SVG coordinates using the inverse of the CTM
  const ctm = svgElement.getScreenCTM();
  if (!ctm) return { x: 0, y: 0 };
  
  const svgPoint = point.matrixTransform(ctm.inverse());
  
  // Return the exact SVG coordinates
  return { 
    x: svgPoint.x, 
    y: svgPoint.y 
  };
}

/**
 * Snaps coordinates to the grid
 */
export function snapToGrid(x: number, y: number): { x: number, y: number } {
  return {
    x: Math.round(x / GRID_CELL_SIZE) * GRID_CELL_SIZE,
    y: Math.round(y / GRID_CELL_SIZE) * GRID_CELL_SIZE
  };
} 