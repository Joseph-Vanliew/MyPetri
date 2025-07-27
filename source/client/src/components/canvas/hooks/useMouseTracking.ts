import { useState, useCallback, useEffect, RefObject } from 'react';
import { screenToSVGCoordinates } from '../utils/coordinateUtils';

// Define type allowing null
type MousePosition = { x: number; y: number } | null;

export function useMouseTracking(
  svgRef: RefObject<SVGSVGElement>,
  options: {
    enabled: boolean;
  }
) {
  const { enabled } = options;
  // Initialize state to null
  const [mousePosition, setMousePosition] = useState<MousePosition>(null);
  
  const updateMousePosition = useCallback((clientX: number, clientY: number) => {
    if (!svgRef.current) return;
    const coords = screenToSVGCoordinates(clientX, clientY, svgRef.current);
    setMousePosition(coords);
  }, [svgRef]);
  
  useEffect(() => {
    if (!enabled || !svgRef.current) return; 
    const handleMouseMove = (e: MouseEvent) => {
      updateMousePosition(e.clientX, e.clientY);
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [enabled, svgRef, updateMousePosition]);
  
  // Expose setter
  const setExternalMousePosition = useCallback((pos: { x: number; y: number } | null) => {
      setMousePosition(pos);
  }, []);

  return {
    mousePosition,
    setMousePosition: setExternalMousePosition, 
    updateMousePosition
  };
} 