import React, {useState, useCallback, useEffect, useMemo, useRef} from 'react';
import { Place } from './elements/Place';
import { Transition } from './elements/Transition';
import { Arc } from './elements/arcs/Arc';
import { Grid } from './canvas/Grid';
import { ArcPreview } from './elements/arcs/ArcPreview';
import { MarkerDefinitions } from './elements/arcs/MarkerDefinitions';
import { useZoomAndPan } from './canvas/hooks/useZoomAndPan';
import { useMouseTracking } from './canvas/hooks/useMouseTracking';
import { useSelectionBox } from './canvas/hooks/useSelectionBox';
import { screenToSVGCoordinates, snapToGrid } from './canvas/utils/coordinateUtils';
import { UIPlace, UITransition, UIArc } from '../types';


declare global {
  interface Window {
    lastMousePosition?: { clientX: number; clientY: number };
  }
}

interface CanvasProps {
    places: UIPlace[];
    transitions: UITransition[];
    arcs: UIArc[];
    selectedElements: string[];
    onCanvasClick: (x: number, y: number) => void;
    onSelectElement: (id: string, event?: React.MouseEvent) => void;
    onMultiSelectElement: (ids: string[]) => void;
    onUpdatePlaceSize: (id: string, newRadius: number) => void;
    onUpdateTransitionSize: (id: string, width: number, height: number) => void;
    onUpdateElementPosition: (id: string, newX: number, newY: number) => void;
    onArcPortClick:(id: string)=> void;
    selectedTool: 'NONE' | 'PLACE' | 'TRANSITION' | 'ARC';
    onSelectTool: (tool: 'NONE' | 'PLACE' | 'TRANSITION' | 'ARC') => void;
    arcType: UIArc['type'];
    onUpdateToken: (id: string, newTokens: number) => void;
    onTypingChange: (isTyping: boolean) => void;
    onUpdateName?: (id: string, newName: string) => void;
    conflictResolutionMode?: boolean;
    conflictingTransitions?: string[];
    onConflictingTransitionSelect?: (id: string) => void;
    firedTransitions?: string[];
    onUpdatePlaceCapacity?: (id: string, capacity: number | null) => void;
    showCapacityEditorMode?: boolean;
}

export const Canvas = (props: CanvasProps) => {
    // Create a ref for the SVG element
    const svgRef = useRef<SVGSVGElement>(null);
    const [isShiftPressed, setIsShiftPressed] = useState(false);
    const [isDraggingSelectionBox, setIsDraggingSelectionBox] = useState(false);
    
    // Get container dimensions
    const [dimensions, setDimensions] = useState({ width: 1100, height: 900 });
    
    // Use custom hooks for zoom/pan and mouse tracking
    const zoomAndPan = useZoomAndPan(svgRef, {
        initialViewBox: { x: -500, y: -500, w: 1000, h: 1000 }
    });
    
    const mouseTracking = useMouseTracking(svgRef, {
        enabled: props.selectedTool === 'ARC' && props.selectedElements.length > 0
    });
    
    // Add a new state to store refs to elements
    const [elementRefs, setElementRefs] = useState<{[id: string]: React.RefObject<SVGGElement>}>({});
    
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
    
    // Handle non-passive wheel events
    useEffect(() => {
        const svgElement = document.querySelector('.petri-canvas');
        if (!svgElement) return;
        
        const handleWheelNonPassive = (e: Event) => {
            e.preventDefault();
        };
        
        svgElement.addEventListener('wheel', handleWheelNonPassive, { passive: false });
        
        return () => {
            svgElement.removeEventListener('wheel', handleWheelNonPassive);
        };
    }, []);
    
    // Track the last mouse position globally
    useEffect(() => {
        const trackMousePosition = (e: MouseEvent) => {
            window.lastMousePosition = { clientX: e.clientX, clientY: e.clientY };
        };
        
        window.addEventListener('mousemove', trackMousePosition);
        return () => {
            window.removeEventListener('mousemove', trackMousePosition);
        };
    }, []);
    
    // Reset mouse position when starting a new arc
    useEffect(() => {
        if (props.selectedTool === 'ARC' && props.selectedElements.length === 1) {
            // If we have a last known mouse position, use it
            if (window.lastMousePosition && svgRef.current) {
                const coords = screenToSVGCoordinates(
                    window.lastMousePosition.clientX, 
                    window.lastMousePosition.clientY, 
                    svgRef.current
                );
                mouseTracking.setMousePosition(coords);
            }
        }
    }, [props.selectedTool, props.selectedElements]);
    
    // Instantiate the selection box hook
    const { selectionRect } = useSelectionBox({
        svgRef,
        places: props.places,
        transitions: props.transitions,
        onSelectionChange: (selectedIds) => {
            props.onMultiSelectElement(selectedIds);
            setIsDraggingSelectionBox(false);
        },
        isEnabled: () => isShiftPressed,
    });

    // Add state for shift key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Shift') {
                setIsShiftPressed(true);
            }
        };
        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.key === 'Shift') {
                setIsShiftPressed(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, []);
    
    // Handle canvas click
    const handleSvgClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
        e.preventDefault();
        
        if (isDraggingSelectionBox) {
            setIsDraggingSelectionBox(false);
            return;
        }
        
        if (!isShiftPressed && e.target === e.currentTarget && props.selectedElements.length > 0) {
            props.onSelectElement('');
        }
        
        if (!isShiftPressed && (props.selectedTool === 'PLACE' || props.selectedTool === 'TRANSITION' || props.selectedTool === 'ARC')) {
            const coords = screenToSVGCoordinates(e.clientX, e.clientY, svgRef.current);
            const snapped = snapToGrid(coords.x, coords.y);
            props.onCanvasClick(snapped.x, snapped.y);
        }
    }, [props.selectedElements, props.onSelectElement, props.onCanvasClick, props.selectedTool, isShiftPressed, isDraggingSelectionBox]);
    
    // Handle drag and drop
    const handleDragOver = (e: React.DragEvent<SVGSVGElement>) => {
        e.preventDefault();
    };
    
    const handleDrop = useCallback((e: React.DragEvent<SVGSVGElement>) => {
        e.preventDefault();
        
        const type = e.dataTransfer.getData("application/petri-item");
        if(!type) return;
        
        const coords = screenToSVGCoordinates(e.clientX, e.clientY, svgRef.current);
        const snapped = snapToGrid(coords.x, coords.y);
        
        if (type === 'PLACE') {
            props.onSelectTool('PLACE');
        } else if (type === 'TRANSITION') {
            props.onSelectTool('TRANSITION');
        }
        
        props.onCanvasClick(snapped.x, snapped.y);
    }, [props.onSelectTool, props.onCanvasClick]);
    
    return (
        <div className="canvas-container" style={{ 
            width: '100%', 
            height: '100%', 
            overflow: 'hidden',
            margin: 0,
            padding: 0,
            display: 'flex'
        }}>
            <svg
                ref={svgRef}
                className="petri-canvas"
                width={dimensions.width}
                height={dimensions.height}
                viewBox={`${zoomAndPan.viewBox.x} ${zoomAndPan.viewBox.y} ${zoomAndPan.viewBox.w} ${zoomAndPan.viewBox.h}`}
                onWheel={zoomAndPan.handleZoom}
                onClick={handleSvgClick}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onMouseDown={(e) => {
                    if (isShiftPressed) {
                        setIsDraggingSelectionBox(true);
                    } else {
                        zoomAndPan.handleMouseDown(e);
                    }
                }}
                onMouseMove={(e) => {
                    mouseTracking.updateMousePosition(e.clientX, e.clientY);
                    
                    if (!isDraggingSelectionBox) {
                        zoomAndPan.handlePan(e);
                    }
                }}
                onMouseUp={() => {
                    zoomAndPan.handleMouseUp();
                    
                    if (isDraggingSelectionBox) {
                        setIsDraggingSelectionBox(false);
                    }
                }}
                onMouseLeave={() => {
                    zoomAndPan.handleMouseLeave();
                }}
                style={{ 
                    backgroundColor: 'transparent',
                    display: 'block',
                    width: '100%',
                    height: '100%'
                }}
            >
                {/* Canvas Background - used to fill the canvas with a background color*/}
                <rect
                    x={zoomAndPan.viewBox.x - 2000}
                    y={zoomAndPan.viewBox.y - 2000}
                    width={zoomAndPan.viewBox.w + 4000}
                    height={zoomAndPan.viewBox.h + 4000}
                    fill="#1A1A1A"
                    pointerEvents="none"
                />
                
                {/* Grid Layer */}
                <Grid viewBox={zoomAndPan.viewBox} />

                {/* Selection Rectangle Layer (Render if active) */}
                {selectionRect && (
                    <rect
                        x={selectionRect.x}
                        y={selectionRect.y}
                        width={selectionRect.width}
                        height={selectionRect.height}
                        fill="rgba(0, 116, 217, 0.3)"
                        stroke="#0074D9"
                        strokeWidth="1"
                        pointerEvents="none"
                    />
                )}

                {/* Arcs Layer - used to render arcs*/}
                <g className="arcs-layer">
                    {(() => { // Use IIFE to scope arcOffsets calculation
                        const arcOffsets = useMemo(() => {
                            const offsets: { [id: string]: number } = {};
                            const groupedArcs: { [key: string]: UIArc[] } = {};
                            const OFFSET_AMOUNT = 12; // Pixels to offset by

                            props.arcs.forEach(arc => {
                                const key = [arc.incomingId, arc.outgoingId].sort().join('-');
                                if (!groupedArcs[key]) {
                                    groupedArcs[key] = [];
                                }
                                groupedArcs[key].push(arc);
                            });

                            Object.values(groupedArcs).forEach(group => {
                                if (group.length === 2) {
                                    const regularArc = group.find(a => a.type === 'REGULAR');
                                    const inhibitorArc = group.find(a => a.type === 'INHIBITOR');
                                    if (regularArc && inhibitorArc) {
                                        offsets[regularArc.id] = OFFSET_AMOUNT;
                                        offsets[inhibitorArc.id] = -OFFSET_AMOUNT;
                                    }
                                }
                            });
                            return offsets;
                        }, [props.arcs]);

                        // Render arcs, passing the calculated offset
                        return props.arcs.map((arc: UIArc) => {
                            const sourceElement = 
                                props.places.find(p => p.id === arc.incomingId) ||
                                props.transitions.find(t => t.id === arc.incomingId);
                            const targetElement = 
                                props.places.find(p => p.id === arc.outgoingId) ||
                                props.transitions.find(t => t.id === arc.outgoingId);
                            
                            const offset = arcOffsets[arc.id] || 0; // Get offset or default to 0
                                
                            return sourceElement && targetElement ? (
                                <Arc 
                                    key={arc.id} 
                                    {...arc} // Spread other arc props
                                    source={sourceElement} 
                                    target={targetElement}
                                    offset={offset} // Pass the calculated offset
                                    isSelected={props.selectedElements.includes(arc.id)}
                                    onSelect={(id: string) => props.onSelectElement(id)}
                                />
                            ) : null;
                        });
                    })()} 
                </g>

                {/* Marker definitions - used by arcs and arc previews*/}
                <MarkerDefinitions />

                {/* Arc Preview - used to preview arc placement*/}
                <ArcPreview
                    selectedTool={props.selectedTool}
                    selectedElements={props.selectedElements}
                    places={props.places}
                    transitions={props.transitions}
                    arcType={props.arcType}
                    mousePosition={mouseTracking.mousePosition}
                />

                {/* Elements Layer - used to render places and transitions*/}
                <g className="elements-layer">
                    {props.places.map(place => {
                        if (!elementRefs[place.id]) {
                            setElementRefs(prev => ({...prev, [place.id]: React.createRef()}));
                        }
                        
                        return (
                            <Place
                                key={place.id}
                                id={place.id}
                                name={place.name}
                                x={place.x}
                                y={place.y}
                                tokens={place.tokens}
                                radius={place.radius}
                                bounded={place.bounded}
                                capacity={place.capacity}
                                isSelected={props.selectedElements.includes(place.id)}
                                onSelect={(id: string) => props.onSelectElement(id)}
                                onUpdateSize={props.onUpdatePlaceSize}
                                onUpdatePosition={props.onUpdateElementPosition}
                                arcMode={props.selectedTool === 'ARC'}
                                arcType={props.arcType}
                                onArcPortClick={props.onArcPortClick}
                                onUpdateTokens={props.onUpdateToken}
                                onTypingChange={props.onTypingChange}
                                onUpdateName={props.onUpdateName}
                                onUpdatePlaceCapacity={props.onUpdatePlaceCapacity}
                                showCapacityEditorMode={props.showCapacityEditorMode ?? false}
                            />
                        );
                    })}

                    {props.transitions.map(transition => {
                        // Create a ref for this transition if it doesn't exist
                        if (!elementRefs[transition.id]) {
                            setElementRefs(prev => ({...prev, [transition.id]: React.createRef()}));
                        }
                        
                        return (
                            <Transition
                                key={transition.id}
                                id={transition.id}
                                name={transition.name}
                                arcIds={transition.arcIds}
                                x={transition.x}
                                y={transition.y}
                                width={transition.width}
                                height={transition.height}
                                enabled={transition.enabled}
                                isSelected={props.selectedElements.includes(transition.id)}
                                onSelect={(id: string) => props.onSelectElement(id)}
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
                                isFired={props.firedTransitions?.includes(transition.id)}
                            />
                        );
                    })}
                </g>
            </svg>
        </div>
    );
};