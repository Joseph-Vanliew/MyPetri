// Toolbar store for managing tool selection state

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { ToolbarState } from '../types/ui';
import type { ToolType } from '../types/common';

interface ToolbarStoreState extends ToolbarState {
  // Actions
  setSelectedTool: (tool: ToolType) => void;
  addAvailableTool: (tool: ToolType) => void;
  removeAvailableTool: (tool: ToolType) => void;
  setAvailableTools: (tools: ToolType[]) => void;
  resetToDefaultTools: () => void;
  
  // Tool state
  isDrawing: boolean;
  setIsDrawing: (isDrawing: boolean) => void;

  // Arc drawing state
  arcDrawingStartId: string | null;
  setArcDrawingStartId: (elementId: string | null) => void;
  
  // Tool options
  toolOptions: Record<ToolType, any>;
  setToolOption: (tool: ToolType, option: string, value: any) => void;
  resetToolOptions: (tool: ToolType) => void;

  // Drag and drop actions
  startDragFromToolbar: (elementType: ToolType) => void;
  updateDragPreviewPosition: (position: { x: number; y: number }) => void;
  endDragFromToolbar: () => void;
}

const defaultTools: ToolType[] = ['NONE', 'PLACE', 'TRANSITION', 'ARC', 'ARC_INHIBITOR', 'ARC_BIDIRECTIONAL', 'TEXT', 'SHAPE'];

const defaultToolOptions: Record<ToolType, any> = {
  NONE: {},
  PLACE: {
    radius: 46,
    tokens: 0,
    capacity: undefined,
    bounded: false,
  },
  TRANSITION: {
    width: 60,
    height: 30,
  },
  ARC: {
    weight: 1,
    arcType: 'normal' as const,
  },
  ARC_INHIBITOR: {
    weight: 1,
    arcType: 'inhibitor' as const,
  },

  ARC_BIDIRECTIONAL: {
    weight: 1,
    arcType: 'bidirectional' as const,
  },
  TEXT: {
    fontSize: 16,
    fontFamily: 'sans-serif',
    color: '#ffffff',
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    borderWidth: 2,
  },
  SHAPE: {
    shapeType: 'rectangle' as const,
    fillColor: 'rgba(255, 255, 255, 0.1)',
    strokeColor: 'rgba(255, 255, 255, 0.8)',
    strokeWidth: 2,
  },
};

export const useToolbarStore = create<ToolbarStoreState>()(
  devtools(
    (set, get) => ({
      selectedTool: 'NONE',
      availableTools: [...defaultTools],
      isDrawing: false,
      arcDrawingStartId: null,
      toolOptions: { ...defaultToolOptions },
      // Drag and drop state
      isDraggingFromToolbar: false,
      draggedElementType: null,
      dragPreviewPosition: null,

      setSelectedTool: (tool: ToolType) => {
        set({ selectedTool: tool });
      },

      addAvailableTool: (tool: ToolType) => {
        const { availableTools } = get();
        if (!availableTools.includes(tool)) {
          set({ availableTools: [...availableTools, tool] });
        }
      },

      removeAvailableTool: (tool: ToolType) => {
        const { availableTools, selectedTool } = get();
        if (availableTools.includes(tool) && tool !== 'NONE') {
          const newTools = availableTools.filter(t => t !== tool);
          set({ 
            availableTools: newTools,
            selectedTool: selectedTool === tool ? 'NONE' : selectedTool
          });
        }
      },

      setAvailableTools: (tools: ToolType[]) => {
        set({ availableTools: tools });
      },

      resetToDefaultTools: () => {
        set({ 
          availableTools: [...defaultTools],
          selectedTool: 'NONE'
        });
      },

      setIsDrawing: (isDrawing: boolean) => {
        set({ isDrawing });
      },

      setArcDrawingStartId: (elementId: string | null) => {
        set({ arcDrawingStartId: elementId });
      },

      setToolOption: (tool: ToolType, option: string, value: any) => {
        const { toolOptions } = get();
        set({
          toolOptions: {
            ...toolOptions,
            [tool]: {
              ...toolOptions[tool],
              [option]: value,
            }
          }
        });
      },

      resetToolOptions: (tool: ToolType) => {
        const { toolOptions } = get();
        set({
          toolOptions: {
            ...toolOptions,
            [tool]: { ...defaultToolOptions[tool] }
          }
        });
      },

      // Drag and drop actions
      startDragFromToolbar: (elementType: ToolType) => {
        set((state) => ({
          ...state,
          isDraggingFromToolbar: true,
          draggedElementType: elementType,
          dragPreviewPosition: null
        }));
      },

      updateDragPreviewPosition: (position: { x: number; y: number }) => {
        set((state) => ({
          ...state,
          dragPreviewPosition: position
        }));
      },

      endDragFromToolbar: () => {
        set((state) => ({
          ...state,
          isDraggingFromToolbar: false,
          draggedElementType: null,
          dragPreviewPosition: null
        }));
      },
    }),
    {
      name: 'toolbar-store',
    }
  )
); 