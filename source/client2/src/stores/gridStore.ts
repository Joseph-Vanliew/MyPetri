import { create } from 'zustand';

export interface GridStoreState {
  // Grid size (base size of each small grid cell)
  gridSize: number;
  
  // Grid customization constants - control the overall grid cell sizes
  majorGridWidthMultiplier: number;
  majorGridHeightMultiplier: number;
  
  // Grid visibility and behavior
  showGrid: boolean;
  snapToGrid: boolean;
  showAllTiles: boolean; // Show all pre-rendered tiles (for debugging/visualization)
  
  // Actions
  setGridSize: (size: number) => void;
  setMajorGridWidthMultiplier: (multiplier: number) => void;
  setMajorGridHeightMultiplier: (multiplier: number) => void;
  toggleGrid: () => void;
  toggleSnapToGrid: () => void;
  toggleShowAllTiles: () => void;
}

export const useGridStore = create<GridStoreState>((set, get) => ({
  // Initial state
  gridSize: 10,
  majorGridWidthMultiplier: 4,
  majorGridHeightMultiplier: 4,
  showGrid: true,
  snapToGrid: true,
  showAllTiles: false, // Default to false (only show tiles with elements)
  
  // Actions
  setGridSize: (size: number) => {
    set({ gridSize: Math.max(5, Math.min(100, size)) });
  },
  
  setMajorGridWidthMultiplier: (multiplier: number) => {
    set({ majorGridWidthMultiplier: Math.max(1, Math.min(20, multiplier)) });
  },
  
  setMajorGridHeightMultiplier: (multiplier: number) => {
    set({ majorGridHeightMultiplier: Math.max(1, Math.min(20, multiplier)) });
  },
  
  toggleGrid: () => {
    const { showGrid } = get();
    set({ showGrid: !showGrid });
  },
  
  toggleSnapToGrid: () => {
    const { snapToGrid } = get();
    set({ snapToGrid: !snapToGrid });
  },
  
  toggleShowAllTiles: () => {
    const { showAllTiles } = get();
    set({ showAllTiles: !showAllTiles });
  },
}));