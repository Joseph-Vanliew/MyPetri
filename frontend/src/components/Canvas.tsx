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
import { useAlignmentGuides } from './canvas/hooks/useAlignmentGuides';
import { AlignmentGuides } from './canvas/AlignmentGuides';
import { screenToSVGCoordinates, snapToGrid } from './canvas/utils/coordinateUtils';
import { UIPlace, UITransition, UIArc } from '../types';
import { TokenAnimations } from './elements/TokenAnimations';
import { TokenAnimator } from '../animations/TokenAnimator';
import { SpeedControl } from './controls/SpeedControl';


declare global {
  interface Window {
    lastMousePosition?: { clientX: number; clientY: number };
    currentToolbarDragType?: string;
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
    onUpdatePlaceSize: (id: string, newRadius: number, resizeState: 'start' | 'resizing' | 'end') => void;
    onUpdateTransitionSize: (id: string, width: number, height: number, resizeState: 'start' | 'resizing' | 'end') => void;
    onUpdateElementPosition: (id: string, newX: number, newY: number, dragState: 'start' | 'dragging' | 'end') => void;
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
    zoomLevel: number;
    panOffset: { x: number; y: number };
    onViewChange: (view: { zoomLevel: number, panOffset: {x: number, y: number} }) => void;
    onCenterView: () => void;
    tokenAnimator?: TokenAnimator;
}

export const Canvas = (props: CanvasProps) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const [isShiftPressed, setIsShiftPressed] = useState(false);
    
    const [dimensions, setDimensions] = useState({ width: 1100, height: 900 });
    
    // Toolbar drag preview state
    const [toolbarDragPreview, setToolbarDragPreview] = useState<{
        type: 'PLACE' | 'TRANSITION';
        position: { x: number; y: number };
        snappedPosition: { x: number; y: number };
    } | null>(null);
    
    // Track the current drag type from toolbar
    const [currentDragType, setCurrentDragType] = useState<'PLACE' | 'TRANSITION' | null>(null);
    
    // Calculate viewBox directly from props for synchronous updates
    const baseWidth = 1500;
    const aspectRatio = 16 / 9;
    const currentViewBox = useMemo(() => {
        const safeZoom = Math.max(props.zoomLevel, 0.0001);
        const newW = baseWidth / safeZoom;
        const newH = aspectRatio > 0 ? newW / aspectRatio : newW;
        return {
            x: props.panOffset.x,
            y: props.panOffset.y,
            w: newW,
            h: newH
        };
    }, [props.zoomLevel, props.panOffset.x, props.panOffset.y]);

    const zoomAndPan = useZoomAndPan(svgRef, {
        initialZoomLevel: props.zoomLevel, 
        initialPanOffset: props.panOffset,
        onViewChange: props.onViewChange,
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

    // Alignment guides hook
    const alignmentGuides = useAlignmentGuides({
        snapDistance: 24,  // We can tune this if its too snappy
        enabled: true
    });

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
        e.dataTransfer.dropEffect = "move"; // Remove plus sign cursor
        
        // Try to get type from dataTransfer first (might be null during dragover)
        let type = e.dataTransfer.getData("application/petri-item");
        
        // If no type from dataTransfer, use our tracked drag type or global variable
        if (!type && currentDragType) {
            type = currentDragType;
        } else if (!type && window.currentToolbarDragType) {
            type = window.currentToolbarDragType;
        }
        
        if (!type || (type !== 'PLACE' && type !== 'TRANSITION')) {
            return;
        }
        
        if (!svgRef.current) {
            return;
        }
        
        const coords = screenToSVGCoordinates(e.clientX, e.clientY, svgRef.current);
        
        // Create a temporary element for alignment checking
        const tempElement: UIPlace | UITransition = type === 'PLACE' 
            ? {
                id: 'temp-preview',
                x: coords.x,
                y: coords.y,
                radius: 46,  // Match default place radius from App.tsx
                tokens: 0,
                name: '',
                capacity: null,
                type: 'place',
                bounded: false
            } as UIPlace
            : {
                id: 'temp-preview',
                x: coords.x,
                y: coords.y,
                width: 120,  // Match default transition width from App.tsx
                height: 54,  // Match default transition height from App.tsx
                name: '',
                type: 'transition',
                enabled: true,
                arcIds: []
            } as UITransition;
        
        // Get alignment guides and snap position
        const allElements = [...props.places, ...props.transitions];
        
        const alignmentResult = alignmentGuides.updateAlignments(
            tempElement,
            allElements,
            { x: coords.x, y: coords.y }
        );
        
        const snappedPosition = alignmentResult.snapPosition || { x: coords.x, y: coords.y };
        
        setToolbarDragPreview({
            type: type as 'PLACE' | 'TRANSITION',
            position: coords,
            snappedPosition
        });
    };
    
    // Handle drag enter to detect when drag starts over canvas
    const handleDragEnter = useCallback((e: React.DragEvent<SVGSVGElement>) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move"; // this removes the default plus sign
        
        // Try to get the drag type and store it
        const type = e.dataTransfer.getData("application/petri-item") || window.currentToolbarDragType;
        if (type === 'PLACE' || type === 'TRANSITION') {
            setCurrentDragType(type);
        }
    }, []);
    
    const handleDrop = useCallback((e: React.DragEvent<SVGSVGElement>) => {
        e.preventDefault();
        
        const type = e.dataTransfer.getData("application/petri-item") || currentDragType || window.currentToolbarDragType;
        if(!type) return;
        
        if (!svgRef.current) return;
        
        // Use the snapped position if we have a preview, otherwise fall back to original logic
        let coords;
        if (toolbarDragPreview) {
            coords = toolbarDragPreview.snappedPosition;
        } else {
            coords = screenToSVGCoordinates(e.clientX, e.clientY, svgRef.current);
            coords = snapToGrid(coords.x, coords.y);
        }
        
        // Clear the preview and drag type
        setToolbarDragPreview(null);
        setCurrentDragType(null);
        alignmentGuides.clearGuides();
        
        if (type === 'PLACE') {
            props.onSelectTool('PLACE');
        } else if (type === 'TRANSITION') {
            props.onSelectTool('TRANSITION');
        }
        
        props.onCanvasClick(coords.x, coords.y);
    }, [props.onSelectTool, props.onCanvasClick, toolbarDragPreview, currentDragType, alignmentGuides]);

    // Clear preview when drag leaves the canvas
    const handleDragLeave = useCallback((e: React.DragEvent<SVGSVGElement>) => {
        // Only clear if we're actually leaving the canvas (not entering a child element)
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setToolbarDragPreview(null);
            setCurrentDragType(null);
            alignmentGuides.clearGuides();
        }
    }, [alignmentGuides]);

    const handleSpeedChange = (multiplier: number) => {
        props.tokenAnimator?.setSpeedMultiplier(multiplier);
    };

    // Wrapper for element position updates with alignment guides
    const handleElementPositionUpdate = useCallback((
        id: string, 
        newX: number, 
        newY: number, 
        dragState: 'start' | 'dragging' | 'end'
    ) => {
        const allElements = [...props.places, ...props.transitions];
        const currentElement = allElements.find(el => el.id === id);
        
        // Disable alignment guides when multiple elements are selected
        const isMultiSelect = props.selectedElements.length > 1;
        
        if (dragState === 'start') {
            alignmentGuides.clearGuides();
            // Call the original function for 'start' so App.tsx can set up dragStartPositionsRef
            props.onUpdateElementPosition(id, newX, newY, dragState);
        } else if (dragState === 'dragging' && currentElement && !isMultiSelect) {
            // Update alignment guides and get snap position - only for single element drags
            const alignmentResult = alignmentGuides.updateAlignments(
                currentElement,
                allElements,
                { x: newX, y: newY }
            );
            
            // Use snap position immediately if available, otherwise use original position
            const finalPosition = alignmentResult.snapPosition || { x: newX, y: newY };
            props.onUpdateElementPosition(id, finalPosition.x, finalPosition.y, dragState);
        } else {
            // For multi-select or drag end, just pass through without snapping
            alignmentGuides.clearGuides();
            props.onUpdateElementPosition(id, newX, newY, dragState);
        }
    }, [props.places, props.transitions, props.selectedElements.length, props.onUpdateElementPosition, alignmentGuides]);

    return (
        <div className="canvas-container" style={{ 
            width: '100%', 
            height: '100%', 
            overflow: 'hidden',
            margin: 0,
            padding: 0,
            display: 'flex',
            position: 'relative'
        }}>
            {/* Center View Button */}
            <button
                onClick={props.onCenterView}
                style={{
                    position: 'absolute',
                    top: '10px',
                    left: '10px',
                    zIndex: 10, 
                    padding: '5px',
                    backgroundColor: 'rgba(42, 42, 42, 0.85)', 
                    border: '1px solid rgba(255, 255, 255, 0.2)', 
                    borderRadius: '4px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    outline: 'none' 
                }}
                onMouseOver={(e) => { 
                    e.currentTarget.style.backgroundColor = 'rgba(60, 60, 60, 0.9)'; 
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.4)';
                }}
                onMouseOut={(e) => { 
                     e.currentTarget.style.backgroundColor = 'rgba(42, 42, 42, 0.85)'; 
                     e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                }}
                title="Center Canvas"
            >
                <svg width="20" height="20" viewBox="0 0 16 16" fill="white"> 
                    <circle cx="8" cy="8" r="2"/>
                    <path d="M3.5 3.5 L 7.5 7.5" stroke="white" strokeWidth="1.5" fill="none"/>
                    <polyline points="7.5,6.0 7.5,7.5 6.0,7.5" stroke="white" strokeWidth="1.5" fill="none"/>
                    <path d="M12.5 3.5 L 8.5 7.5" stroke="white" strokeWidth="1.5" fill="none"/>
                    <polyline points="8.5,6.0 8.5,7.5 10.0,7.5" stroke="white" strokeWidth="1.5" fill="none"/>
                    <path d="M3.5 12.5 L 7.5 8.5" stroke="white" strokeWidth="1.5" fill="none"/>
                    <polyline points="6.0,8.5 7.5,8.5 7.5,10.0" stroke="white" strokeWidth="1.5" fill="none"/>
                    <path d="M12.5 12.5 L 8.5 8.5" stroke="white" strokeWidth="1.5" fill="none"/>
                    <polyline points="10.0,8.5 8.5,8.5 8.5,10.0" stroke="white" strokeWidth="1.5" fill="none"/>
                </svg>
            </button>

            <svg
                ref={svgRef}
                className="petri-canvas"
                width={dimensions.width}
                height={dimensions.height}
                viewBox={`${currentViewBox.x} ${currentViewBox.y} ${currentViewBox.w} ${currentViewBox.h}`}
                onClick={handleSvgClick}
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
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
                    x={currentViewBox.x - 2000}
                    y={currentViewBox.y - 2000}
                    width={currentViewBox.w + 4000}
                    height={currentViewBox.h + 4000}
                    fill="#1A1A1A"
                    pointerEvents="none"
                />
                
                <Grid viewBox={currentViewBox} />

                {/* Alignment guides layer */}
                <AlignmentGuides 
                    guides={alignmentGuides.activeGuides} 
                    viewBox={currentViewBox} 
                />

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

                {/* Toolbar drag preview element */}
                {toolbarDragPreview && (
                    <g className="toolbar-drag-preview" style={{ opacity: 0.7 }}>
                        {toolbarDragPreview.type === 'PLACE' ? (
                            <g transform={`translate(${toolbarDragPreview.snappedPosition.x},${toolbarDragPreview.snappedPosition.y})`}>
                                {/* Place circle with actual styling */}
                                <circle
                                    r={46}
                                    fill="#0f0f0f"
                                    stroke="#ffffff"
                                    strokeWidth="2"
                                    pointerEvents="none"
                                />
                                {/* Token count (default 0 for new places) */}
                                <text
                                    x="0"
                                    y="0"
                                    textAnchor="middle"
                                    dominantBaseline="central"
                                    fill="white"
                                    fontSize="24"
                                    fontWeight="bold"
                                    pointerEvents="none"
                                >
                                    0
                                </text>
                            </g>
                        ) : (
                            <g transform={`translate(${toolbarDragPreview.snappedPosition.x},${toolbarDragPreview.snappedPosition.y})`}>
                                {/* Transition rectangle with actual styling */}
                                <rect
                                    x={-60}
                                    y={-27}
                                    width={120}
                                    height={54}
                                    rx={8}
                                    fill="#0f0f0f"
                                    stroke="#ffffff"
                                    strokeWidth="2"
                                    pointerEvents="none"
                                />
                            </g>
                        )}
                    </g>
                )}

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
                                onUpdatePosition={handleElementPositionUpdate}
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
                                onUpdatePosition={handleElementPositionUpdate}
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

                {/* Add token animations layer */}
                {props.tokenAnimator && (
                    <TokenAnimations
                        places={props.places}
                        transitions={props.transitions}
                        arcs={props.arcs}
                        tokenAnimator={props.tokenAnimator}
                    />
                )}
            </svg>
            <SpeedControl onChange={handleSpeedChange} />
        </div>
    );
};