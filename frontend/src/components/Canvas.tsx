import React, {useState, useCallback, useEffect, useRef} from 'react';
import { Place } from './elements/Place';
import { Transition } from './elements/Transition';
import { Arc } from './elements/Arc';
import { Grid } from './canvas/Grid';
import { ArcPreview } from './canvas/ArcPreview';
import { useZoomAndPan } from './canvas/hooks/useZoomAndPan';
import { useMouseTracking } from './canvas/hooks/useMouseTracking';
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
    onSelectElement: (id: string) => void;
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
}

export const Canvas = (props: CanvasProps) => {
    // Create a ref for the SVG element
    const svgRef = useRef<SVGSVGElement>(null);
    
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
    
    // Handle canvas click
    const handleSvgClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
        e.preventDefault();
        
        if (e.target === e.currentTarget && props.selectedElements.length > 0) {
            props.onSelectElement('');
        }
        
        const coords = screenToSVGCoordinates(e.clientX, e.clientY, svgRef.current);
        const snapped = snapToGrid(coords.x, coords.y);
        
        props.onCanvasClick(snapped.x, snapped.y);
    }, [props.selectedElements, props.onSelectElement, props.onCanvasClick]);
    
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
                onMouseDown={zoomAndPan.handleMouseDown}
                onMouseMove={(e) => {
                    mouseTracking.updateMousePosition(e.clientX, e.clientY);
                    zoomAndPan.handlePan(e);
                }}
                onMouseUp={zoomAndPan.handleMouseUp}
                onMouseLeave={zoomAndPan.handleMouseLeave}
                style={{ 
                    backgroundColor: 'transparent',
                    display: 'block',
                    width: '100%',
                    height: '100%'
                }}
            >
                {/* Canvas Background */}
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
                                isFired={props.firedTransitions?.includes(transition.id)}
                            />
                        );
                    })}
                </g>

                {/* Arc Preview */}
                <ArcPreview
                    selectedTool={props.selectedTool}
                    selectedElements={props.selectedElements}
                    places={props.places}
                    transitions={props.transitions}
                    arcType={props.arcType}
                    mousePosition={mouseTracking.mousePosition}
                />

                {/* Marker definitions */}
                <defs>
                    <marker
                        id="arrow"
                        viewBox="0 0 10 10"
                        refX="9"
                        refY="5"
                        markerWidth="8"
                        markerHeight="8"
                        orient="auto-start-reverse"
                    >
                        <path d="M 0 0 L 10 5 L 0 10 z" fill="#ddd" />
                    </marker>

                    <marker
                        id="inhibitor"
                        viewBox="0 0 10 10"
                        refX="9"
                        refY="5"
                        markerWidth="8"
                        markerHeight="8"
                    >
                        <circle cx="5" cy="5" r="4" fill="#ff3333" />
                    </marker>

                    <marker
                        id="bidirectional"
                        viewBox="0 0 10 10"
                        refX="1"
                        refY="5"
                        markerWidth="8"
                        markerHeight="8"
                        orient="auto-start-reverse"
                    >
                        <path d="M 0 0 L 10 5 L 0 10 z" fill="#ddd" />
                    </marker>
                </defs>
            </svg>
        </div>
    );
};