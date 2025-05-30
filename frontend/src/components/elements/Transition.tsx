import React, { useRef, useState, useEffect, useCallback } from 'react';
import type {UIArc, UITransition} from '../../types';
import '../styles/Transition.css';

interface TransitionProps extends UITransition {
    isSelected: boolean;
    onSelect: (id: string, event?: React.MouseEvent) => void;
    onUpdatePosition: (id: string, newX: number, newY: number, dragState: 'start' | 'dragging' | 'end') => void;
    onUpdateSize: (id: string, newWidth: number, newHeight: number, resizeState: 'start' | 'resizing' | 'end') => void;
    arcMode?: boolean;
    arcType?: UIArc['type'];
    onArcPortClick: (id:string) => void;
    onUpdateName?: (id: string, newName: string) => void;
    onTypingChange?: (isTyping: boolean) => void;
    isConflicting?: boolean;
    onConflictingTransitionSelect?: (id: string) => void;
    conflictResolutionMode?: boolean;
    isFired?: boolean;
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

    // Always use the position from props (which includes alignment guide snapping)
    const visualPosition = { x: props.x, y: props.y };

    // ===== EVENT HANDLERS =====
    // Name editing handlers
    const handleDoubleClick = (e: React.MouseEvent) => {
        // Don't allow editing in arc mode or conflict resolution mode
        if (props.arcMode || props.conflictResolutionMode) return;
        
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
            
            // Update parent component in real-time to make arcs follow
            props.onUpdatePosition(props.id, newX, newY, 'dragging');
        };

        const handleMouseUp = () => {
            // Notify parent that dragging has ended - use current props position (includes snapping)
            props.onUpdatePosition(props.id, props.x, props.y, 'end');
            
            setIsDragging(false);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, dragOffset, props]);

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
            
            props.onUpdateSize(props.id, newWidth, newHeight, 'resizing');
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
                    className="transition-arc-highlight"
                />
            )}
            
            {/* Main rectangle - adjust fill and animation based on states */}
            <rect
                x={-props.width / 2}
                y={-props.height / 2}
                width={props.width}
                height={props.height}
                rx="8"
                className={`transition-rectangle ${
                    props.isSelected ? 'selected' : 
                    (props.conflictResolutionMode && props.isConflicting) ? 'conflicting' : 
                    (props.enabled && !props.conflictResolutionMode) ? 'enabled' : ''
                } ${props.isFired ? 'transition-fired' : ''}`}
            />

            {/* Optional label - Only show when not editing */}
            {!isEditingName && (
                <text
                    x="0"
                    y="0"
                    className="transition-label"
                >
                    {props.name}
                </text>
            )}
            
            {/* Name editing input - Only show when editing name */}
            {isEditingName && (
                <foreignObject 
                    x={-54}
                    y={-13}
                    width="120"
                    height="30"
                >
                    <input
                        type="text"
                        value={tempName}
                        onChange={handleNameChange}
                        className="transition-name-input"
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
                        className="transition-bounding-box"
                    />
                    {/* Only corner handles => always scale with aspect ratio */}
                    <circle
                        cx={-props.width / 2}
                        cy={-props.height / 2}
                        r={8}
                        className="transition-resize-handle top-left"
                        onMouseDown={(e) => handleResizeStart('top-left', e)}
                    />
                    <circle
                        cx={props.width / 2}
                        cy={-props.height / 2}
                        r={8}
                        className="transition-resize-handle top-right"
                        onMouseDown={(e) => handleResizeStart('top-right', e)}
                    />
                    <circle
                        cx={-props.width / 2}
                        cy={props.height / 2}
                        r={8}
                        className="transition-resize-handle bottom-left"
                        onMouseDown={(e) => handleResizeStart('bottom-left', e)}
                    />
                    <circle
                        cx={props.width / 2}
                        cy={props.height / 2}
                        r={8}
                        className="transition-resize-handle bottom-right"
                        onMouseDown={(e) => handleResizeStart('bottom-right', e)}
                    />
                </>
            )}
        </g>
    );
};