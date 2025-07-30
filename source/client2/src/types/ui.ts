// UI types - placeholder for future implementation
export interface LayoutState {
  leftSidebarWidth: number;
  rightSidebarWidth: number;
  leftSidebarCollapsed: boolean;
  rightSidebarCollapsed: boolean;
  statusBarHeight: number;
}

export interface ToolbarState {
  selectedTool: string;
  availableTools: string[];
}

export interface CanvasState {
  zoomLevel: number;
  panOffset: { x: number; y: number };
  viewBox: { x: number; y: number; width: number; height: number };
  gridSize: number;
  showGrid: boolean;
  snapToGrid: boolean;
}

export interface SelectionState {
  selectedElementIds: string[];
  selectionBox: { x: number; y: number; width: number; height: number } | null;
  isSelecting: boolean;
} 