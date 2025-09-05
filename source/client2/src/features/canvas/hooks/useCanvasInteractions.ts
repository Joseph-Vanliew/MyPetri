import React, { useCallback, useState, useEffect } from 'react';
import { useElementsStore, useProjectStore, useToolbarStore } from '../../../stores/index.js';

interface UseCanvasInteractionsProps {
  selectedTool: string;
  isArcMode: boolean;
  arcDrawingStartId: string | null;
  currentPageElements: any[];
}

export const useCanvasInteractions = ({
  selectedTool,
  isArcMode,
  arcDrawingStartId,
  currentPageElements,
}: UseCanvasInteractionsProps) => {
  const [arcPreviewPos, setArcPreviewPos] = useState<{ x: number; y: number } | null>(null);
  const [arcHoverElementId, setArcHoverElementId] = useState<string | null>(null);
  const [fadeSelectionBox, setFadeSelectionBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  
  const { selectElement, removeElements, clearSelection, createArc } = useElementsStore();
  const { project } = useProjectStore();
  const { setArcDrawingStartId, setSelectedTool } = useToolbarStore();

  // Selection box state
  const selectionStartRef = React.useRef<{ x: number; y: number } | null>(null);

  // Helper function to clear arc drawing state (keeps tool selected for multiple arcs)
  const clearArcState = useCallback(() => {
    setArcDrawingStartId(null);
    setArcPreviewPos(null);
    setArcHoverElementId(null);
  }, [setArcDrawingStartId]);

  // Handle keyboard shortcuts (Escape: clear selection/arc; Delete/Backspace: delete selected)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore when typing in inputs or contenteditable
      const target = event.target as HTMLElement | null;
      const isTyping = !!target && (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      );

      if (event.key === 'Escape') {
        // Always prevent default for Escape key to prevent fullscreen exit
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        
        // Clear any selected elements
        if (project?.activePageId) {
          clearSelection(project.activePageId);
        }
        // Clear arc drawing mode and preview state
        clearArcState();
        // Reset tool to none
        setSelectedTool('NONE' as any);
      } else if (!isTyping && (event.key === 'Delete' || event.key === 'Backspace')) {
        if (project?.activePageId) {
          const selected = useElementsStore.getState().getSelectedElements(project.activePageId);
          if (selected.length > 0) {
            event.preventDefault();
            const selectedIds = new Set(selected.map(el => el.id));
            // Also delete arcs connected to any selected element
            const all = useElementsStore.getState().getElements(project.activePageId);
            const connectedArcIds = all
              .filter((el: any) => el.type === 'arc' && (selectedIds.has(el.sourceId) || selectedIds.has(el.targetId)))
              .map((el: any) => el.id);
            const idsToDelete = [...selectedIds, ...connectedArcIds].map(String);
            removeElements(project.activePageId, idsToDelete);
            clearSelection(project.activePageId);
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [clearSelection, clearArcState, setSelectedTool, project?.activePageId, removeElements]);

  // Clear arc state when tool changes (unless explicitly setting to NONE)
  useEffect(() => {
    if (selectedTool !== 'ARC' && selectedTool !== 'ARC_INHIBITOR' && selectedTool !== 'ARC_BIDIRECTIONAL' && selectedTool !== 'NONE') {
      clearArcState();
    }
  }, [selectedTool, clearArcState]);

  // Element selection handlers
  const handleElementSelect = (element: { id: string }) => {
    if (selectedTool === 'ARC' || selectedTool === 'ARC_INHIBITOR' || selectedTool === 'ARC_BIDIRECTIONAL') {
      handleConnectableClick(element.id);
      return;
    }
    
    // Check if this element is already part of a multi-selection
    if (project?.activePageId) {
      const selectedElements = useElementsStore.getState().getSelectedElements(project.activePageId);
      const isAlreadySelected = selectedElements.some((el: any) => el.id === element.id);
      
      if (isAlreadySelected && selectedElements.length > 1) {
        // Element is already part of multi-selection, don't change selection
        // drag the entire group
        return;
      }
    }
    
    selectElement(project?.activePageId || '', element.id);
  };

  const handleElementDeselect = (_element: { id: string }) => {
    // For now, just clear selection
    clearSelection(project?.activePageId || '');
  };

  // Element click handling for arc connection workflow
  const handleConnectableClick = (elementId: string) => {
    if (!project?.activePageId) return;
    if (!(selectedTool === 'ARC' || selectedTool === 'ARC_INHIBITOR' || selectedTool === 'ARC_BIDIRECTIONAL')) return;

    if (!arcDrawingStartId) {
      setArcDrawingStartId(elementId);
      return;
    }

    if (arcDrawingStartId === elementId) {
      clearArcState();
      return;
    }

    // Validate endpoints
    const startEl = currentPageElements.find(el => el.id === arcDrawingStartId);
    const endEl = currentPageElements.find(el => el.id === elementId);
    if (!startEl || !endEl) {
      clearArcState();
      return;
    }

    const isStartPlace = startEl.type === 'place';
    const isStartTransition = startEl.type === 'transition';
    const isEndPlace = endEl.type === 'place';
    const isEndTransition = endEl.type === 'transition';

    // Only between place and transition (no place->place or transition->transition)
    if ((isStartPlace && isEndPlace) || (isStartTransition && isEndTransition)) {
      clearArcState();
      return;
    }

    // Map tool to arc type
    const arcType = selectedTool === 'ARC' ? 'normal' : selectedTool === 'ARC_INHIBITOR' ? 'inhibitor' : 'bidirectional';

    // Inhibitor only allowed from place -> transition
    if (arcType === 'inhibitor' && !(isStartPlace && isEndTransition)) {
      clearArcState();
      return;
    }

    // Create arc with default weight 1
    createArc(project.activePageId, arcDrawingStartId, elementId, 1, arcType as any);
    // Clear arc drawing state but stay in arc mode for multiple arcs
    clearArcState();
    // Don't reset tool - stay in arc mode for multiple arcs
  };

  // Arc hover targeting state
  const handleElementMouseEnter = (_element: { id: string }) => {
    if (!isArcMode) return;
    setArcHoverElementId(_element.id);
  };

  const handleElementMouseLeave = (_element: { id: string }) => {
    if (!isArcMode) return;
    setArcHoverElementId((prev) => (prev === _element.id ? null : prev));
  };

  return {
    // State
    arcPreviewPos,
    arcHoverElementId,
    fadeSelectionBox,
    selectionStartRef,
    
    // Actions
    clearArcState,
    setArcPreviewPos,
    setArcHoverElementId,
    setFadeSelectionBox,
    
    // Handlers
    handleElementSelect,
    handleElementDeselect,
    handleConnectableClick,
    handleElementMouseEnter,
    handleElementMouseLeave,
  };
};