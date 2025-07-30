// Canvas store for managing canvas UI state

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { CanvasState, SelectionState } from '../types/ui';

interface CanvasStoreState extends CanvasState, SelectionState {
  // Actions
  setZoomLevel: (zoomLevel: number) => void;
  setPanOffset: (panOffset: { x: number; y: number }) => void;
  setViewBox: (viewBox: { x: number; y: number; width: number; height: number }) => void;
  setGridSize: (gridSize: number) => void;
  toggleGrid: () => void;
  toggleSnapToGrid: () => void;
  
  // Selection actions
  setSelectionBox: (selectionBox: { x: number; y: number; width: number; height: number } | null) => void;
  setIsSelecting: (isSelecting: boolean) => void;
  
  // Canvas operations
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  centerView: () => void;
  fitToView: (bounds: { x: number; y: number; width: number; height: number }) => void;
}

const initialCanvasState: CanvasState = {
  zoomLevel: 1,
  panOffset: { x: 0, y: 0 },
  viewBox: { x: 0, y: 0, width: 1500, height: 900 },
  gridSize: 20,
  showGrid: true,
  snapToGrid: true,
};

const initialSelectionState: SelectionState = {
  selectedElementIds: [],
  selectionBox: null,
  isSelecting: false,
};

export const useCanvasStore = create<CanvasStoreState>()(
  devtools(
    (set, get) => ({
      ...initialCanvasState,
      ...initialSelectionState,

      setZoomLevel: (zoomLevel: number) => {
        set({ zoomLevel: Math.max(0.1, Math.min(5, zoomLevel)) });
      },

      setPanOffset: (panOffset: { x: number; y: number }) => {
        set({ panOffset });
      },

      setViewBox: (viewBox: { x: number; y: number; width: number; height: number }) => {
        set({ viewBox });
      },

      setGridSize: (gridSize: number) => {
        set({ gridSize: Math.max(5, Math.min(100, gridSize)) });
      },

      toggleGrid: () => {
        const { showGrid } = get();
        set({ showGrid: !showGrid });
      },

      toggleSnapToGrid: () => {
        const { snapToGrid } = get();
        set({ snapToGrid: !snapToGrid });
      },

      setSelectionBox: (selectionBox: { x: number; y: number; width: number; height: number } | null) => {
        set({ selectionBox });
      },

      setIsSelecting: (isSelecting: boolean) => {
        set({ isSelecting });
      },

      zoomIn: () => {
        const { zoomLevel } = get();
        set({ zoomLevel: Math.min(5, zoomLevel * 1.2) });
      },

      zoomOut: () => {
        const { zoomLevel } = get();
        set({ zoomLevel: Math.max(0.1, zoomLevel / 1.2) });
      },

      resetZoom: () => {
        set({ zoomLevel: 1, panOffset: { x: 0, y: 0 } });
      },

      centerView: () => {
        set({ panOffset: { x: 0, y: 0 } });
      },

      fitToView: (bounds: { x: number; y: number; width: number; height: number }) => {
        const { viewBox } = get();
        const padding = 50;
        
        const scaleX = (viewBox.width - padding * 2) / bounds.width;
        const scaleY = (viewBox.height - padding * 2) / bounds.height;
        const scale = Math.min(scaleX, scaleY, 1); // Don't zoom in beyond 1x
        
        const centerX = bounds.x + bounds.width / 2;
        const centerY = bounds.y + bounds.height / 2;
        
        const newPanX = viewBox.width / 2 - centerX * scale;
        const newPanY = viewBox.height / 2 - centerY * scale;
        
        set({
          zoomLevel: scale,
          panOffset: { x: newPanX, y: newPanY }
        });
      },
    }),
    {
      name: 'canvas-store',
    }
  )
); 