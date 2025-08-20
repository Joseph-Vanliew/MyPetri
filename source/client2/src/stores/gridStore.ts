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
  
  // Actions
  setGridSize: (size: number) => void;
  setMajorGridWidthMultiplier: (multiplier: number) => void;
  setMajorGridHeightMultiplier: (multiplier: number) => void;
  toggleGrid: () => void;
  toggleSnapToGrid: () => void;
}

export const useGridStore = create<GridStoreState>((set, get) => ({
  // Initial state
  gridSize: 20,
  majorGridWidthMultiplier: 4,
  majorGridHeightMultiplier: 4,
  showGrid: true,
  snapToGrid: true,
  
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
})); 

// Expose for non-hook access in rare cases (e.g., preview sizing without re-renders)
// This is safe in client code; ignored on SSR builds.
// @ts-ignore
if (typeof window !== 'undefined') {
  // @ts-ignore
  (window as any).__gridStore__ = { getState: () => useGridStore.getState() };
}