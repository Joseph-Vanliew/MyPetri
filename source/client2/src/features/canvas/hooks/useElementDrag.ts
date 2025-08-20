import { useState, useRef, useCallback } from 'react';
import { screenToSVGCoordinates } from '../../canvas/utils/coordinateUtils.js';
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
  const draggingIdsRef = useRef<string[]>([]);

  const handleElementDragStart = useCallback((element: any, event: React.MouseEvent, canvasRef: React.RefObject<SVGSVGElement | null>) => {
    // Only allow dragging when no tool is selected (NONE tool)
    if (selectedTool !== 'NONE') {
      return;
    }

    event.stopPropagation();
    
    const svgElement = canvasRef.current;
    if (!svgElement) return;

    const { x: mouseX, y: mouseY } = screenToSVGCoordinates(event.clientX, event.clientY, svgElement);
    
    setDragState({
      isDragging: true,
      dragElement: element,
      dragStartPos: { x: mouseX, y: mouseY }
    });
    
    dragStartElementPos.current = { x: element.x, y: element.y };

    // Prepare group drag positions
    draggingIdsRef.current = [];
    dragStartPositionsRef.current.clear();
    if (projectActivePageId && typeof getSelectedElements === 'function') {
      const selected = getSelectedElements(projectActivePageId) || [] as any[];
      const isElementSelected = selected.some((el: any) => el.id === element.id);
      const group = isElementSelected ? selected : [element];
      group.forEach((el: any) => {
        draggingIdsRef.current.push(el.id);
        dragStartPositionsRef.current.set(el.id, { x: el.x, y: el.y });
      });
    } else {
      draggingIdsRef.current = [element.id];
      dragStartPositionsRef.current.set(element.id, { x: element.x, y: element.y });
    }
  }, [selectedTool]);

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
      // Move all dragging ids using their own start positions plus snapped delta
      const idsToMove = draggingIdsRef.current.length > 0 ? draggingIdsRef.current : [element.id];
      idsToMove.forEach((id) => {
        const start = dragStartPositionsRef.current.get(id) || dragStartElementPos.current;
        const nx = start.x + snappedDeltaX;
        const ny = start.y + snappedDeltaY;
        onUpdateElement(projectActivePageId, id, { x: nx, y: ny });
      });
    }
  }, [dragState, selectedTool, snapToGrid, gridSize, projectActivePageId, onUpdateElement]);

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
  }, [dragState.isDragging, selectedTool]);

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
    isDragging: dragState.isDragging,
    handleElementDragStart,
    handleElementDrag,
    handleElementDragEnd,
    handleMouseMove,
    handleMouseUp
  };
}; 