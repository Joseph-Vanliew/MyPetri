import { useState, useRef, useCallback } from 'react';
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
}

export const useElementDrag = ({
  selectedTool,
  snapToGrid,
  gridSize,
  onUpdateElement,
  projectActivePageId
}: UseElementDragProps) => {
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    dragElement: null,
    dragStartPos: { x: 0, y: 0 }
  });
  
  const dragStartElementPos = useRef({ x: 0, y: 0 });

  const handleElementDragStart = useCallback((element: any, event: React.MouseEvent, canvasRef: React.RefObject<SVGSVGElement | null>) => {
    // Only allow dragging when no tool is selected (NONE tool)
    if (selectedTool !== 'NONE') {
      return;
    }

    event.stopPropagation();
    
    const svgElement = canvasRef.current;
    if (!svgElement) return;

    const rect = svgElement.getBoundingClientRect();
    const viewBox = svgElement.viewBox.baseVal;
    
    const mouseX = ((event.clientX - rect.left) / rect.width) * viewBox.width + viewBox.x;
    const mouseY = ((event.clientY - rect.top) / rect.height) * viewBox.height + viewBox.y;
    
    setDragState({
      isDragging: true,
      dragElement: element,
      dragStartPos: { x: mouseX, y: mouseY }
    });
    
    dragStartElementPos.current = { x: element.x, y: element.y };
  }, [selectedTool]);

  const handleElementDrag = useCallback((element: any, event: React.MouseEvent, canvasRef: React.RefObject<SVGSVGElement | null>) => {
    if (!dragState.isDragging || !dragState.dragElement || selectedTool !== 'NONE') {
      return;
    }

    event.stopPropagation();
    
    const svgElement = canvasRef.current;
    if (!svgElement) return;

    const rect = svgElement.getBoundingClientRect();
    const viewBox = svgElement.viewBox.baseVal;
    
    const mouseX = ((event.clientX - rect.left) / rect.width) * viewBox.width + viewBox.x;
    const mouseY = ((event.clientY - rect.top) / rect.height) * viewBox.height + viewBox.y;
    
    const deltaX = mouseX - dragState.dragStartPos.x;
    const deltaY = mouseY - dragState.dragStartPos.y;
    
    const newX = dragStartElementPos.current.x + deltaX;
    const newY = dragStartElementPos.current.y + deltaY;
    
    // Snap to grid if enabled
    const finalX = snapToGrid ? Math.round(newX / gridSize) * gridSize : newX;
    const finalY = snapToGrid ? Math.round(newY / gridSize) * gridSize : newY;
    
    // Update element position
    if (projectActivePageId) {
      onUpdateElement(projectActivePageId, element.id, { x: finalX, y: finalY });
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