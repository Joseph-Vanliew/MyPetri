import { useState, useEffect, useCallback, RefObject} from 'react';
import { UIPlace, UITransition } from '../../../types';
import { screenToSVGCoordinates } from '../utils/coordinateUtils';

interface SelectionBoxOptions {
    svgRef: RefObject<SVGSVGElement>;
    places: UIPlace[];
    transitions: UITransition[];
    onSelectionChange: (selectedIds: string[]) => void;
}

interface SelectionRect {
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    active: boolean;
}

export const useSelectionBox = ({
    svgRef,
    places,
    transitions,
    onSelectionChange,
}: SelectionBoxOptions) => {
    const [selectionRect, setSelectionRect] = useState<SelectionRect>({
        startX: 0,
        startY: 0,
        currentX: 0,
        currentY: 0,
        active: false,
    });
    const [isSelecting, setIsSelecting] = useState(false);
    // State flag to indicate selection just finished
    const [didJustSelect, setDidJustSelect] = useState(false);
    
    const getSvgCoordinates = useCallback((clientX: number, clientY: number) => {
        if (!svgRef.current) return { x: 0, y: 0 };
        return screenToSVGCoordinates(clientX, clientY, svgRef.current);
    }, [svgRef]);

    const handleMouseDown = useCallback((event: MouseEvent) => {
        // Reset the flag on any mousedown
        setDidJustSelect(false); 
        if (!event.shiftKey || !svgRef.current || event.button !== 0) return;
        event.stopPropagation();
        const { x, y } = getSvgCoordinates(event.clientX, event.clientY);
        setIsSelecting(true);
        setSelectionRect({ startX: x, startY: y, currentX: x, currentY: y, active: true });
    }, [svgRef, getSvgCoordinates]);

    const handleMouseMove = useCallback((event: MouseEvent) => {
        if (!isSelecting || !svgRef.current) return;
        const { x, y } = getSvgCoordinates(event.clientX, event.clientY);
        setSelectionRect(prev => ({ ...prev, currentX: x, currentY: y }));
    }, [isSelecting, svgRef, getSvgCoordinates]);

    const handleMouseUp = useCallback((event?: MouseEvent) => { 
        if (!isSelecting || !svgRef.current) return;
        
        event?.stopPropagation();
        
        // Set flag before resetting isSelecting or calling parent
        setDidJustSelect(true); 

        const finalRect = selectionRect; 
        setIsSelecting(false);
        setSelectionRect(prev => ({ ...prev, active: false }));

        const rectX = Math.min(finalRect.startX, finalRect.currentX);
        const rectY = Math.min(finalRect.startY, finalRect.currentY);
        const rectWidth = Math.abs(finalRect.startX - finalRect.currentX);
        const rectHeight = Math.abs(finalRect.startY - finalRect.currentY);

        const selectedIds = [
            ...places.filter(p => p.x >= rectX && p.x <= rectX + rectWidth && p.y >= rectY && p.y <= rectY + rectHeight).map(p => p.id),
            ...transitions.filter(t => (t.x + t.width / 2) >= rectX && (t.x + t.width / 2) <= rectX + rectWidth && (t.y + t.height / 2) >= rectY && (t.y + t.height / 2) <= rectY + rectHeight).map(t => t.id),
        ];

        onSelectionChange(selectedIds);

    }, [isSelecting, svgRef, places, transitions, onSelectionChange, selectionRect]); 
   
    // Effect to auto-reset the didJustSelect flag shortly after it's set
    useEffect(() => {
        if (didJustSelect) {
            const timeoutId = setTimeout(() => {
                setDidJustSelect(false);
            }, 0); // Reset on the next event loop tick
            return () => clearTimeout(timeoutId); // Cleanup timeout if component unmounts
        }
        return undefined;
    }, [didJustSelect]);

    // Keep useEffect for listeners minimal
    useEffect(() => {
        const svgElement = svgRef.current;
        if (!svgElement) return;
        const mouseDownHandler = (e: MouseEvent) => handleMouseDown(e);
        const mouseMoveHandler = (e: MouseEvent) => handleMouseMove(e);
        const mouseUpHandler = (e: MouseEvent) => handleMouseUp(e); 
        svgElement.addEventListener('mousedown', mouseDownHandler);
        window.addEventListener('mousemove', mouseMoveHandler);
        window.addEventListener('mouseup', mouseUpHandler);
        return () => {
            svgElement.removeEventListener('mousedown', mouseDownHandler);
            window.removeEventListener('mousemove', mouseMoveHandler);
            window.removeEventListener('mouseup', mouseUpHandler);
        };
    }, [svgRef, handleMouseDown, handleMouseMove, handleMouseUp]); 

    
    return {
        selectionRect: selectionRect.active ? {
            x: Math.min(selectionRect.startX, selectionRect.currentX),
            y: Math.min(selectionRect.startY, selectionRect.currentY),
            width: Math.abs(selectionRect.startX - selectionRect.currentX),
            height: Math.abs(selectionRect.startY - selectionRect.currentY),
        } : null,
        isSelecting, 
        didJustSelect,
    };
}; 