// UI types - placeholder for future implementation
import type { ToolType } from './common';

export interface LayoutState {
  leftSidebarWidth: number;
  rightSidebarWidth: number;
  leftSidebarCollapsed: boolean;
  rightSidebarCollapsed: boolean;
  statusBarHeight: number;
}

export interface ToolbarState {
  selectedTool: ToolType;
  availableTools: ToolType[];
  // Drag and drop state
  isDraggingFromToolbar: boolean;
  draggedElementType: ToolType | null;
  dragPreviewPosition: { x: number; y: number } | null;
}

export interface CanvasState {
  zoomLevel: number;
  panOffset: { x: number; y: number };
  viewBox: { x: number; y: number; width: number; height: number };
}

export interface SelectionState {
  selectedElementIds: string[];
  selectionBox: { x: number; y: number; width: number; height: number } | null;
  isSelecting: boolean;
} 