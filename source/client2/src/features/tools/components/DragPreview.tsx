import React, { useEffect, useCallback, useMemo } from 'react';
import { useToolbarStore, useCanvasStore } from '../../../stores/index.js';
import { useGridStore } from '../../../stores/gridStore.js';
import { ELEMENT_DEFAULT_SIZES } from '../../elements/registry/ElementTypes.js';

const DragPreview: React.FC = () => {
  const { isDraggingFromToolbar, draggedElementType, dragPreviewPosition, updateDragPreviewPosition } = useToolbarStore();
  const { zoomLevel } = useCanvasStore();
  const { gridSize } = useGridStore();



  // Optimized event handlers with useCallback
  const handleDragOver = useCallback((e: DragEvent) => {
    updateDragPreviewPosition({ x: e.clientX, y: e.clientY });
  }, [updateDragPreviewPosition]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    updateDragPreviewPosition({ x: e.clientX, y: e.clientY });
  }, [updateDragPreviewPosition]);

  // Keep preview position in sync with cursor globally
  useEffect(() => {
    if (!isDraggingFromToolbar) return;
    
    document.addEventListener('dragover', handleDragOver);
    document.addEventListener('mousemove', handleMouseMove);
    return () => {
      document.removeEventListener('dragover', handleDragOver);
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, [isDraggingFromToolbar, handleDragOver, handleMouseMove]);

  // Note: Preview is now always visible during drag operations
  // This provides a consistent experience whether over canvas or other areas

  // Always show preview, scaled to zoom, so size matches final render

  // Memoized element dimensions to avoid recalculation
  const { scaledWidth, scaledHeight } = useMemo(() => {
    if (!draggedElementType) return { scaledWidth: 60 * zoomLevel, scaledHeight: 40 * zoomLevel };
    
    // Map tool types to element types for lookup
    const toolToElementMap: Record<string, keyof typeof ELEMENT_DEFAULT_SIZES> = {
      'PLACE': 'place',
      'TRANSITION': 'transition',
      'ARC': 'arc',
      'ARC_INHIBITOR': 'arc',
      'ARC_BIDIRECTIONAL': 'arc',
      'TEXT': 'text',
      'SHAPE': 'shape'
    };
    
    const elementType = toolToElementMap[draggedElementType];
    
    let width = 60, height = 40; // fallback
    
    if (elementType && ELEMENT_DEFAULT_SIZES[elementType]) {
      const defaultSize = ELEMENT_DEFAULT_SIZES[elementType];
      width = defaultSize.width;
      height = defaultSize.height;
    }
    
    return {
      scaledWidth: width * zoomLevel,
      scaledHeight: height * zoomLevel
    };
  }, [draggedElementType, zoomLevel]);

  // Simple cursor tracking for immediate response
  const cursorPosition = useMemo(() => ({
    left: dragPreviewPosition ? dragPreviewPosition.x - scaledWidth / 2 : 0,
    top: dragPreviewPosition ? dragPreviewPosition.y - scaledHeight / 2 : 0
  }), [dragPreviewPosition, scaledWidth, scaledHeight]);

  // Expensive canvas calculations with debouncing
  const { left, top, isOverCanvas } = useMemo(() => {
    if (!dragPreviewPosition) return { left: 0, top: 0, isOverCanvas: false, canvasPosition: null };
    
    // Check if cursor is over the canvas
    const canvasEl = document.querySelector('.canvas-svg') as SVGSVGElement | null;
    if (canvasEl) {
      const rect = canvasEl.getBoundingClientRect();
      const isOver = dragPreviewPosition.x >= rect.left && 
                     dragPreviewPosition.x <= rect.right && 
                     dragPreviewPosition.y >= rect.top && 
                     dragPreviewPosition.y <= rect.bottom;
      
      if (isOver) {
        // Convert screen coordinates to SVG viewBox coordinates
        const viewBox = canvasEl.viewBox.baseVal;
        const svgX = ((dragPreviewPosition.x - rect.left) / rect.width) * viewBox.width + viewBox.x;
        const svgY = ((dragPreviewPosition.y - rect.top) / rect.height) * viewBox.height + viewBox.y;
        
        // Snap to grid using actual grid size from store
        const snappedX = Math.round(svgX / gridSize) * gridSize;
        const snappedY = Math.round(svgY / gridSize) * gridSize;
        
        // Convert back to screen coordinates for positioning
        const screenX = ((snappedX - viewBox.x) / viewBox.width) * rect.width + rect.left;
        const screenY = ((snappedY - viewBox.y) / viewBox.height) * rect.height + rect.top;
        
        return {
          left: screenX - scaledWidth / 2,
          top: screenY - scaledHeight / 2,
          isOverCanvas: true,
          canvasPosition: { x: snappedX, y: snappedY }
        };
      }
    }
    
    // Default positioning for non-canvas areas
    return {
      left: dragPreviewPosition.x - scaledWidth / 2,
      top: dragPreviewPosition.y - scaledHeight / 2,
      isOverCanvas: false,
      canvasPosition: null
    };
  }, [dragPreviewPosition, scaledWidth, scaledHeight, gridSize]);

  // Don't render if not dragging (moved after all hooks)
  if (!isDraggingFromToolbar || !draggedElementType || !dragPreviewPosition) {
    return null;
  }

  // Render overlay preview
  const renderOverlayPreview = () => {
    // Map tool types to element types
    const toolToElementMap: Record<string, string> = {
      'PLACE': 'place',
      'TRANSITION': 'transition',
      'ARC': 'arc',
      'ARC_INHIBITOR': 'arc',
      'ARC_BIDIRECTIONAL': 'arc',
      'TEXT': 'text',
      'SHAPE': 'shape'
    };
    
    const elementType = toolToElementMap[draggedElementType];
    
    if (elementType) {

      // Generic styling based on element type
      const baseStyle: React.CSSProperties = {
        width: scaledWidth,
        height: scaledHeight,
        border: '3px solid #ffffff',
        backgroundColor: '#0f0f0f',
        opacity: 0.5,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontWeight: 'bold',
        boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
      };
      
      // Element-specific styling
      if (elementType === 'place') {
        baseStyle.borderRadius = '50%';
        baseStyle.fontSize = `${24 * zoomLevel}px`;
      } else if (elementType === 'transition') {
        baseStyle.borderRadius = `${8 * zoomLevel}px`;
        baseStyle.fontSize = `${20 * zoomLevel}px`;
        baseStyle.fontFamily = 'sans-serif';
      }
      
      const content = elementType === 'place' ? '0' : elementType.charAt(0).toUpperCase();
      
      return (
        <div style={baseStyle}>
          {content}
        </div>
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
          opacity: isOverCanvas ? 0.6 : 0.8,
          pointerEvents: 'none',
          transform: isOverCanvas ? 'scale(0.95)' : 'none',
          transition: isOverCanvas ? 'opacity 0.1s ease, transform 0.1s ease' : 'none'
        }}
      >
        {renderOverlayPreview()}
      </div>
    </div>
  );
};

export default DragPreview; 
