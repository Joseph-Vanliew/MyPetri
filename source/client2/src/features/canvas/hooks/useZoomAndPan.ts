import { useCallback, useEffect, useRef } from 'react';
import { useCanvasStore } from '../../../stores/index.js';


export const useZoomAndPan = () => {
  const { zoomLevel, panOffset, setZoomLevel, setPanOffset } = useCanvasStore();
  const canvasRef = useRef<SVGSVGElement>(null);

  // Zoom with Ctrl/Cmd + Mouse Wheel
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const isZooming = e.ctrlKey || e.metaKey;
    const isPanning = !isZooming;
    
    if (isZooming) {
      // Zoom in/out 
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.max(0.1, Math.min(5, zoomLevel * zoomFactor));
      setZoomLevel(newZoom);
    } else if (isPanning) {
      // Pan with mouse wheel - reduced sensitivity
      const panSpeed = 5; // Reduced from 20
      
      // Add tolerance for direction detection
      const tolerance = 2; // Minimum delta to consider a direction
      
      // Handle horizontal scrolling (trackpad or shift+wheel)
      if ((Math.abs(e.deltaX) > tolerance && Math.abs(e.deltaX) > Math.abs(e.deltaY)) || e.shiftKey) {
        const deltaX = e.deltaX !== 0 ? e.deltaX : e.deltaY; // Use deltaX for trackpad, deltaY for shift+wheel
        setPanOffset({
          x: panOffset.x - deltaX * panSpeed, // Flipped direction: negative deltaX moves canvas right
          y: panOffset.y
        });
      } else if (Math.abs(e.deltaY) > tolerance) {
        // Normal wheel = vertical pan (up/down)
        const deltaY = e.deltaY;
        setPanOffset({
          x: panOffset.x,
          y: panOffset.y - deltaY * panSpeed
        });
      }
    }
  }, [zoomLevel, panOffset, setZoomLevel, setPanOffset]);

  // Keyboard zoom controls
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const isZooming = e.ctrlKey || e.metaKey;
    
    if (isZooming) {
      switch (e.key) {
        case '=':
        case '+':
          e.preventDefault();
          setZoomLevel(Math.min(5, zoomLevel * 1.1));
          break;
        case '-':
          e.preventDefault();
          setZoomLevel(Math.max(0.1, zoomLevel * 0.9));
          break;
        case '0':
          e.preventDefault();
          setZoomLevel(1);
          break;
      }
    }
  }, [zoomLevel, setZoomLevel]);

  // Middle mouse button panning
  const isPanning = useRef(false);
  const lastMousePos = useRef({ x: 0, y: 0 });

  const handleMouseDown = useCallback((e: MouseEvent) => {
    if (e.button === 1) { // Middle mouse button
      e.preventDefault();
      e.stopPropagation();
      isPanning.current = true;
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    }
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isPanning.current) {
      const deltaX = e.clientX - lastMousePos.current.x;
      const deltaY = e.clientY - lastMousePos.current.y;
      
      setPanOffset({
        x: panOffset.x + deltaX,
        y: panOffset.y + deltaY
      });
      
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    }
  }, [panOffset, setPanOffset]);

  const handleMouseUp = useCallback(() => {
    isPanning.current = false;
  }, []);

  // Set up event listeners
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Find the canvas content container
    const canvasContent = canvas.closest('.canvas-content');
    if (!canvasContent) return;

    // Add event listeners
    const handleWheelWrapper = (e: WheelEvent) => handleWheel(e);
    const handleMouseDownWrapper = (e: MouseEvent) => handleMouseDown(e);
    const handleMouseMoveWrapper = (e: MouseEvent) => handleMouseMove(e);
    const handleMouseUpWrapper = () => handleMouseUp();
    const handleKeyDownWrapper = (e: KeyboardEvent) => handleKeyDown(e);

    // Add wheel events to canvas content container only (to avoid conflicts)
    canvasContent.addEventListener('wheel', handleWheelWrapper as EventListener, { passive: false });
    
    // Add mouse events to SVG element only
    canvas.addEventListener('mousedown', handleMouseDownWrapper);
    
    // Add to document for global events
    document.addEventListener('mousemove', handleMouseMoveWrapper);
    document.addEventListener('mouseup', handleMouseUpWrapper);
    document.addEventListener('keydown', handleKeyDownWrapper);

    return () => {
      canvasContent.removeEventListener('wheel', handleWheelWrapper as EventListener);
      canvas.removeEventListener('mousedown', handleMouseDownWrapper);
      document.removeEventListener('mousemove', handleMouseMoveWrapper);
      document.removeEventListener('mouseup', handleMouseUpWrapper);
      document.removeEventListener('keydown', handleKeyDownWrapper);
    };
  }, [handleWheel, handleMouseDown, handleMouseMove, handleMouseUp, handleKeyDown]);

  return { canvasRef };
}; 