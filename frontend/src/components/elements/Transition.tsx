import React, { useRef, useState, useEffect, useCallback } from 'react';
import type {UIArc, UITransition} from '../../types';

interface TransitionProps extends UITransition {
    isSelected: boolean;
    onSelect: (id: string) => void;
    onUpdatePosition: (id: string, x: number, y: number, dragState?: 'start' | 'dragging' | 'end') => void;
    onUpdateSize: (id: string, newWidth: number, newHeight: number) => void;
    arcMode?: boolean;
    arcType?: UIArc['type'];
    onArcPortClick: (id:string) => void;
    onUpdateName?: (id: string, newName: string) => void;
    onTypingChange?: (isTyping: boolean) => void;
    isConflicting?: boolean;
    onConflictingTransitionSelect?: (id: string) => void;
    conflictResolutionMode?: boolean;
}

export const Transition = (props: TransitionProps) => {
    // ===== REFS =====
    const groupRef = useRef<SVGGElement>(null);

    // ===== STATE =====
    // Interaction states
    const [activeHandle, setActiveHandle] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ dx: 0, dy: 0 });
    const [isHovered, setIsHovered] = useState(false);
    
    // Add local position state to track position during dragging
    const [localPosition, setLocalPosition] = useState({ x: props.x, y: props.y });
    
    // Size states
    const [originalWidth, setOriginalWidth] = useState(props.width);
    const [originalHeight, setOriginalHeight] = useState(props.height);
    const [aspectRatio, setAspectRatio] = useState(props.height === 0 ? 1 : props.width / props.height);
    
    // Name editing states
    const [isEditingName, setIsEditingName] = useState(false);
    const [tempName, setTempName] = useState(props.name || '');

    // Add state to track if a conflicting transition is selected
    const [isConflictSelected, setIsConflictSelected] = useState(false);

    // Compute the current visual position (either from local state during dragging or from props)
    const visualPosition = isDragging ? localPosition : { x: props.x, y: props.y };

    // ===== EVENT HANDLERS =====
    // Name editing handlers
    const handleDoubleClick = (e: React.MouseEvent) => {
        if (props.arcMode) return; // Don't allow editing in arc mode
        e.stopPropagation();
        setIsEditingName(true);
        if (props.onTypingChange) {
            props.onTypingChange(true);
        }
    };
    
    const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setTempName(event.target.value);
    };
    
    const handleNameKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === "Enter") {
            finishNameEdit();
        } else if (event.key === "Escape") {
            cancelNameEdit();
        }
    };
    
    const finishNameEdit = () => {
        setIsEditingName(false);
        if (props.onTypingChange) {
            props.onTypingChange(false);
        }
        if (props.onUpdateName) {
            props.onUpdateName(props.id, tempName);
        }
    };
    
    const cancelNameEdit = () => {
        setIsEditingName(false);
        if (props.onTypingChange) {
            props.onTypingChange(false);
        }
        setTempName(props.name || '');
    };

    // Drag handlers
    const handleDragStart = useCallback((e: React.MouseEvent<SVGGElement>) => {
        if (props.arcMode) return;
        if (activeHandle) return; // skip drag if resizing
        e.stopPropagation();
        
        const svg = groupRef.current?.ownerSVGElement;
        if (!svg || !groupRef.current) return;

        // Get current mouse position in SVG coordinates
        const pt = svg.createSVGPoint();
        pt.x = e.clientX;
        pt.y = e.clientY;
        const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse());
        
        // Calculate offset between mouse position and element position
        const offsetX = svgP.x - props.x;
        const offsetY = svgP.y - props.y;
        
        // Store this offset for use during dragging
        setDragOffset({ dx: offsetX, dy: offsetY });
        
        // Initialize local position to current props position
        setLocalPosition({ x: props.x, y: props.y });
        
        setIsDragging(true);
        
        // Notify parent that dragging has started
        props.onUpdatePosition(props.id, props.x, props.y, 'start');
    }, [activeHandle, props.arcMode, props.id, props.onUpdatePosition, props.x, props.y]);

    // Resize handlers
    const handleResizeStart = (handle: string, e: React.MouseEvent) => {
        e.stopPropagation(); // don't start drag
        setActiveHandle(handle);
        setOriginalWidth(props.width);
        setOriginalHeight(props.height);
        setAspectRatio(
            props.height === 0 ? 1 : props.width / props.height
        );
    };

    // Handle transition selection in conflict resolution mode
    const handleConflictSelect = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (props.isConflicting && props.onConflictingTransitionSelect) {
            setIsConflictSelected(true);
            props.onConflictingTransitionSelect(props.id);
        }
    };

    // ===== EFFECTS =====
    // Sync name with props
    useEffect(() => {
        setTempName(props.name || '');
    }, [props.name]);
    
    // Sync local position with props
    useEffect(() => {
        setLocalPosition({ x: props.x, y: props.y });
    }, [props.x, props.y]);

    // Handle dragging
    useEffect(() => {
        if (!isDragging) return;
        
        const handleMouseMove = (e: MouseEvent) => {
            if (!groupRef.current) return;
            const svg = groupRef.current.ownerSVGElement;
            if (!svg) return;

            // Get the current mouse position in SVG coordinates
            const pt = svg.createSVGPoint();
            pt.x = e.clientX;
            pt.y = e.clientY;
            const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse());
            
            // Calculate new position by applying the initial offset
            const newX = svgP.x - dragOffset.dx;
            const newY = svgP.y - dragOffset.dy;
            
            // Update local position
            setLocalPosition({ x: newX, y: newY });
            
            // Update parent component in real-time to make arcs follow
            props.onUpdatePosition(props.id, newX, newY, 'dragging');
        };

        const handleMouseUp = () => {
            // Notify parent that dragging has ended
            props.onUpdatePosition(props.id, localPosition.x, localPosition.y, 'end');
            
            setIsDragging(false);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, dragOffset, localPosition, props]);

    // Handle resizing
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!activeHandle || !groupRef.current) return;

            const svg = groupRef.current.ownerSVGElement;
            if (!svg) return;

            const pt = svg.createSVGPoint();
            pt.x = e.clientX;
            pt.y = e.clientY;
            const inverseCTM = groupRef.current.getScreenCTM()?.inverse();
            if (!inverseCTM) return;
            const localPoint = pt.matrixTransform(inverseCTM);

            // Calculate new dimensions based on which handle is being dragged
            let newWidth = originalWidth;
            let newHeight = originalHeight;
            
            // Calculate distance from center to mouse position
            const dx = localPoint.x;
            const dy = localPoint.y;
            
            // Determine scale factor based on which corner is being dragged
            // and the direction of movement
            let scaleX = 1;
            let scaleY = 1;
            
            if (activeHandle === 'top-left') {
                scaleX = -dx / (originalWidth / 2);
                scaleY = -dy / (originalHeight / 2);
            } else if (activeHandle === 'top-right') {
                scaleX = dx / (originalWidth / 2);
                scaleY = -dy / (originalHeight / 2);
            } else if (activeHandle === 'bottom-left') {
                scaleX = -dx / (originalWidth / 2);
                scaleY = dy / (originalHeight / 2);
            } else if (activeHandle === 'bottom-right') {
                scaleX = dx / (originalWidth / 2);
                scaleY = dy / (originalHeight / 2);
            }
            
            // Use the absolute larger scale factor to maintain aspect ratio
            // but preserve the sign from the original scale factor
            const absScaleX = Math.abs(scaleX);
            const absScaleY = Math.abs(scaleY);
            let scale;
            
            if (absScaleX > absScaleY) {
                scale = scaleX; // Use X scale with its original sign
            } else {
                scale = scaleY; // Use Y scale with its original sign
            }
            
            // Apply the scale while maintaining aspect ratio
            newWidth = originalWidth * Math.abs(scale);
            newHeight = newWidth / aspectRatio;
            
            // Ensure minimum size
            if (newWidth < 20) {
                newWidth = 20;
                newHeight = 20 / aspectRatio;
            }
            if (newHeight < 20) {
                newHeight = 20;
                newWidth = 20 * aspectRatio;
            }
            
            props.onUpdateSize(props.id, newWidth, newHeight);
        };

        const handleMouseUp = () => {
            setActiveHandle(null);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };

        if (activeHandle) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [activeHandle, props, originalWidth, originalHeight, aspectRatio]);

    // Make visualPosition available as a property on the component instance
    useEffect(() => {
        if (groupRef.current) {
            // Store the visual position as a property on the DOM element
            (groupRef.current as any).visualPosition = visualPosition;
        }
    }, [visualPosition]);

    // ===== RENDER =====
    return (
        <g
            ref={groupRef}
            data-id={props.id}
            transform={`translate(${visualPosition.x},${visualPosition.y})`}
            className="petri-element transition"
            onClick={(e) => {
                e.stopPropagation();
                
                // If in conflict resolution mode and this is a conflicting transition
                if (props.conflictResolutionMode && props.isConflicting) {
                    handleConflictSelect(e);
                    return;
                }
                
                // Original click behavior
                if (props.arcMode && isHovered) {
                    props.onArcPortClick(props.id);
                } else {
                    props.onSelect(props.id);
                }
            }}
            onDoubleClick={handleDoubleClick}
            onMouseDown={handleDragStart}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={
                props.isConflicting 
                    ? {cursor: 'pointer'} 
                    : props.arcMode && isHovered 
                        ? {cursor: 'pointer'} 
                        : undefined
            }
        >
            {/* Arc mode highlight - renders a light green rectangle around the transition when hovered */}
            {props.arcMode && isHovered && (
                <rect
                    x={-props.width / 2 - 6}
                    y={-props.height / 2 - 6}
                    width={props.width + 12}
                    height={props.height + 12}
                    rx={10}
                    fill="none"
                    stroke="rgba(0, 255, 0, 0.5)"
                    strokeWidth="6"
                    style={{cursor: 'pointer'}}
                />
            )}
            
            {/* Conflict highlight - for transitions in conflict resolution mode */}
            {props.isConflicting && (
                <rect
                    x={-props.width / 2 - 8}
                    y={-props.height / 2 - 8}
                    width={props.width + 16}
                    height={props.height + 16}
                    rx={12}
                    fill="none"
                    stroke={isConflictSelected ? "rgba(0, 255, 0, 0.7)" : "rgba(255, 0, 0, 0.7)"}
                    strokeWidth="6"
                />
            )}
            
            {/* Main rectangle */}
            <rect
                x={-props.width / 2}
                y={-props.height / 2}
                width={props.width}
                height={props.height}
                rx={8}
                fill={props.isConflicting 
                    ? (isConflictSelected ? "#0f3f0f" : "#3f0f0f") 
                    : "#0f0f0f"}
                stroke={props.isSelected ? "#ffffff" : "#ffffff"}
                strokeWidth="2"
            />

            {/* Optional label - Only show when not editing */}
            {!isEditingName && (
                <text
                    x="0"
                    y="0"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="#fff"
                    fontSize="20"
                    fontWeight="bold"
                >
                    {props.name}
                </text>
            )}
            
            {/* Name editing input - Only show when editing name */}
            {isEditingName && (
                <foreignObject 
                    x={-75}
                    y={-20}
                    width="150"
                    height="40"
                >
                    <input
                        type="text"
                        value={tempName}
                        onChange={handleNameChange}
                        className="name-input"
                        style={{
                            width: '90%',
                            textAlign: 'center',
                            backgroundColor: '#333',
                            color: 'white',
                            border: '1px solid #555',
                            borderRadius: '3px',
                            fontSize: '16px',
                            padding: '4px'
                        }}
                        autoFocus
                        onBlur={finishNameEdit}
                        onKeyDown={handleNameKeyDown}
                    />
                </foreignObject>
            )}

            {/* If selected, show bounding box + corner handles */}
            {props.isSelected && !props.arcMode && (
                <>
                    <rect
                        x={-props.width / 2}
                        y={-props.height / 2}
                        width={props.width}
                        height={props.height}
                        fill="none"
                        stroke="#007bff"
                        strokeDasharray="8"
                        strokeWidth="2"
                    />
                    {/* Only corner handles => always scale with aspect ratio */}
                    <circle
                        cx={-props.width / 2}
                        cy={-props.height / 2}
                        r={8}
                        fill="#007bff"
                        style={{ cursor: 'nwse-resize' }}
                        onMouseDown={(e) => handleResizeStart('top-left', e)}
                    />
                    <circle
                        cx={props.width / 2}
                        cy={-props.height / 2}
                        r={8}
                        fill="#007bff"
                        style={{ cursor: 'nesw-resize' }}
                        onMouseDown={(e) => handleResizeStart('top-right', e)}
                    />
                    <circle
                        cx={-props.width / 2}
                        cy={props.height / 2}
                        r={8}
                        fill="#007bff"
                        style={{ cursor: 'nesw-resize' }}
                        onMouseDown={(e) => handleResizeStart('bottom-left', e)}
                    />
                    <circle
                        cx={props.width / 2}
                        cy={props.height / 2}
                        r={8}
                        fill="#007bff"
                        style={{ cursor: 'nwse-resize' }}
                        onMouseDown={(e) => handleResizeStart('bottom-right', e)}
                    />
                </>
            )}
        </g>
    );
};