import { useState, useCallback, useEffect, RefObject } from 'react';
import { screenToSVGCoordinates } from '../utils/coordinateUtils';

export function useMouseTracking(
  svgRef: RefObject<SVGSVGElement>,
  options: {
    enabled: boolean;
    initialPosition?: { x: number; y: number };
  }
) {
  const { enabled, initialPosition = { x: 0, y: 0 } } = options;
  const [mousePosition, setMousePosition] = useState(initialPosition);
  
  const updateMousePosition = useCallback((clientX: number, clientY: number) => {
    if (!enabled || !svgRef.current) return;
    
    const coords = screenToSVGCoordinates(clientX, clientY, svgRef.current);
    setMousePosition(coords);
  }, [enabled, svgRef]);
  
  // Add global mouse move listener
  useEffect(() => {
    if (!enabled || !svgRef.current) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      updateMousePosition(e.clientX, e.clientY);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, [enabled, svgRef, updateMousePosition]);
  
  return {
    mousePosition,
    setMousePosition,
    updateMousePosition
  };
} 