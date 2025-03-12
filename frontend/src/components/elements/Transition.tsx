import React, { useRef, useState, useEffect } from 'react';
import type {UIArc, UITransition} from '../../types';

interface TransitionProps extends UITransition {
    isSelected: boolean;
    onSelect: (id: string) => void;
    onUpdatePosition: (id: string, x: number, y: number) => void;
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
    
    // Size states
    const [originalWidth, setOriginalWidth] = useState(props.width);
    const [originalHeight, setOriginalHeight] = useState(props.height);
    const [aspectRatio, setAspectRatio] = useState(props.height === 0 ? 1 : props.width / props.height);
    
    // Name editing states
    const [isEditingName, setIsEditingName] = useState(false);
    const [tempName, setTempName] = useState(props.name || '');

    // Add state to track if a conflicting transition is selected
    const [isConflictSelected, setIsConflictSelected] = useState(false);

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
    const handleDragStart = (e: React.MouseEvent<SVGGElement>) => {
        if (props.arcMode) return;
        if (activeHandle) return; // skip drag if resizing
        e.stopPropagation();
        setIsDragging(true);

        const svg = groupRef.current?.ownerSVGElement;
        if (!svg || !groupRef.current) return;

        const pt = svg.createSVGPoint();
        pt.x = e.clientX;
        pt.y = e.clientY;
        const inverseCTM = groupRef.current.getScreenCTM()?.inverse();
        if (!inverseCTM) return;

        const localPoint = pt.matrixTransform(inverseCTM);
        setDragOffset({ dx: localPoint.x, dy: localPoint.y });
    };

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

    // Handle dragging
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging || !groupRef.current) return;

            const svg = groupRef.current.ownerSVGElement;
            if (!svg) return;

            const pt = svg.createSVGPoint();
            pt.x = e.clientX;
            pt.y = e.clientY;
            const inverseCTM = groupRef.current.getScreenCTM()?.inverse();
            if (!inverseCTM) return;

            const localPoint = pt.matrixTransform(inverseCTM);
            const newX = props.x + (localPoint.x - dragOffset.dx);
            const newY = props.y + (localPoint.y - dragOffset.dy);

            props.onUpdatePosition(props.id, newX, newY);
        };

        const handleMouseUp = () => {
            setIsDragging(false);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, dragOffset, props, props.x, props.y]);

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

    // ===== RENDER =====
    return (
        <g
            ref={groupRef}
            transform={`translate(${props.x},${props.y})`}
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
                    x={-props.width / 2 - 3}
                    y={-props.height / 2 - 3}
                    width={props.width + 6}
                    height={props.height + 6}
                    rx={5}
                    fill="none"
                    stroke="rgba(0, 255, 0, 0.5)"
                    strokeWidth="3"
                    style={{cursor: 'pointer'}}
                />
            )}
            
            {/* Conflict highlight - for transitions in conflict resolution mode */}
            {props.isConflicting && (
                <rect
                    x={-props.width / 2 - 4}
                    y={-props.height / 2 - 4}
                    width={props.width + 8}
                    height={props.height + 8}
                    rx={6}
                    fill="none"
                    stroke={isConflictSelected ? "rgba(0, 255, 0, 0.7)" : "rgba(255, 0, 0, 0.7)"}
                    strokeWidth="3"
                />
            )}
            
            {/* Main rectangle */}
            <rect
                x={-props.width / 2}
                y={-props.height / 2}
                width={props.width}
                height={props.height}
                rx={4}
                fill={props.isConflicting 
                    ? (isConflictSelected ? "#0f3f0f" : "#3f0f0f") 
                    : "#0f0f0f"}
                stroke={props.isSelected ? "#ffffff" : "#ffffff"}
                strokeWidth="1"
            />

            {/* Optional label - Only show when not editing */}
            {!isEditingName && (
                <text
                    x="0"
                    y="0"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="#fff"
                >
                    {props.name}
                </text>
            )}
            
            {/* Name editing input - Only show when editing name */}
            {isEditingName && (
                <foreignObject 
                    x={-50} 
                    y={-10} 
                    width="100" 
                    height="20"
                >
                    <input
                        type="text"
                        value={tempName}
                        onChange={handleNameChange}
                        className="name-input"
                        style={{
                            width: '100%',
                            textAlign: 'center',
                            backgroundColor: '#333',
                            color: 'white',
                            border: '1px solid #555',
                            borderRadius: '3px'
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
                        strokeDasharray="4"
                    />
                    {/* Only corner handles => always scale with aspect ratio */}
                    <circle
                        cx={-props.width / 2}
                        cy={-props.height / 2}
                        r={4}
                        fill="#007bff"
                        style={{ cursor: 'nwse-resize' }}
                        onMouseDown={(e) => handleResizeStart('top-left', e)}
                    />
                    <circle
                        cx={props.width / 2}
                        cy={-props.height / 2}
                        r={4}
                        fill="#007bff"
                        style={{ cursor: 'nesw-resize' }}
                        onMouseDown={(e) => handleResizeStart('top-right', e)}
                    />
                    <circle
                        cx={-props.width / 2}
                        cy={props.height / 2}
                        r={4}
                        fill="#007bff"
                        style={{ cursor: 'nesw-resize' }}
                        onMouseDown={(e) => handleResizeStart('bottom-left', e)}
                    />
                    <circle
                        cx={props.width / 2}
                        cy={props.height / 2}
                        r={4}
                        fill="#007bff"
                        style={{ cursor: 'nwse-resize' }}
                        onMouseDown={(e) => handleResizeStart('bottom-right', e)}
                    />
                </>
            )}
        </g>
    );
};