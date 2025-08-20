import { useGridStore } from '../../../stores/index.js';

// Convert screen coordinates to SVG coordinates with improved accuracy
export const screenToSVGCoordinates = (
  screenX: number,
  screenY: number,
  svgElement: SVGSVGElement
): { x: number; y: number } => {
  // Prefer SVGPoint + CTM for accuracy across pans/transforms
  const point = svgElement.createSVGPoint();
  point.x = screenX;
  point.y = screenY;
  // account for current transformation matrix from screen to SVG
  const ctm = svgElement.getScreenCTM();
  if (ctm) {
    const inverse = ctm.inverse();
    const svgPoint = point.matrixTransform(inverse);
    return { x: svgPoint.x, y: svgPoint.y };
  }
  // Fallback to viewBox math if CTM unavailable
  const rect = svgElement.getBoundingClientRect();
  const viewBox = svgElement.viewBox.baseVal;
  const normalizedX = (screenX - rect.left) / rect.width;
  const normalizedY = (screenY - rect.top) / rect.height;
  const x = viewBox.x + normalizedX * viewBox.width;
  const y = viewBox.y + normalizedY * viewBox.height;
  return { x, y };
};

// Convert SVG coordinates to screen coordinates
export const svgToScreenCoordinates = (
  svgX: number,
  svgY: number,
  svgElement: SVGSVGElement
): { x: number; y: number } => {
  const point = svgElement.createSVGPoint();
  point.x = svgX;
  point.y = svgY;
  const ctm = svgElement.getScreenCTM();
  if (ctm) {
    const screenPoint = point.matrixTransform(ctm);
    return { x: screenPoint.x, y: screenPoint.y };
  }
  // Fallback to rect/viewBox math
  const rect = svgElement.getBoundingClientRect();
  const viewBox = svgElement.viewBox.baseVal;
  const x = ((svgX - viewBox.x) / viewBox.width) * rect.width + rect.left;
  const y = ((svgY - viewBox.y) / viewBox.height) * rect.height + rect.top;
  return { x, y };
};

// Snap coordinates to grid with improved accuracy
export const snapToGrid = (
  x: number,
  y: number,
  gridSize: number
): { x: number; y: number } => {
  // Use more precise rounding to avoid edge case errors
  const snappedX = Math.round(x / gridSize) * gridSize;
  const snappedY = Math.round(y / gridSize) * gridSize;
  
  // Handle floating point precision issues
  const epsilon = 1e-10;
  return {
    x: Math.abs(snappedX - x) < epsilon ? x : snappedX,
    y: Math.abs(snappedY - y) < epsilon ? y : snappedY
  };
};

// Get grid position from coordinates
export const getGridPosition = (
  x: number,
  y: number,
  gridSize: number
): { gridX: number; gridY: number } => {
  return {
    gridX: Math.floor(x / gridSize),
    gridY: Math.floor(y / gridSize)
  };
};

// Check if coordinates are on grid
export const isOnGrid = (
  x: number,
  y: number,
  gridSize: number,
  tolerance: number = 2
): boolean => {
  const snapped = snapToGrid(x, y, gridSize);
  return Math.abs(x - snapped.x) <= tolerance && Math.abs(y - snapped.y) <= tolerance;
};

// Get grid bounds for a rectangle
export const getGridBounds = (
  x: number,
  y: number,
  width: number,
  height: number,
  gridSize: number
): { minX: number; minY: number; maxX: number; maxY: number } => {
  const snappedX = Math.floor(x / gridSize) * gridSize;
  const snappedY = Math.floor(y / gridSize) * gridSize;
  const snappedWidth = Math.ceil(width / gridSize) * gridSize;
  const snappedHeight = Math.ceil(height / gridSize) * gridSize;
  
  return {
    minX: snappedX,
    minY: snappedY,
    maxX: snappedX + snappedWidth,
    maxY: snappedY + snappedHeight
  };
};

// Calculate grid-aligned size
export const getGridAlignedSize = (
  width: number,
  height: number,
  gridSize: number
): { width: number; height: number } => {
  return {
    width: Math.ceil(width / gridSize) * gridSize,
    height: Math.ceil(height / gridSize) * gridSize
  };
};


// Hook to get grid utilities with current canvas state
export const useGridUtils = () => {
  const { gridSize, snapToGrid: snapToGridEnabled } = useGridStore();
  
  return {
    gridSize,
    snapToGridEnabled,
    snapToGrid: (x: number, y: number) => snapToGridEnabled ? snapToGrid(x, y, gridSize) : { x, y },
    getGridPosition: (x: number, y: number) => getGridPosition(x, y, gridSize),
    isOnGrid: (x: number, y: number) => isOnGrid(x, y, gridSize),
    getGridBounds: (x: number, y: number, width: number, height: number) =>
      getGridBounds(x, y, width, height, gridSize),
    getGridAlignedSize: (width: number, height: number) =>
      getGridAlignedSize(width, height, gridSize)
  };
}; 