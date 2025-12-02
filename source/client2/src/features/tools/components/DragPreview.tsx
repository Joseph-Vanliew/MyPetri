import React, { useEffect, useCallback, useMemo, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useToolbarStore } from '../../../stores/toolbarStore';
import { useGridStore } from '../../../stores/gridStore';
import { ELEMENT_DEFAULT_SIZES } from '../../elements/registry/ElementTypes';
import { screenToSVGCoordinates, svgToScreenCoordinates } from '../../canvas/utils/coordinateUtils';
import '../tools.css';

// Fixed scale for drag preview when NOT over canvas (static size)
const DEFAULT_DRAG_PREVIEW_SCALE = 1.0; // Fixed pixel scale for toolbar/preview area

const DragPreview: React.FC = () => {
  const {
    isDraggingFromToolbar,
    draggedElementType,
    dragPreviewPosition,
    updateDragPreviewPosition,
    toolOptions,
  } = useToolbarStore(
    useShallow((state) => ({
      isDraggingFromToolbar: state.isDraggingFromToolbar,
      draggedElementType: state.draggedElementType,
      dragPreviewPosition: state.dragPreviewPosition,
      updateDragPreviewPosition: state.updateDragPreviewPosition,
      toolOptions: state.toolOptions,
    }))
  );
  const { gridSize, snapToGrid } = useGridStore(
    useShallow((state) => ({
      gridSize: state.gridSize,
      snapToGrid: state.snapToGrid,
    }))
  );



  // Throttled dragover handler to avoid excessive updates
  const rafIdRef = useRef<number | null>(null);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);

  const handleDragOver = useCallback((e: DragEvent) => {
    lastPosRef.current = { x: e.clientX, y: e.clientY };
    if (rafIdRef.current === null) {
      rafIdRef.current = requestAnimationFrame(() => {
        rafIdRef.current = null;
        if (lastPosRef.current) {
          updateDragPreviewPosition(lastPosRef.current);
        }
      });
    }
  }, [updateDragPreviewPosition]);

  // Keep preview position in sync with cursor globally
  useEffect(() => {
    if (!isDraggingFromToolbar) return;
    
    // Use capture to ensure we receive the event consistently during HTML5 DnD
    document.addEventListener('dragover', handleDragOver, true);
    return () => {
      document.removeEventListener('dragover', handleDragOver, true);
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [isDraggingFromToolbar, handleDragOver]);

  // Determine element size in SVG units based on current tool options
  const { elementWidthSvg, elementHeightSvg, elementTypeKey } = useMemo(() => {
    if (!draggedElementType) {
      return { elementWidthSvg: 60, elementHeightSvg: 40, elementTypeKey: 'generic' as const };
    }
    const toolToElementMap: Record<string, 'place' | 'transition' | 'text' | 'shape' | 'arc' | 'generic'> = {
      'PLACE': 'place',
      'TRANSITION': 'transition',
      'ARC': 'arc',
      'ARC_INHIBITOR': 'arc',
      'ARC_BIDIRECTIONAL': 'arc',
      'TEXT': 'text',
      'SHAPE': 'shape'
    };
    const elementType = toolToElementMap[draggedElementType] ?? 'generic';
    if (elementType === 'place') {
      const r = toolOptions.PLACE?.radius ?? ELEMENT_DEFAULT_SIZES.place.width / 2;
      return { elementWidthSvg: r * 2, elementHeightSvg: r * 2, elementTypeKey: 'place' as const };
    }
    if (elementType === 'transition') {
      const w = toolOptions.TRANSITION?.width ?? ELEMENT_DEFAULT_SIZES.transition.width;
      const h = toolOptions.TRANSITION?.height ?? ELEMENT_DEFAULT_SIZES.transition.height;
      return { elementWidthSvg: w, elementHeightSvg: h, elementTypeKey: 'transition' as const };
    }
    if (elementType === 'text') {
      return { elementWidthSvg: ELEMENT_DEFAULT_SIZES.text.width, elementHeightSvg: ELEMENT_DEFAULT_SIZES.text.height, elementTypeKey: 'text' as const };
    }
    if (elementType === 'shape') {
      return { elementWidthSvg: ELEMENT_DEFAULT_SIZES.shape.width, elementHeightSvg: ELEMENT_DEFAULT_SIZES.shape.height, elementTypeKey: 'shape' as const };
    }
    return { elementWidthSvg: 60, elementHeightSvg: 40, elementTypeKey: 'generic' as const };
  }, [draggedElementType, toolOptions]);

  // Simple cursor tracking for immediate response (uses fixed scale, not zoom-dependent)
  const cursorPosition = useMemo(() => ({
    left: dragPreviewPosition ? dragPreviewPosition.x - (elementWidthSvg * DEFAULT_DRAG_PREVIEW_SCALE) / 2 : 0,
    top: dragPreviewPosition ? dragPreviewPosition.y - (elementHeightSvg * DEFAULT_DRAG_PREVIEW_SCALE) / 2 : 0
  }), [dragPreviewPosition, elementWidthSvg, elementHeightSvg]);

  // Expensive canvas calculations with debouncing
  const { left, top, isOverCanvas, pxPerUnitX, pxPerUnitY, paddingUnits } = useMemo((): {
    left: number;
    top: number;
    isOverCanvas: boolean;
    pxPerUnitX?: number;
    pxPerUnitY?: number;
    paddingUnits: number;
  } => {
    if (!dragPreviewPosition) return { left: 0, top: 0, isOverCanvas: false, paddingUnits: 3 };
    
    // Check if cursor is over the canvas content area (not just SVG element)
    // Use .canvas-content to get the actual interactable area, excluding header
    const canvasContent = document.querySelector('.canvas-content') as HTMLElement | null;
    const canvasEl = document.querySelector('.canvas-svg') as SVGSVGElement | null;
    
    if (canvasContent && canvasEl) {
      // Check against the canvas-content bounds (excludes header/toolbar)
      const contentRect = canvasContent.getBoundingClientRect();
      const isOverContent = dragPreviewPosition.x >= contentRect.left && 
                            dragPreviewPosition.x <= contentRect.right && 
                            dragPreviewPosition.y >= contentRect.top && 
                            dragPreviewPosition.y <= contentRect.bottom;
      
      if (isOverContent) {
        // Get SVG rect for coordinate calculations
        const svgRect = canvasEl.getBoundingClientRect();
        const pxPerUnitXLocal = svgRect.width / canvasEl.viewBox.baseVal.width;
        const pxPerUnitYLocal = svgRect.height / canvasEl.viewBox.baseVal.height;
        const paddingUnitsLocal = 3; // extra viewBox padding to prevent stroke clipping
        
        // Convert screen coordinates to SVG viewBox coordinates
        const svgPoint = screenToSVGCoordinates(dragPreviewPosition.x, dragPreviewPosition.y, canvasEl);
        const svgX = svgPoint.x;
        const svgY = svgPoint.y;
        
        // Snap to grid only when enabled
        const snappedX = snapToGrid ? Math.round(svgX / gridSize) * gridSize : svgX;
        const snappedY = snapToGrid ? Math.round(svgY / gridSize) * gridSize : svgY;
        
        // Convert back to screen coordinates for positioning
        const screenPoint = svgToScreenCoordinates(snappedX, snappedY, canvasEl);
        const screenX = screenPoint.x;
        const screenY = screenPoint.y;
        
        return {
          left: screenX - ((elementWidthSvg + 2 * paddingUnitsLocal) * pxPerUnitXLocal) / 2,
          top: screenY - ((elementHeightSvg + 2 * paddingUnitsLocal) * pxPerUnitYLocal) / 2,
          isOverCanvas: true,
          pxPerUnitX: pxPerUnitXLocal,
          pxPerUnitY: pxPerUnitYLocal,
          paddingUnits: paddingUnitsLocal
        };
      }
    }
    
    // Default positioning for non-canvas areas (uses fixed static scale)
    return {
      left: dragPreviewPosition.x - ((elementWidthSvg + 6) * DEFAULT_DRAG_PREVIEW_SCALE) / 2,
      top: dragPreviewPosition.y - ((elementHeightSvg + 6) * DEFAULT_DRAG_PREVIEW_SCALE) / 2,
      isOverCanvas: false,
      pxPerUnitX: undefined,
      pxPerUnitY: undefined,
      paddingUnits: 3
    };
  }, [dragPreviewPosition, gridSize, snapToGrid, elementWidthSvg, elementHeightSvg]);

  // Don't render if not dragging (moved after all hooks)
  if (!isDraggingFromToolbar || !draggedElementType || !dragPreviewPosition) {
    return null;
  }

  // Render overlay preview 
  const renderOverlayPreview = () => {
    if (elementTypeKey === 'place') {
      const rSvg = elementWidthSvg / 2;
      // Use canvas zoom scale only when over canvas, otherwise use fixed static scale
      const scaleX = isOverCanvas && pxPerUnitX ? pxPerUnitX : DEFAULT_DRAG_PREVIEW_SCALE;
      const scaleY = isOverCanvas && pxPerUnitY ? pxPerUnitY : DEFAULT_DRAG_PREVIEW_SCALE;
      const widthPx = (elementWidthSvg + 2 * paddingUnits) * scaleX;
      const heightPx = (elementHeightSvg + 2 * paddingUnits) * scaleY;
      return (
        <svg width={widthPx} height={heightPx} viewBox={`0 0 ${elementWidthSvg + 2 * paddingUnits} ${elementHeightSvg + 2 * paddingUnits}`}>
          <g className="place-element" transform={`translate(${paddingUnits + rSvg},${paddingUnits + rSvg})`} opacity={0.6}>
            <circle r={rSvg} className="place-circle" />
            <text x="0" y="0" className="token-count">0</text>
          </g>
        </svg>
      );
    }
    if (elementTypeKey === 'transition') {
      // Use canvas zoom scale only when over canvas, otherwise use fixed static scale
      const scaleX = isOverCanvas && pxPerUnitX ? pxPerUnitX : DEFAULT_DRAG_PREVIEW_SCALE;
      const scaleY = isOverCanvas && pxPerUnitY ? pxPerUnitY : DEFAULT_DRAG_PREVIEW_SCALE;
      const widthPx = (elementWidthSvg + 2 * paddingUnits) * scaleX;
      const heightPx = (elementHeightSvg + 2 * paddingUnits) * scaleY;
      return (
        <svg width={widthPx} height={heightPx} viewBox={`0 0 ${elementWidthSvg + 2 * paddingUnits} ${elementHeightSvg + 2 * paddingUnits}`}>
          <g className="transition-element" transform={`translate(${paddingUnits + elementWidthSvg / 2},${paddingUnits + elementHeightSvg / 2})`} opacity={0.6}>
            <rect x={-elementWidthSvg / 2} y={-elementHeightSvg / 2} width={elementWidthSvg} height={elementHeightSvg} rx={8} className="transition-rectangle" />
          </g>
        </svg>
      );
    }
    return null;
  };

  return (
    <div 
      className="drag-preview"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 1000
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: isOverCanvas ? left : cursorPosition.left,
          top: isOverCanvas ? top : cursorPosition.top,
          opacity: 1,
          pointerEvents: 'none',
          transition: 'opacity 0.1s ease'
        }}
      >
        {renderOverlayPreview()}
      </div>
    </div>
  );
};

export default DragPreview; 
