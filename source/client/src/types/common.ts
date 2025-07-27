// Common types and constants used throughout the application

export const GRID_CELL_SIZE = 50; // Pixels per grid cell for aspect ratios ranging from 16:9 to 21:9

export type GridPosition = { 
  gridX: number; 
  gridY: number; 
};

export type Position = {
  x: number;
  y: number;
};

export type Size = {
  width: number;
  height: number;
}; 