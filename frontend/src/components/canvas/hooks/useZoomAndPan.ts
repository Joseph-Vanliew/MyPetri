import { useState, useCallback, RefObject } from 'react';
import { screenToSVGCoordinates } from '../utils/coordinateUtils';

interface ZoomAndPanOptions {
  minZoom?: number;
  maxZoom?: number;
  zoomFactor?: number;
  initialViewBox: { x: number; y: number; w: number; h: number };
}

export function useZoomAndPan(
  svgRef: RefObject<SVGSVGElement>,
  options: ZoomAndPanOptions
) {
  const {
    minZoom = 200,
    maxZoom = 3000,
    zoomFactor = 0.04,
    initialViewBox
  } = options;
  
  const [viewBox, setViewBox] = useState(initialViewBox);
  const [isPanning, setIsPanning] = useState(false);
  const [lastMouseX, setLastMouseX] = useState(0);
  const [lastMouseY, setLastMouseY] = useState(0);
  
  const handleMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (e.target === e.currentTarget) {
      e.stopPropagation();
      setIsPanning(true);
      setLastMouseX(e.clientX);
      setLastMouseY(e.clientY);
    }
  }, []);
  
  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);
  
  const handleMouseLeave = useCallback(() => {
    setIsPanning(false);
  }, []);
  
  const handlePan = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!isPanning) return;
    
    const dx = e.clientX - lastMouseX;
    const dy = e.clientY - lastMouseY;
    
    // Convert screen dx,dy to the "viewBox" coordinate space
    const svgRect = e.currentTarget.getBoundingClientRect();
    const scaleX = viewBox.w / svgRect.width;
    const scaleY = viewBox.h / svgRect.height;
    
    const moveX = dx * scaleX;
    const moveY = dy * scaleY;
    
    // Update the viewBox
    setViewBox((v) => ({
      ...v,
      x: v.x - moveX,
      y: v.y - moveY,
    }));
    
    // Store the new lastMouse coords for next move
    setLastMouseX(e.clientX);
    setLastMouseY(e.clientY);
  }, [isPanning, lastMouseX, lastMouseY, viewBox]);
  
  const handleZoom = useCallback((e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    
    // If deltaY < 0, user is scrolling up => zoom in (decrease w/h).
    // If deltaY > 0, user is scrolling down => zoom out (increase w/h).
    const direction = e.deltaY < 0 ? -1 : 1;
    
    // Calculate new width/height
    const newW = viewBox.w * (1 + direction * zoomFactor);
    const newH = viewBox.h * (1 + direction * zoomFactor);
    
    // Don't allow zooming beyond limits
    if (newW < minZoom || newH < minZoom || newW > maxZoom || newH > maxZoom) {
      return;
    }
    
    // Get mouse position in SVG coordinates
    const coords = screenToSVGCoordinates(e.clientX, e.clientY, svgRef.current);
    
    // Calculate the percentage of the viewBox where the mouse is
    const percentX = (coords.x - viewBox.x) / viewBox.w;
    const percentY = (coords.y - viewBox.y) / viewBox.h;
    
    // Calculate new viewBox position to zoom toward mouse position
    const newX = coords.x - percentX * newW;
    const newY = coords.y - percentY * newH;
    
    setViewBox({ x: newX, y: newY, w: newW, h: newH });
  }, [viewBox, minZoom, maxZoom, zoomFactor, svgRef]);
  
  return {
    viewBox,
    setViewBox,
    isPanning,
    handleMouseDown,
    handleMouseUp,
    handleMouseLeave,
    handlePan,
    handleZoom
  };
} 