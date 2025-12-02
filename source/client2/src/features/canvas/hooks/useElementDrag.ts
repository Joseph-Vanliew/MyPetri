import { useState, useRef, useCallback, useEffect } from 'react';
import { screenToSVGCoordinates } from '../../canvas/utils/coordinateUtils';
import { useInteractionStore } from '../../../stores/interactionStore';
import { useHistoryStore } from '../../../stores/historyStore';
import type { ToolType } from '../../../types/common';

interface DragState {
  isDragging: boolean;
  dragElement: any | null;
  dragStartPos: { x: number; y: number };
}

interface UseElementDragProps {
  selectedTool: ToolType;
  snapToGrid: boolean;
  gridSize: number;
  onUpdateElement: (pageId: string, elementId: string, updates: any) => void;
  projectActivePageId?: string;
  // Optional: get currently selected elements for group dragging
  getSelectedElements?: (pageId: string) => any[];
}

export const useElementDrag = ({
  selectedTool,
  snapToGrid,
  gridSize,
  onUpdateElement,
  projectActivePageId,
  getSelectedElements,
}: UseElementDragProps) => {
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    dragElement: null,
    dragStartPos: { x: 0, y: 0 }
  });
  
  const dragStartElementPos = useRef({ x: 0, y: 0 });
  const dragStartPositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const pendingUpdatesRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const dragElementsDataRef = useRef<Map<string, any>>(new Map()); // Store full element data
  const [draggingIds, setDraggingIds] = useState<string[]>([]); // State to trigger re-renders when IDs change
  const dragElementRef = useRef<any | null>(null);
  const canvasRefRef = useRef<React.RefObject<SVGSVGElement | null> | null>(null);

  const handleElementDragStart = useCallback((element: any, event: React.MouseEvent, canvasRef: React.RefObject<SVGSVGElement | null>) => {
    // Only allow dragging when no tool is selected (NONE tool)
    if (selectedTool !== 'NONE') {
      return;
    }
    if (dragState.isDragging) {
      // Prevent nested drag starts
      return;
    }
    // Begin history batch to coalesce all drag updates into one undo entry
    useHistoryStore.getState().beginBatch();

    event.stopPropagation();
    
    // Store canvasRef for use in global mouse handlers
    canvasRefRef.current = canvasRef;
    
    const svgElement = canvasRef.current;
    if (!svgElement) return;

    const { x: mouseX, y: mouseY } = screenToSVGCoordinates(event.clientX, event.clientY, svgElement);
    
    setDragState({
      isDragging: true,
      dragElement: element,
      dragStartPos: { x: mouseX, y: mouseY }
    });
    dragElementRef.current = element;
    
    dragStartElementPos.current = { x: element.x, y: element.y };

    // Prepare group drag positions and calculate initial bounding box from element data
    dragStartPositionsRef.current.clear();
    dragElementsDataRef.current.clear();
    pendingUpdatesRef.current.clear();
    let elementsToDrag: any[] = [element];
    
    if (projectActivePageId && typeof getSelectedElements === 'function') {
      const selected = getSelectedElements(projectActivePageId) || [] as any[];
      const isElementSelected = selected.some((el: any) => el.id === element.id);
      elementsToDrag = isElementSelected ? selected : [element];
      const idsToDrag = elementsToDrag.map((el: any) => {
        dragStartPositionsRef.current.set(el.id, { x: el.x, y: el.y });
        dragElementsDataRef.current.set(el.id, el); // Store full element data (includes width, height, radius, etc.)
        return el.id;
      });
      setDraggingIds(idsToDrag);
    } else {
      setDraggingIds([element.id]);
      dragStartPositionsRef.current.set(element.id, { x: element.x, y: element.y });
      dragElementsDataRef.current.set(element.id, element); // Store full element data
    }
    // Note: Bounding box is now rendered by individual elements themselves
  }, [selectedTool, projectActivePageId, getSelectedElements]);

  const handleElementDrag = useCallback((element: any, event: React.MouseEvent, canvasRef: React.RefObject<SVGSVGElement | null>) => {
    if (!dragState.isDragging || !dragState.dragElement || selectedTool !== 'NONE') {
      return;
    }

    event.stopPropagation();
    
    const svgElement = canvasRef.current;
    if (!svgElement) return;

    const { x: mouseX, y: mouseY } = screenToSVGCoordinates(event.clientX, event.clientY, svgElement);
    
    const deltaX = mouseX - dragState.dragStartPos.x;
    const deltaY = mouseY - dragState.dragStartPos.y;

    // Compute anchor (primary element) snapped delta if needed
    let anchorNewX = dragStartElementPos.current.x + deltaX;
    let anchorNewY = dragStartElementPos.current.y + deltaY;
    if (snapToGrid) {
      anchorNewX = Math.round(anchorNewX / gridSize) * gridSize;
      anchorNewY = Math.round(anchorNewY / gridSize) * gridSize;
    }
    const snappedDeltaX = anchorNewX - dragStartElementPos.current.x;
    const snappedDeltaY = anchorNewY - dragStartElementPos.current.y;

    if (projectActivePageId) {
      const idsToMove = draggingIds.length > 0 ? Array.from(new Set(draggingIds)) : [element.id];
      idsToMove.forEach((id) => {
        const start = dragStartPositionsRef.current.get(id) || dragStartElementPos.current;
        const nx = start.x + snappedDeltaX;
        const ny = start.y + snappedDeltaY;
        pendingUpdatesRef.current.set(id, { x: nx, y: ny });
      });
    }
  }, [dragState, selectedTool, snapToGrid, gridSize, projectActivePageId, onUpdateElement, draggingIds]);

  const handleElementDragEnd = useCallback((_element: any, event: React.MouseEvent) => {
    if (!dragState.isDragging || selectedTool !== 'NONE') {
      return;
    }

    event.stopPropagation();
    setDragState({
      isDragging: false,
      dragElement: null,
      dragStartPos: { x: 0, y: 0 }
    });
    dragElementsDataRef.current.clear();
    if (projectActivePageId) {
      pendingUpdatesRef.current.forEach((pos, id) => {
        onUpdateElement(projectActivePageId, id, pos);
      });
    }
    pendingUpdatesRef.current.clear();
    setDraggingIds([]); // Clear dragging IDs
    // End history batch after drag completes
    useHistoryStore.getState().endBatch();
    // Notify global interaction bump to reset placement offsets
    useInteractionStore.getState().bumpInteraction();
    dragElementRef.current = null;
  }, [dragState.isDragging, selectedTool]);

  // Ensure drag continues even if mouse moves outside the SVG, and ends if mouseup happens outside
  useEffect(() => {
    if (!dragState.isDragging || !dragElementRef.current) return;
    
    const canvasRef = canvasRefRef.current;
    if (!canvasRef) return;
    
    const svgElement = canvasRef.current;
    if (!svgElement) return;
    
    const onMove = (e: MouseEvent) => {
      if (dragElementRef.current && dragState.isDragging) {
        // Convert window mouse event to SVG coordinates
        const { x: mouseX, y: mouseY } = screenToSVGCoordinates(e.clientX, e.clientY, svgElement);
        
        const deltaX = mouseX - dragState.dragStartPos.x;
        const deltaY = mouseY - dragState.dragStartPos.y;
        
        // Compute anchor (primary element) snapped delta if needed
        let anchorNewX = dragStartElementPos.current.x + deltaX;
        let anchorNewY = dragStartElementPos.current.y + deltaY;
        if (snapToGrid) {
          anchorNewX = Math.round(anchorNewX / gridSize) * gridSize;
          anchorNewY = Math.round(anchorNewY / gridSize) * gridSize;
        }
        const snappedDeltaX = anchorNewX - dragStartElementPos.current.x;
        const snappedDeltaY = anchorNewY - dragStartElementPos.current.y;
        
        if (projectActivePageId) {
          // Move all dragging ids using their own start positions plus snapped delta
          const idsToMove = draggingIds.length > 0 ? Array.from(new Set(draggingIds)) : [dragElementRef.current.id];
          idsToMove.forEach((id) => {
            const start = dragStartPositionsRef.current.get(id) || dragStartElementPos.current;
            const nx = start.x + snappedDeltaX;
            const ny = start.y + snappedDeltaY;
            onUpdateElement(projectActivePageId, id, { x: nx, y: ny });
          });
        }
      }
    };
    
    const onUp = (e: Event) => {
      if (dragElementRef.current) {
        // Create a synthetic React.MouseEvent-like object fallback
        // @ts-ignore
        handleElementDragEnd(dragElementRef.current, e);
      }
    };
    
    // Listen at window level to capture events even outside SVG
    window.addEventListener('mousemove', onMove, true);
    window.addEventListener('pointermove', onMove, true);
    window.addEventListener('mouseup', onUp, true);
    window.addEventListener('pointerup', onUp, true);
    window.addEventListener('blur', onUp, true);
    
    return () => {
      window.removeEventListener('mousemove', onMove, true);
      window.removeEventListener('pointermove', onMove, true);
      window.removeEventListener('mouseup', onUp, true);
      window.removeEventListener('pointerup', onUp, true);
      window.removeEventListener('blur', onUp, true);
    };
  }, [dragState.isDragging, dragState.dragStartPos, selectedTool, snapToGrid, gridSize, projectActivePageId, onUpdateElement, draggingIds, handleElementDragEnd]);

  const handleMouseMove = useCallback((event: React.MouseEvent, canvasRef: React.RefObject<SVGSVGElement | null>) => {
    if (dragState.isDragging && dragState.dragElement) {
      handleElementDrag(dragState.dragElement, event, canvasRef);
    }
  }, [dragState.isDragging, dragState.dragElement, handleElementDrag]);

  const handleMouseUp = useCallback((event: React.MouseEvent) => {
    if (dragState.isDragging && dragState.dragElement) {
      handleElementDragEnd(dragState.dragElement, event);
    }
  }, [dragState.isDragging, dragState.dragElement, handleElementDragEnd]);

  return {
    draggingIds,
    handleElementDragStart,
    handleMouseMove,
    handleMouseUp
    // Note: handleElementDrag and handleElementDragEnd are used internally, not exposed
  };
}; 