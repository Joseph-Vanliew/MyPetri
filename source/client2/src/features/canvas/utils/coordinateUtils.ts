import { useCanvasStore } from '../../../stores/index.js';

// Convert screen coordinates to SVG coordinates
export const screenToSVGCoordinates = (
  screenX: number,
  screenY: number,
  svgElement: SVGSVGElement
): { x: number; y: number } => {
  // Simplified coordinate transformation
  const rect = svgElement.getBoundingClientRect();
  const viewBox = svgElement.viewBox.baseVal;
  
  const x = ((screenX - rect.left) / rect.width) * viewBox.width + viewBox.x;
  const y = ((screenY - rect.top) / rect.height) * viewBox.height + viewBox.y;
  
  return { x, y };
};

// Convert SVG coordinates to screen coordinates
export const svgToScreenCoordinates = (
  svgX: number,
  svgY: number,
  svgElement: SVGSVGElement
): { x: number; y: number } => {
  // Simplified coordinate transformation
  const rect = svgElement.getBoundingClientRect();
  const viewBox = svgElement.viewBox.baseVal;
  
  const x = ((svgX - viewBox.x) / viewBox.width) * rect.width + rect.left;
  const y = ((svgY - viewBox.y) / viewBox.height) * rect.height + rect.top;
  
  return { x, y };
};

// Snap coordinates to grid
export const snapToGrid = (
  x: number,
  y: number,
  gridSize: number
): { x: number; y: number } => {
  return {
    x: Math.round(x / gridSize) * gridSize,
    y: Math.round(y / gridSize) * gridSize
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

// Get grid lines for a given area
export const getGridLines = (
  viewBox: { x: number; y: number; width: number; height: number },
  gridSize: number
): { vertical: number[]; horizontal: number[] } => {
  const startX = Math.floor(viewBox.x / gridSize) * gridSize;
  const endX = Math.ceil((viewBox.x + viewBox.width) / gridSize) * gridSize;
  const startY = Math.floor(viewBox.y / gridSize) * gridSize;
  const endY = Math.ceil((viewBox.y + viewBox.height) / gridSize) * gridSize;
  
  const vertical: number[] = [];
  const horizontal: number[] = [];
  
  // Generate vertical lines
  for (let x = startX; x <= endX; x += gridSize) {
    vertical.push(x);
  }
  
  // Generate horizontal lines
  for (let y = startY; y <= endY; y += gridSize) {
    horizontal.push(y);
  }
  
  return { vertical, horizontal };
};

// Hook to get grid utilities with current canvas state
export const useGridUtils = () => {
  const { gridSize, snapToGrid: snapToGridEnabled } = useCanvasStore();
  
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