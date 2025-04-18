import React, {useState, useCallback, useEffect, useRef, useMemo} from 'react';
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
    const svgRef = useRef<SVGSVGElement>(null);
    const [isShiftPressed, setIsShiftPressed] = useState(false);
    
    const [dimensions, setDimensions] = useState({ width: 1100, height: 900 });
    
    const zoomAndPan = useZoomAndPan(svgRef, {
        initialViewBox: { x: -750, y: -750, w: 1500, h: 1500 }
    });
    
    const mouseTracking = useMouseTracking(svgRef, {
        enabled: props.selectedTool === 'ARC' && props.selectedElements.length > 0
    });
    
    const [elementRefs, setElementRefs] = useState<{[id: string]: React.RefObject<SVGGElement>}>({});
    
    const { selectionRect, isSelecting, didJustSelect } = useSelectionBox({
        svgRef,
        places: props.places,
        transitions: props.transitions,
        onSelectionChange: props.onMultiSelectElement,
    });

    // Create lookup maps for efficient element finding
    const placesMap = useMemo(() => {
        const map = new Map<string, UIPlace>();
        props.places.forEach(p => map.set(p.id, p));
        return map;
    }, [props.places]);

    const transitionsMap = useMemo(() => {
        const map = new Map<string, UITransition>();
        props.transitions.forEach(t => map.set(t.id, t));
        return map;
    }, [props.transitions]);

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
    }, [props.selectedTool, props.selectedElements.length, mouseTracking.setMousePosition, svgRef]);
    
    // state for shift key
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
    
    // Update handleSvgClick to check the didJustSelect flag from the hook
    const handleSvgClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
        e.preventDefault();

        // If the hook indicates selection just finished, ignore this click.
        if (didJustSelect) {
            return; // Hook will auto-reset the flag
        }
        
        // Background Deselection Logic: Use e.shiftKey directly
        if (!e.shiftKey && e.target === e.currentTarget && props.selectedElements.length > 0) {
            props.onSelectElement('');
        }
        
        // Logic for placing new elements: Use e.shiftKey directly
        if (!e.shiftKey && e.target === e.currentTarget && (props.selectedTool === 'PLACE' || props.selectedTool === 'TRANSITION' || props.selectedTool === 'ARC')) {
            if (!svgRef.current) return;
            const coords = screenToSVGCoordinates(e.clientX, e.clientY, svgRef.current);
            const snapped = snapToGrid(coords.x, coords.y);
            props.onCanvasClick(snapped.x, snapped.y);
        }
    }, [props.selectedElements, props.onSelectElement, props.onCanvasClick, props.selectedTool, didJustSelect]); 
    
    // Handle drag and drop
    const handleDragOver = (e: React.DragEvent<SVGSVGElement>) => {
        e.preventDefault();
    };
    
    const handleDrop = useCallback((e: React.DragEvent<SVGSVGElement>) => {
        e.preventDefault();
        
        const type = e.dataTransfer.getData("application/petri-item");
        if(!type) return;
        
        if (!svgRef.current) return;
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
            display: 'flex',
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
                    if (!isShiftPressed) {
                        zoomAndPan.handleMouseDown(e);
                    }
                }}
                onMouseMove={(e) => {
                    mouseTracking.updateMousePosition(e.clientX, e.clientY);
                    
                    if (!isSelecting) {
                        zoomAndPan.handlePan(e);
                    }
                }}
                onMouseUp={() => {
                    if (!isSelecting) {
                         zoomAndPan.handleMouseUp();
                    }
                }}
                onMouseLeave={() => {
                    zoomAndPan.handleMouseLeave(); 
                }}
                style={{ 
                    backgroundColor: '#1A1A1A',
                    display: 'block',
                    width: '100%',
                    height: '100%'
                }}
            >
                <rect
                    x={zoomAndPan.viewBox.x - 2000}
                    y={zoomAndPan.viewBox.y - 2000}
                    width={zoomAndPan.viewBox.w + 4000}
                    height={zoomAndPan.viewBox.h + 4000}
                    fill="#1A1A1A"
                    pointerEvents="none"
                />
                
                <Grid viewBox={zoomAndPan.viewBox} />

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

                <g className="arcs-layer">
                    {(() => {
                        return props.arcs.map((arc: UIArc) => {
                            const sourceElement = placesMap.get(arc.incomingId) || transitionsMap.get(arc.incomingId);
                            const targetElement = placesMap.get(arc.outgoingId) || transitionsMap.get(arc.outgoingId);

                            return sourceElement && targetElement ? (
                                <Arc
                                    key={arc.id}
                                    {...arc}
                                    source={sourceElement}
                                    target={targetElement}
                                    allArcs={props.arcs}
                                    isSelected={props.selectedElements.includes(arc.id)}
                                    onSelect={(id: string) => props.onSelectElement(id)}
                                />
                            ) : null;
                        });
                    })()}
                </g>

                <MarkerDefinitions/>

                <ArcPreview
                    selectedTool={props.selectedTool}
                    selectedElements={props.selectedElements}
                    places={props.places}
                    transitions={props.transitions}
                    arcType={props.arcType}
                    mousePosition={mouseTracking.mousePosition}
                />

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