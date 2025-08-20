// Canvas store for managing canvas UI state

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { CanvasState, SelectionState } from '../types/ui';

interface CanvasStoreState extends CanvasState, SelectionState {
  // Internal
  _pageView: Record<string, { zoomLevel: number; panOffset: { x: number; y: number } }>;
  _currentPageId?: string;
  // Actions
  setZoomLevel: (zoomLevel: number) => void;
  setPanOffset: (panOffset: { x: number; y: number }) => void;
  setViewBox: (viewBox: { x: number; y: number; width: number; height: number }) => void;
  // Per-page view state
  setActivePage: (pageId: string) => void;
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
  viewBox: { x: 0, y: 0, width: 1300, height: 1500 },
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
      // Internal map of per-page view state
      _pageView: {} as Record<string, { zoomLevel: number; panOffset: { x: number; y: number } }>,
      _currentPageId: undefined as string | undefined,

      setZoomLevel: (zoomLevel: number) => {
        const clamped = Math.max(0.1, Math.min(5, zoomLevel));
        const { _currentPageId, _pageView } = get() as any;
        if (_currentPageId) {
          const existing = _pageView[_currentPageId] || { zoomLevel: 1, panOffset: { x: 0, y: 0 } };
          _pageView[_currentPageId] = { ...existing, zoomLevel: clamped };
          set({ zoomLevel: clamped, _pageView: { ..._pageView } });
        } else {
          set({ zoomLevel: clamped });
        }
      },

      setPanOffset: (panOffset: { x: number; y: number }) => {
        const { _currentPageId, _pageView } = get() as any;
        if (_currentPageId) {
          const existing = _pageView[_currentPageId] || { zoomLevel: 1, panOffset: { x: 0, y: 0 } };
          _pageView[_currentPageId] = { ...existing, panOffset };
          set({ panOffset, _pageView: { ..._pageView } });
        } else {
          set({ panOffset });
        }
      },

      setViewBox: (viewBox: { x: number; y: number; width: number; height: number }) => {
        set({ viewBox });
      },

      setActivePage: (pageId: string) => {
        const state = get() as any;
        const pageView = state._pageView[pageId] || { zoomLevel: state.zoomLevel ?? 1, panOffset: state.panOffset ?? { x: 0, y: 0 } };
        state._pageView[pageId] = pageView;
        set({ _currentPageId: pageId, zoomLevel: pageView.zoomLevel, panOffset: pageView.panOffset, _pageView: { ...state._pageView } });
      },

      setSelectionBox: (selectionBox: { x: number; y: number; width: number; height: number } | null) => {
        set({ selectionBox });
      },

      setIsSelecting: (isSelecting: boolean) => {
        set({ isSelecting });
      },

      zoomIn: () => {
        const { zoomLevel, setZoomLevel } = get();
        setZoomLevel(Math.min(5, zoomLevel * 1.2));
      },

      zoomOut: () => {
        const { zoomLevel, setZoomLevel } = get();
        setZoomLevel(Math.max(0.1, zoomLevel / 1.2));
      },

      resetZoom: () => {
        const { setZoomLevel, setPanOffset } = get();
        setZoomLevel(1);
        setPanOffset({ x: 0, y: 0 });
      },

      centerView: () => {
        const { setPanOffset } = get();
        setPanOffset({ x: 0, y: 0 });
      },

      fitToView: (bounds: { x: number; y: number; width: number; height: number }) => {
        const { viewBox, setZoomLevel, setPanOffset } = get();
        const padding = 50;
        
        const scaleX = (viewBox.width - padding * 2) / bounds.width;
        const scaleY = (viewBox.height - padding * 2) / bounds.height;
        const scale = Math.min(scaleX, scaleY, 1); // Don't zoom in beyond 1x
        
        const centerX = bounds.x + bounds.width / 2;
        const centerY = bounds.y + bounds.height / 2;
        
        const newPanX = viewBox.width / 2 - centerX * scale;
        const newPanY = viewBox.height / 2 - centerY * scale;
        
        setZoomLevel(scale);
        setPanOffset({ x: newPanX, y: newPanY });
      },
    }),
    {
      name: 'canvas-store',
    }
  )
); 