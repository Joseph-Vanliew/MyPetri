import { useState, useCallback, RefObject, useEffect } from 'react';
import { screenToSVGCoordinates } from '../utils/coordinateUtils';

interface ZoomAndPanOptions {
  minZoomFactor?: number;
  maxZoomFactor?: number;
  zoomSensitivity?: number;
  initialZoomLevel?: number;
  initialPanOffset?: { x: number; y: number };
  onViewChange?: (view: { zoomLevel: number, panOffset: {x: number, y: number} }) => void;
  baseWidth?: number;
}

const mapVBtoView = (vb: {x:number, y:number, w:number, h:number}, baseW: number) => {
    const zoomLevel = baseW > 0 && vb.w > 0 ? baseW / vb.w : 1;
    return {
        zoomLevel: zoomLevel,
        panOffset: { x: vb.x, y: vb.y }
    };
}

const mapZPtoVB = (zoom: number, pan: {x:number, y:number}, baseW: number, aspectRatio: number) => {
    const safeZoom = Math.max(zoom, 0.0001); 
    const newW = baseW / safeZoom;
    const newH = aspectRatio > 0 ? newW / aspectRatio : newW;
    return {
        x: pan.x,
        y: pan.y,
        w: newW,
        h: newH
    }
}

export function useZoomAndPan(
  svgRef: RefObject<SVGSVGElement>,
  options: ZoomAndPanOptions
) {
  const {
    minZoomFactor = 0.5,
    maxZoomFactor = 4,
    zoomSensitivity = 0.04,
    initialZoomLevel = 1,
    initialPanOffset = { x: 0, y: 0 },
    onViewChange,
    baseWidth = 1500
  } = options;

  const initialAspectRatio = baseWidth ? baseWidth / (baseWidth * 9 / 16) : 16 / 9; 
  
  const initialVB = mapZPtoVB(initialZoomLevel, initialPanOffset, baseWidth, initialAspectRatio);
  
  const [viewBox, setViewBox] = useState(initialVB);
  const [isPanning, setIsPanning] = useState(false);
  const [lastMouseX, setLastMouseX] = useState(0);
  const [lastMouseY, setLastMouseY] = useState(0);

  useEffect(() => {
      const newVB = mapZPtoVB(initialZoomLevel, initialPanOffset, baseWidth, initialAspectRatio);
      if (newVB.x !== viewBox.x || newVB.y !== viewBox.y || newVB.w !== viewBox.w || newVB.h !== viewBox.h) {
           setViewBox(newVB);
      }
  }, [initialZoomLevel, initialPanOffset, baseWidth, initialAspectRatio]);
  
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
    if (!isPanning || !svgRef.current) return;
    const dx = e.clientX - lastMouseX;
    const dy = e.clientY - lastMouseY;
    const svgRect = svgRef.current.getBoundingClientRect();
    const scaleX = svgRect.width > 0 ? viewBox.w / svgRect.width : 1;
    const scaleY = svgRect.height > 0 ? viewBox.h / svgRect.height : 1;
    const moveX = dx * scaleX;
    const moveY = dy * scaleY;
    
    const newVB = {
      ...viewBox,
      x: viewBox.x - moveX,
      y: viewBox.y - moveY,
    };
    setViewBox(newVB);
    if (onViewChange) {
        onViewChange(mapVBtoView(newVB, baseWidth));
    }
    setLastMouseX(e.clientX);
    setLastMouseY(e.clientY);
  }, [isPanning, lastMouseX, lastMouseY, viewBox, svgRef, onViewChange, baseWidth]);
  

  const handleZoom = useCallback((/* e: React.WheelEvent<SVGSVGElement> */) => {
  }, []); 

  useEffect(() => {
    const svgElement = svgRef.current;
    if (!svgElement) return;

    const wheelListener = (e: WheelEvent) => {
        e.preventDefault();

        const svg = svgRef.current;
        if (!svg) return; // Re-check ref inside listener

        const direction = e.deltaY < 0 ? -1 : 1;
        
        // Calculate current zoom based on the current viewBox state
        const currentZoom = baseWidth > 0 && viewBox.w > 0 ? baseWidth / viewBox.w : 1;
        let newZoom = currentZoom * (1 - direction * zoomSensitivity); 
        
        newZoom = Math.max(minZoomFactor, Math.min(maxZoomFactor, newZoom));

        if (newZoom === currentZoom) return; // No change

        // Get coordinates relative to SVG
        const coords = screenToSVGCoordinates(e.clientX, e.clientY, svg);
        
        // Calculate new viewBox dimensions and position based on zoom point
        const aspectRatio = viewBox.h > 0 ? viewBox.w / viewBox.h : initialAspectRatio;
        const newW = baseWidth / newZoom;
        const newH = aspectRatio > 0 ? newW / aspectRatio : newW;
        const percentX = viewBox.w !== 0 ? (coords.x - viewBox.x) / viewBox.w : 0;
        const percentY = viewBox.h !== 0 ? (coords.y - viewBox.y) / viewBox.h : 0;
        const newX = coords.x - percentX * newW;
        const newY = coords.y - percentY * newH;

        const newVB = { x: newX, y: newY, w: newW, h: newH };
        
        // Update the state - triggers re-render
        setViewBox(newVB);

        // Notify parent component via callback
        if (onViewChange) {
            onViewChange({ zoomLevel: newZoom, panOffset: { x: newX, y: newY } });
        }
    };

    // Add the listener (without passive: false for now)
    svgElement.addEventListener('wheel', wheelListener);

    // Cleanup function to remove the listener
    return () => {
      svgElement.removeEventListener('wheel', wheelListener);
    };
  // Dependencies: Include everything used inside the listener that comes from outside
  }, [svgRef, viewBox, baseWidth, zoomSensitivity, minZoomFactor, maxZoomFactor, initialAspectRatio, onViewChange, setViewBox]); 

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