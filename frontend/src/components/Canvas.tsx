import React, {useState, useCallback, useEffect} from 'react';
import { Place } from './elements/Place';
import { Transition } from './elements/Transition';
import { Arc } from './elements/Arc';
import { UIPlace, UITransition, UIArc, GRID_CELL_SIZE } from '../types';

interface CanvasProps {
    places: UIPlace[];
    transitions: UITransition[];
    arcs: UIArc[];
    selectedElements: string[];
    onCanvasClick: (x: number, y: number) => void;
    onSelectElement: (id: string) => void;
    onUpdatePlaceSize: (id: string, newRadius: number) => void;
    onUpdateTransitionSize: (id: string, width: number, height: number) => void;
    onUpdateElementPosition: (id: string, newX: number, newY: number) => void;
    onArcPortClick:(id: string)=> void;
    selectedTool: 'NONE' | 'PLACE' | 'TRANSITION' | 'ARC';
    arcType: UIArc['type'];
    onUpdateToken: (id: string, newTokens: number) => void;
    onTypingChange: (isTyping: boolean) => void;
    onUpdateName?: (id: string, newName: string) => void;
    conflictResolutionMode?: boolean;
    conflictingTransitions?: string[];
    onConflictingTransitionSelect?: (id: string) => void;
}

export const Canvas = (props: CanvasProps) => {
    // ===== STATE =====
    /* Increase the initial viewBox width and height */
    const [viewBox, setViewBox] = useState({ x: -150, y: -150, w: 1100, h: 900 }); // Centered and enlarged
    const [isPanning, setIsPanning] = useState(false);
    const [lastMouseX, setLastMouseX] = useState(0);
    const [lastMouseY, setLastMouseY] = useState(0);

    // Get the container dimensions
    const [dimensions, setDimensions] = useState({ width: 1100, height: 900 });
    
    // Update dimensions on resize
    useEffect(() => {
        const updateDimensions = () => {
            const container = document.querySelector('.canvas-container');
            if (container) {
                const { width, height } = container.getBoundingClientRect();
                setDimensions({ width, height });
            }
        };
        
        updateDimensions();
        window.addEventListener('resize', updateDimensions);
        return () => window.removeEventListener('resize', updateDimensions);
    }, []);

    // ===== EFFECTS =====
    // non-passive wheel event listener because react is too slow
    useEffect(() => {
        const svgElement = document.querySelector('.petri-canvas');
        if (!svgElement) return;
        
        // handle wheel event without passive: true
        const handleWheelNonPassive = (e: Event) => {
            e.preventDefault();
        };
        
        svgElement.addEventListener('wheel', handleWheelNonPassive, { passive: false });
        
        return () => {
            svgElement.removeEventListener('wheel', handleWheelNonPassive);
        };
    }, []);

    // ===== GRID RENDERING =====
    const renderGrid = useCallback((vBox: { x: number; y: number; w: number; h: number }) => {
        const lines = [];

        // Using Math.floor/ceil to ensure lines snap to grid multiples.
        // Extend the grid by adding extra padding to ensure it covers the entire viewBox
        const gridPadding = 300; // Add extra padding to ensure grid covers the entire viewBox
        
        const startX = Math.floor((vBox.x - gridPadding) / GRID_CELL_SIZE) * GRID_CELL_SIZE;
        const endX = Math.ceil((vBox.x + vBox.w + gridPadding) / GRID_CELL_SIZE) * GRID_CELL_SIZE;

        // Generate vertical lines / math for resizing
        for (let xVal = startX; xVal <= endX; xVal += GRID_CELL_SIZE) {
            lines.push(
                <line
                    key={`v-${xVal}`}
                    x1={xVal}
                    y1={vBox.y - gridPadding}
                    x2={xVal}
                    y2={vBox.y + vBox.h + gridPadding}
                    stroke="#e9ecef"
                    opacity="0.4"
                    strokeWidth="0.5"
                />
            );
        }

        const startY = Math.floor((vBox.y - gridPadding) / GRID_CELL_SIZE) * GRID_CELL_SIZE;
        const endY = Math.ceil((vBox.y + vBox.h + gridPadding) / GRID_CELL_SIZE) * GRID_CELL_SIZE;

        // Generate horizontal lines and math for resizing
        for (let yVal = startY; yVal <= endY; yVal += GRID_CELL_SIZE) {
            lines.push(
                <line
                    key={`h-${yVal}`}
                    x1={vBox.x - gridPadding}
                    y1={yVal}
                    x2={vBox.x + vBox.w + gridPadding}
                    y2={yVal}
                    stroke="#e9ecef"
                    opacity="0.4"
                    strokeWidth="0.5"
                />
            );
        }

        return lines;
    }, []);

    // ===== COORDINATE CONVERSION =====
    /* Convert from screen coords to the current viewBox coords */
    const screenToViewBox = (e: React.DragEvent<SVGSVGElement>) => {
        const svgRect = e.currentTarget.getBoundingClientRect();
        const dropX = e.clientX - svgRect.left;
        const dropY = e.clientY - svgRect.top;

        const scaleX = viewBox.w / svgRect.width;
        const scaleY = viewBox.h / svgRect.height;

        const xInViewBox = viewBox.x + dropX * scaleX;
        const yInViewBox = viewBox.y + dropY * scaleY;

        return { xInViewBox, yInViewBox };
    };

    // ===== MOUSE EVENT HANDLERS =====
    const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
        // If user clicked directly on the background:
        if (e.target === e.currentTarget) {
            e.stopPropagation();
            setIsPanning(true);
            setLastMouseX(e.clientX);
            setLastMouseY(e.clientY);
        }
    };

    const handleMouseUp = (e: React.MouseEvent<SVGSVGElement>) => {
        console.log(`Mouse released at (${e.clientX}, ${e.clientY})`);
        setIsPanning(false);
    };

    const panCanvas = (e: React.MouseEvent<SVGSVGElement>) => {
        if (!isPanning) return;

        const dx = e.clientX - lastMouseX;
        const dy = e.clientY - lastMouseY;

        // Convert screen dx,dy to the "viewBox" coordinate space
        const svgRect = e.currentTarget.getBoundingClientRect();
        const scaleX = viewBox.w / svgRect.width;
        const scaleY = viewBox.h / svgRect.height;

        const moveX = dx * scaleX;  // how much to shift in the viewBox coords
        const moveY = dy * scaleY;

        // Update the viewBox
        setViewBox((v) => ({
            ...v,
            x: v.x - moveX, // minus because dragging left moves the viewBox "right"
            y: v.y - moveY, //reverse of above
        }));

        // Store the new lastMouse coords for next move
        setLastMouseX(e.clientX);
        setLastMouseY(e.clientY);
    };

    // ===== CANVAS INTERACTION HANDLERS =====
    const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
        e.preventDefault();

        // If click directly on the canvas (not on an element), selection should be cleared
        if (e.target === e.currentTarget) {
            // Clear selection if the user clicked on the empty canvas
            if (props.selectedElements.length > 0) {
                props.onSelectElement('');
            }
        }

        const rect = e.currentTarget.getBoundingClientRect();

        // Mouse position in *screen* pixels
        const mousePx = e.clientX - rect.left;
        const mousePy = e.clientY - rect.top;

        // The ratio between the physical <svg> size and the "virtual" viewBox size
        const scaleX = viewBox.w / rect.width;
        const scaleY = viewBox.h / rect.height;

        // Convert screen px => your current viewBox coordinates
        const xInViewBox = viewBox.x + mousePx * scaleX;
        const yInViewBox = viewBox.y + mousePy * scaleY;

        props.onCanvasClick(xInViewBox, yInViewBox);
    };

    /* for zooming canvas in and out*/
    const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
        // zoom aggressiveness
        const zoomFactor = 0.04;

        // If deltaY < 0, user is scrolling up => zoom in (decrease w/h).
        // If deltaY > 0, user is scrolling down => zoom out (increase w/h).
        const direction = e.deltaY < 0 ? -1 : 1;

        // Calculate new width/height
        const newW = viewBox.w * (1 + direction * zoomFactor);
        const newH = viewBox.h * (1 + direction * zoomFactor);

        // zoom limits
        const minZoom = 200; // smallest viewBox
        const maxZoom = 3000; //largest viewBox
        
        // / Don't allow zooming beyond limits
        if (newW < minZoom || newH < minZoom || newW > maxZoom || newH > maxZoom) {
            return;
        }

        // 1. Convert mouse coords to SVG coords
        const svgRect = e.currentTarget.getBoundingClientRect();
        const mouseX = e.clientX - svgRect.left;
        const mouseY = e.clientY - svgRect.top;

        // 2. Mouse offset in the current SVG coordinate space
        //    (mouseX / the physical width) * the viewBox's width
        const percentX = mouseX / svgRect.width;
        const percentY = mouseY / svgRect.height;
        const xOffset = viewBox.w * percentX;

        const yOffset = viewBox.h * percentY;
        // 3. Adjust x/y so the zoom is centered on mouse
        const newX = viewBox.x + xOffset - (xOffset * newW) / viewBox.w;

        const newY = viewBox.y + yOffset - (yOffset * newH) / viewBox.h;
        setViewBox({ x: newX, y: newY, w: newW, h: newH });
    };

    // ===== DRAG & DROP HANDLERS =====
    const handleDrop = (e: React.DragEvent<SVGSVGElement>) => {
        e.preventDefault();
        const type = e.dataTransfer.getData("application/petri-item");
        if(!type) return;
        const { xInViewBox, yInViewBox } = screenToViewBox(e);

        props.onCanvasClick(xInViewBox,yInViewBox);
    }

    const handleDragOver = (e: React.DragEvent<SVGSVGElement>) => {
        // Must call preventDefault() so we can drop
        e.preventDefault();
    };

    // ===== RENDER =====
    return (
        <div className="canvas-container" style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
            <svg
                className="petri-canvas"
                width={dimensions.width}
                height={dimensions.height}
                viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
                onWheel={handleWheel}
                onClick={handleSvgClick}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onMouseDown={handleMouseDown}
                onMouseMove={panCanvas}
                onMouseUp={handleMouseUp}
                style={{ 
                    backgroundColor: 'rgb(19,19,19)',
                    display: 'block'
                }}
            >
                {/* Grid Layer */}
                <g className="grid-layer">{renderGrid(viewBox)}</g>

                {/* Arcs Layer */}
                <g className="arcs-layer">
                    {props.arcs.map(arc => {
                        const sourceElement =
                            props.places.find(p => p.id === arc.incomingId) ||
                            props.transitions.find(t => t.id === arc.incomingId);
                        const targetElement =
                            props.places.find(p => p.id === arc.outgoingId) ||
                            props.transitions.find(t => t.id === arc.outgoingId);

                        return sourceElement && targetElement ? (
                            <Arc
                                key={arc.id}
                                id={arc.id}
                                type={arc.type}
                                incomingId={arc.incomingId}
                                outgoingId={arc.outgoingId}
                                source={sourceElement}
                                target={targetElement}
                                isSelected={props.selectedElements.includes(arc.id)}
                                onSelect={props.onSelectElement}
                            />
                        ) : null;
                    })}
                </g>

                {/* Elements Layer */}
                <g className="elements-layer">
                    {props.places.map(place => (
                        <Place
                            key={place.id}
                            id={place.id}
                            name={place.name}
                            x={place.x}
                            y={place.y}
                            tokens={place.tokens}
                            radius={place.radius}
                            isSelected={props.selectedElements.includes(place.id)}
                            onSelect={props.onSelectElement}
                            onUpdateSize={props.onUpdatePlaceSize}
                            onUpdatePosition={props.onUpdateElementPosition}
                            arcMode={props.selectedTool === 'ARC'}
                            arcType={props.arcType}
                            onArcPortClick={props.onArcPortClick}
                            onUpdateTokens={props.onUpdateToken}
                            onTypingChange={props.onTypingChange}
                            onUpdateName={props.onUpdateName}
                        />
                    ))}

                    {props.transitions.map(transition => (
                        <Transition
                            name={transition.name}
                            key={transition.id}
                            id={transition.id}
                            arcIds={transition.arcIds}
                            x={transition.x}
                            y={transition.y}
                            width={transition.width}
                            height={transition.height}
                            enabled={transition.enabled}
                            isSelected={props.selectedElements.includes(transition.id)}
                            onSelect={props.onSelectElement}
                            onUpdateSize={props.onUpdateTransitionSize}
                            onUpdatePosition={props.onUpdateElementPosition}
                            arcMode={props.selectedTool === 'ARC'}
                            arcType={props.arcType}
                            onArcPortClick={props.onArcPortClick}
                            onUpdateName={props.onUpdateName}
                            onTypingChange={props.onTypingChange}
                            isConflicting={props.conflictResolutionMode && props.conflictingTransitions?.includes(transition.id)}
                            onConflictingTransitionSelect={props.onConflictingTransitionSelect}
                            conflictResolutionMode={props.conflictResolutionMode}
                        />
                    ))}
                </g>

                {/* Marker definitions - adjusted to be more proportional */}
                <defs>
                    <marker
                        id="arrow"
                        viewBox="0 0 10 10"  // Keep original viewBox
                        refX="9"             // Keep original refX
                        refY="5"             // Keep original refY
                        markerWidth="8"      // Increased from 6 but not doubled
                        markerHeight="8"     // Increased from 6 but not doubled
                        orient="auto-start-reverse"
                    >
                        <path d="M 0 0 L 10 5 L 0 10 z" fill="#ddd" />
                    </marker>

                    <marker
                        id="inhibitor"
                        viewBox="0 0 10 10"  // Keep original viewBox
                        refX="9"             // Keep original refX
                        refY="5"             // Keep original refY
                        markerWidth="8"      // Increased from 6 but not doubled
                        markerHeight="8"     // Increased from 6 but not doubled
                    >
                        <circle cx="5" cy="5" r="4" fill="#ff3333" />
                    </marker>

                    <marker
                        id="bidirectional"
                        viewBox="0 0 10 10"  // Keep original viewBox
                        refX="1"             // Keep original refX
                        refY="5"             // Keep original refY
                        markerWidth="8"      // Increased from 6 but not doubled
                        markerHeight="8"     // Increased from 6 but not doubled
                        orient="auto-start-reverse"
                    >
                        <path d="M 0 0 L 10 5 L 0 10 z" fill="#ddd" />
                    </marker>
                </defs>
            </svg>
        </div>
    );
};