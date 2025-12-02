// Canvas store for managing canvas UI state

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { CanvasState, SelectionState } from '../types/ui';

export interface GridTile {
  x: number;
  y: number;
  width: number;
  height: number;
  // Track if this is the initial tile (centered at 0,0)
  isInitial?: boolean;
}

interface CanvasStoreState extends CanvasState, SelectionState {
  // Internal
  _pageView: Record<string, { zoomLevel: number; panOffset: { x: number; y: number } }>;
  _currentPageId?: string;
  // Grid tiles per page - tracks rendered grid tiles
  _gridTiles: Record<string, GridTile[]>; // pageId -> tiles
  // Actions
  setZoomLevel: (zoomLevel: number) => void;
  setPanOffset: (panOffset: { x: number; y: number }) => void;
  setViewBox: (viewBox: { x: number; y: number; width: number; height: number }) => void;
  // Per-page view state
  setActivePage: (pageId: string) => void;
  setGridSize: (gridSize: number) => void;
  toggleGrid: () => void;
  toggleSnapToGrid: () => void;
  
  // Grid tile management
  initializeGridTiles: (pageId: string) => void;
  getGridTiles: (pageId: string) => GridTile[];
  getVisibleGridTiles: (pageId: string, elementBounds: Array<{ x: number; y: number; width: number; height: number }>) => GridTile[];
  
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

// Tile dimensions - fixed size, independent of viewBox
// Grid tiles are always this size regardless of viewBox dimensions
// Note: Each tile renders content 2*gridSize smaller (20px by default) to prevent overlap
// So tiles are spaced 2*gridSize closer together to eliminate gaps
const DEFAULT_GRID_SIZE = 10; // Default grid size used for tile spacing calculations
const TILE_RENDER_OVERLAP = 2 * DEFAULT_GRID_SIZE; // 20px - how much content is inset per tile
const TILE_WIDTH = 1300;
const TILE_HEIGHT = 1500;

// Grid extent - how many tiles in each direction from center (total tiles = (2 * GRID_EXTENT + 1)^2)
const GRID_EXTENT = 6; // Creates a 13x13 grid (6 tiles in each direction from center)

// Calculate total grid bounds (all pre-rendered tiles)
const GRID_TOTAL_WIDTH = (2 * GRID_EXTENT + 1) * TILE_WIDTH; // 13 * 1300 = 16,900

// Initial viewBox size - shows 3x3 tiles initially
// Note: Setting this to TILE_WIDTH * 3 (instead of just TILE_WIDTH) provides stable grid tile rendering
// Grid tiles are always TILE_WIDTH x TILE_HEIGHT regardless of viewBox size, but the initial viewBox
// size affects rendering stability. Using 3x tiles width/height ensures tiles reveal themselves stably.
const INITIAL_VIEW_WIDTH = TILE_WIDTH * 3; // Show 3 tiles wide (provides stable rendering)
const INITIAL_VIEW_HEIGHT = TILE_HEIGHT * 3; // Show 3 tiles tall (provides stable rendering)

// Calculate minimum zoom to prevent zooming out beyond grid bounds
// Minimum zoom allows viewBox to expand to show the entire grid
// We use a reasonable reference size (3 tiles) to calculate minimum zoom
// This is independent of INITIAL_VIEW_WIDTH so changing the initial view doesn't break zoom
const REFERENCE_VIEW_WIDTH = TILE_WIDTH * 3; // Reference size for zoom calculation
const MIN_ZOOM_LEVEL = REFERENCE_VIEW_WIDTH / GRID_TOTAL_WIDTH; // ≈ 0.073 (can see full grid at min zoom)

const initialCanvasState: CanvasState = {
  zoomLevel: 3, // Start at zoom 3 - with viewBox showing 3x3 tiles, this shows 1 tile (displayed as 100%)
  panOffset: { x: 0, y: 0 },
  viewBox: { 
    x: -INITIAL_VIEW_WIDTH / 2, 
    y: -INITIAL_VIEW_HEIGHT / 2, 
    width: INITIAL_VIEW_WIDTH, 
    height: INITIAL_VIEW_HEIGHT 
  },
};

const initialSelectionState: SelectionState = {
  selectedElementIds: [],
  selectionBox: null,
  isSelecting: false,
};

/**
 * Generate all grid tiles in a grid pattern centered at (0,0)
 * Creates a grid of (2 * GRID_EXTENT + 1) x (2 * GRID_EXTENT + 1) tiles
 */
function initializeGridTilesForPage(): GridTile[] {
  const tiles: GridTile[] = [];
  
  // Create tiles in a grid pattern centered at (0,0)
  // Initial tile is at the center, extending from (-TILE_WIDTH/2, -TILE_HEIGHT/2) to (TILE_WIDTH/2, TILE_HEIGHT/2)
  // Tiles are spaced closer together (by TILE_RENDER_OVERLAP) so their rendered content is adjacent with no gaps
  const tileSpacingX = TILE_WIDTH - TILE_RENDER_OVERLAP;
  const tileSpacingY = TILE_HEIGHT - TILE_RENDER_OVERLAP;
  
  for (let row = -GRID_EXTENT; row <= GRID_EXTENT; row++) {
    for (let col = -GRID_EXTENT; col <= GRID_EXTENT; col++) {
      const x = col * tileSpacingX;
      const y = row * tileSpacingY;
      
      // Center the tiles so the initial tile is centered at (0,0)
      // If col/row is 0, tile should be from -TILE_WIDTH/2 to TILE_WIDTH/2
      const tileX = x - TILE_WIDTH / 2;
      const tileY = y - TILE_HEIGHT / 2;
      
      tiles.push({
        x: tileX,
        y: tileY,
        width: TILE_WIDTH,
        height: TILE_HEIGHT,
        isInitial: row === 0 && col === 0, // Mark the center tile as initial
      });
    }
  }
  
  return tiles;
}

export const useCanvasStore = create<CanvasStoreState>()(
  devtools(
    (set, get) => ({
      ...initialCanvasState,
      ...initialSelectionState,
      // Internal map of per-page view state
      _pageView: {} as Record<string, { zoomLevel: number; panOffset: { x: number; y: number } }>,
      _currentPageId: undefined as string | undefined,
      // Grid tiles per page - all tiles are pre-rendered with fixed TILE_WIDTH x TILE_HEIGHT dimensions
      _gridTiles: {} as Record<string, GridTile[]>,

      setZoomLevel: (zoomLevel: number) => {
        // Calculate minimum zoom to prevent zooming out beyond grid bounds
        // Minimum zoom allows viewBox to expand to grid size
        // Maximum zoom = 5 (allow zooming in)
        const clamped = Math.max(MIN_ZOOM_LEVEL, Math.min(5, zoomLevel));
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
        
        // Initialize grid tiles for page if not exists - generate all tiles
        if (!state._gridTiles[pageId] || state._gridTiles[pageId].length === 0) {
          state._gridTiles[pageId] = initializeGridTilesForPage();
        }
        
        set({ _currentPageId: pageId, zoomLevel: pageView.zoomLevel, panOffset: pageView.panOffset, _pageView: { ...state._pageView }, _gridTiles: { ...state._gridTiles } });
      },
      
      initializeGridTiles: (pageId: string) => {
        const state = get() as any;
        if (!state._gridTiles[pageId]) {
          state._gridTiles[pageId] = initializeGridTilesForPage();
          set({ _gridTiles: { ...state._gridTiles } });
        }
      },
      
      getGridTiles: (pageId: string) => {
        const state = get() as any;
        // Return all tiles (they're all pre-rendered)
        return state._gridTiles[pageId] || [];
      },
      
      getVisibleGridTiles: (pageId: string, elementBounds: Array<{ x: number; y: number; width: number; height: number }>) => {
        const state = get() as any;
        const allTiles = state._gridTiles[pageId] || [];
        
        if (allTiles.length === 0) return [];
        
        // Find the initial tile
        const initialTile = allTiles.find((tile: GridTile) => tile.isInitial === true);
        if (!initialTile) return allTiles; // Fallback if no initial tile found
        
        // Find all tiles that contain elements
        const tilesWithElements = allTiles.filter((tile: GridTile) => {
          return elementBounds.some(bounds => {
            const elementLeft = bounds.x - bounds.width / 2;
            const elementRight = bounds.x + bounds.width / 2;
            const elementTop = bounds.y - bounds.height / 2;
            const elementBottom = bounds.y + bounds.height / 2;
            
            const tileRight = tile.x + tile.width;
            const tileBottom = tile.y + tile.height;
            
            return !(
              elementRight < tile.x ||
              elementLeft > tileRight ||
              elementBottom < tile.y ||
              elementTop > tileBottom
            );
          });
        });
        
        if (tilesWithElements.length === 0) {
          // No elements, only show initial tile
          return [initialTile];
        }
        
        // Calculate tile indices (row/col) for the initial tile
        // Tiles are spaced by tileSpacingX and tileSpacingY
        const tileSpacingX = TILE_WIDTH - TILE_RENDER_OVERLAP;
        const tileSpacingY = TILE_HEIGHT - TILE_RENDER_OVERLAP;
        
        // Convert tile position to row/col index
        const getTileIndex = (tile: GridTile) => {
          // Reverse the calculation: tileX = col * tileSpacingX - TILE_WIDTH / 2
          // So: col * tileSpacingX = tileX + TILE_WIDTH / 2
          const col = Math.round((tile.x + TILE_WIDTH / 2) / tileSpacingX);
          const row = Math.round((tile.y + TILE_HEIGHT / 2) / tileSpacingY);
          return { row, col };
        };
        
        const initialIndex = getTileIndex(initialTile);
        
        // Calculate the bounding rectangle of row/col indices that need to be visible
        // This includes all tiles between the initial tile and each element-containing tile
        let minRow = initialIndex.row;
        let maxRow = initialIndex.row;
        let minCol = initialIndex.col;
        let maxCol = initialIndex.col;
        
        tilesWithElements.forEach((tile: GridTile) => {
          const index = getTileIndex(tile);
          minRow = Math.min(minRow, index.row);
          maxRow = Math.max(maxRow, index.row);
          minCol = Math.min(minCol, index.col);
          maxCol = Math.max(maxCol, index.col);
        });
        
        // Show all tiles within the bounding rectangle
        return allTiles.filter((tile: GridTile) => {
          if (tile.isInitial) return true;
          
          const index = getTileIndex(tile);
          
          // Tile is visible if it's within the bounding rectangle
          return (
            index.row >= minRow &&
            index.row <= maxRow &&
            index.col >= minCol &&
            index.col <= maxCol
          );
        });
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
        setZoomLevel(Math.max(MIN_ZOOM_LEVEL, zoomLevel / 1.2)); // Minimum zoom prevents exceeding grid bounds
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