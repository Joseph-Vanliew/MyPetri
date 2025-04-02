import { useState, useEffect, useCallback, RefObject } from 'react';
import { UIPlace, UITransition } from '../../../types'; // Adjust path as needed
import { screenToSVGCoordinates } from '../utils/coordinateUtils'; // Adjust path as needed

interface SelectionBoxOptions {
    svgRef: RefObject<SVGSVGElement>;
    places: UIPlace[];
    transitions: UITransition[];
    onSelectionChange: (selectedIds: string[]) => void;
    isEnabled: () => boolean;
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
    isEnabled
}: SelectionBoxOptions) => {
    const [selectionRect, setSelectionRect] = useState<SelectionRect>({
        startX: 0,
        startY: 0,
        currentX: 0,
        currentY: 0,
        active: false,
    });
    const [isSelecting, setIsSelecting] = useState(false);

    const getSvgCoordinates = (clientX: number, clientY: number) => {
        if (!svgRef.current) return { x: 0, y: 0 };
        return screenToSVGCoordinates(clientX, clientY, svgRef.current);
    };

    const handleMouseDown = useCallback((event: MouseEvent) => {
        if (!isEnabled() || !svgRef.current || event.button !== 0) return; // Only on main button click when enabled

        // Prevent panning/other actions when starting selection
        event.stopPropagation(); 

        const { x, y } = getSvgCoordinates(event.clientX, event.clientY);
        setIsSelecting(true);
        setSelectionRect({ startX: x, startY: y, currentX: x, currentY: y, active: true });
    }, [isEnabled, svgRef]);

    const handleMouseMove = useCallback((event: MouseEvent) => {
        if (!isSelecting || !svgRef.current) return;

        const { x, y } = getSvgCoordinates(event.clientX, event.clientY);
        setSelectionRect(prev => ({ ...prev, currentX: x, currentY: y }));
    }, [isSelecting, svgRef]);

    const handleMouseUp = useCallback(() => {
        if (!isSelecting || !svgRef.current) return;

        setIsSelecting(false);
        setSelectionRect(prev => ({ ...prev, active: false }));

        // Calculate bounds of the selection rectangle
        const rectX = Math.min(selectionRect.startX, selectionRect.currentX);
        const rectY = Math.min(selectionRect.startY, selectionRect.currentY);
        const rectWidth = Math.abs(selectionRect.startX - selectionRect.currentX);
        const rectHeight = Math.abs(selectionRect.startY - selectionRect.currentY);

        // Find elements within the rectangle (only Places and Transitions)
        const selectedIds = [
            ...places
                .filter(p => 
                    p.x >= rectX && 
                    p.x <= rectX + rectWidth && 
                    p.y >= rectY && 
                    p.y <= rectY + rectHeight
                )
                .map(p => p.id),
            ...transitions
                .filter(t => 
                    // Use center point for transitions for simplicity, adjust if needed
                    (t.x + t.width / 2) >= rectX &&
                    (t.x + t.width / 2) <= rectX + rectWidth &&
                    (t.y + t.height / 2) >= rectY &&
                    (t.y + t.height / 2) <= rectY + rectHeight
                )
                .map(t => t.id),
        ];

        // Update parent component's selection state
        onSelectionChange(selectedIds);

    }, [isSelecting, svgRef, places, transitions, onSelectionChange, selectionRect]);

    // Attaching/detaching event listeners
    useEffect(() => {
        const svgElement = svgRef.current;
        if (!svgElement) return;

        const handleGlobalMouseMove = (e: MouseEvent) => handleMouseMove(e);
        const handleGlobalMouseUp = () => handleMouseUp();

        svgElement.addEventListener('mousedown', handleMouseDown);
        window.addEventListener('mousemove', handleGlobalMouseMove);
        window.addEventListener('mouseup', handleGlobalMouseUp);

        return () => {
            svgElement.removeEventListener('mousedown', handleMouseDown);
            window.removeEventListener('mousemove', handleGlobalMouseMove);
            window.removeEventListener('mouseup', handleGlobalMouseUp);
        };
    }, [svgRef, handleMouseDown, handleMouseMove, handleMouseUp, 
        isEnabled, isSelecting, places, transitions, onSelectionChange, selectionRect]);

    
    return {
        selectionRect: selectionRect.active ? {
            x: Math.min(selectionRect.startX, selectionRect.currentX),
            y: Math.min(selectionRect.startY, selectionRect.currentY),
            width: Math.abs(selectionRect.startX - selectionRect.currentX),
            height: Math.abs(selectionRect.startY - selectionRect.currentY),
        } : null,
    };
}; 