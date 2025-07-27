import { GRID_CELL_SIZE } from '../../../types';

/**
 * Converts screen coordinates to SVG coordinates
 */
export function screenToSVGCoordinates(clientX: number, clientY: number, svgElement: SVGSVGElement | null): { x: number, y: number } {
  
  if (!svgElement) {
    console.error('No SVG element found');
    const center = { x: 0, y: 0 };
    return center;
  }
  
  // Create a point in screen coordinates
  const point = svgElement.createSVGPoint();
  point.x = clientX;
  point.y = clientY;
  
  // Convert to SVG coordinates using the inverse of the CTM
  const ctm = svgElement.getScreenCTM();
  if (!ctm) return { x: 0, y: 0 };

  if(!ctm) {
    console.error('No CTM found');
    const center = { x: 0, y: 0 };
    return center;
  }
  
  const svgPoint = point.matrixTransform(ctm.inverse());

  const svgCoordinates = { x: svgPoint.x, y: svgPoint.y };

  return svgCoordinates;
}

/**
 * Snaps coordinates to the grid
 */
export function snapToGrid(x: number, y: number): { x: number, y: number } {

  const snappedX = Math.round(x / GRID_CELL_SIZE) * GRID_CELL_SIZE;
  const snappedY = Math.round(y / GRID_CELL_SIZE) * GRID_CELL_SIZE;
  const snappedCoordinates = { x: snappedX, y: snappedY };

  return snappedCoordinates;
} 