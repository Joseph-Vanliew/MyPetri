// src/components/elements/Place.tsx
import React, { useRef, useState, useEffect, useCallback } from 'react';
import type {UIArc, UIPlace} from '../../types';

interface PlaceProps extends UIPlace {
    isSelected: boolean;
    onSelect: (id: string) => void;
    onUpdatePosition: (id: string, x: number, y: number, dragState?: 'start' | 'dragging' | 'end') => void;
    onUpdateSize: (id: string, newRadius: number) => void;
    onUpdateTokens: (id: string, newTokens: number) => void;
    onArcPortClick: (id:string) => void;
    arcMode?: boolean;
    arcType?: UIArc['type'];
    onTypingChange: (isTyping: boolean) => void;
    onUpdateName?: (id: string, newName: string) => void;
}

export const Place = (props : PlaceProps) => {
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
    
    // Token states
    const [tokenCount, setTokenCount] = useState<number>(props.tokens);
    const [tempTokenCount, setTempTokenCount] = useState<string>(props.tokens.toString());
    const [, setIsTyping] = useState(false);
    
    // Name editing states
    const [isEditingName, setIsEditingName] = useState(false);
    const [tempName, setTempName] = useState(props.name || '');

    // Compute the current visual position (either from local state during dragging or from props)
    const visualPosition = isDragging ? localPosition : { x: props.x, y: props.y };
    
    // ===== EFFECTS =====
    // Sync token count with props
    useEffect(() => {
        setTokenCount(props.tokens);
        setTempTokenCount(props.tokens.toString());
    }, [props.tokens]);
    
    // Sync name with props
    useEffect(() => {
        setTempName(props.name || '');
    }, [props.name]);
    
    // Sync local position with props
    useEffect(() => {
        setLocalPosition({ x: props.x, y: props.y });
    }, [props.x, props.y]);

    // Make visualPosition available as a property on the component instance
    useEffect(() => {
        if (groupRef.current) {
            // Store the visual position as a property on the DOM element
            (groupRef.current as any).visualPosition = visualPosition;
        }
    }, [visualPosition]);

    // Handle resizing
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!activeHandle || !groupRef.current) return;
            const svg = groupRef.current.ownerSVGElement;
            if (!svg) return;

            // Convert the screen coordinates to the group's local coordinate system.
            const pt = svg.createSVGPoint();
            pt.x = e.clientX;
            pt.y = e.clientY;
            const inverseCTM = groupRef.current.getScreenCTM()?.inverse();
            if (!inverseCTM) return;
            const localPoint = pt.matrixTransform(inverseCTM);

            let newRadius = props.radius;
            // Depending on which handle is active, compute the new radius.
            // For an edge handle, we use the absolute value of the corresponding coordinate.
            // For a corner handle, we use the distance from the center.
            switch (activeHandle) {
                case 'top':
                    newRadius = Math.max(Math.abs(localPoint.y), 10);
                    break;
                case 'bottom':
                    newRadius = Math.max(Math.abs(localPoint.y), 10);
                    break;
                case 'left':
                    newRadius = Math.max(Math.abs(localPoint.x), 10);
                    break;
                case 'right':
                    newRadius = Math.max(Math.abs(localPoint.x), 10);
                    break;
                case 'top-left':
                case 'top-right':
                case 'bottom-left':
                case 'bottom-right':
                    newRadius = Math.max(Math.sqrt(localPoint.x * localPoint.x + localPoint.y * localPoint.y), 10);
                    break;
                default:
                    break;
            }
            props.onUpdateSize(props.id, newRadius);
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
    }, [activeHandle, props.id, props.onUpdateSize, props.radius]);

    // Handle dragging
    const handleDragStart = useCallback((e: React.MouseEvent<SVGGElement>) => {
        // Only start dragging if no resize handle is active.
        if (props.arcMode) return;
        if (activeHandle) return;
        e.stopPropagation();
        
        // Get the SVG element
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

    // ===== EVENT HANDLERS =====
    // Token input handlers
    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
        e.stopPropagation();
        setIsTyping(true);
        setTempTokenCount("");
        props.onTypingChange(true);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        e.stopPropagation();
        setIsTyping(false);
        props.onTypingChange(false);
        setTempTokenCount(tokenCount.toString());
    };

    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        event.stopPropagation();
        setTempTokenCount(event.target.value);
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        event.stopPropagation();
        if (event.key === "Enter") {
            let newTokenCount = parseInt(tempTokenCount, 10);

            if (isNaN(newTokenCount) || newTokenCount < 0) {
                newTokenCount = 0; // Ensure a non-negative number
            }

            setTokenCount(newTokenCount);
            props.onUpdateTokens(props.id, newTokenCount);
            setIsTyping(false);
        }
    };

    // Add a specific handler for token input clicks
    const handleTokenInputClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        // Prevent event bubbling to avoid triggering other click handlers
    };

    // Name editing handlers
    const handleDoubleClick = (e: React.MouseEvent) => {
        if (props.arcMode) return; // Don't allow editing in arc mode
        e.stopPropagation();
        setIsEditingName(true);
        props.onTypingChange(true);
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
        props.onTypingChange(false);
        if (props.onUpdateName) {
            props.onUpdateName(props.id, tempName);
        }
    };
    
    const cancelNameEdit = () => {
        setIsEditingName(false);
        props.onTypingChange(false);
        setTempName(props.name || '');
    };

    // ===== RENDER =====
    return (
        <g
            ref={groupRef}
            data-id={props.id}
            transform={`translate(${visualPosition.x},${visualPosition.y})`}
            className="petri-element place"
            onClick={(e) => {
                // Stop propagation so that this click doesn't trigger other canvas clicks.
                e.stopPropagation();
                
                // If in arc mode and hovered, trigger arc creation
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
            style={props.arcMode && isHovered ? {cursor: 'pointer'} : undefined}
        >
            {/* Arc mode highlight - renders a light green circle around the place when hovered */}
            {props.arcMode && isHovered && (
                <circle
                    r={props.radius + 6}
                    fill="none"
                    stroke="rgba(0, 255, 0, 0.5)"
                    strokeWidth="6"
                    style={{cursor: 'pointer'}}
                />
            )}

            {/* Original Circle */}
            <circle
                r={props.radius}
                fill="#0f0f0f"
                stroke="#ffffff"
                strokeWidth="2"
            />

            {/* Token Count Display */}
            <text 
                x="0" 
                y="10"
                textAnchor="middle" 
                className="token-count" 
                fill="white"
                fontSize="24"
                fontWeight="bold"
            >
                {tokenCount}
            </text>

            {/*Token Input - Only renders when selected */}
            {props.isSelected && !props.arcMode && (
                <foreignObject 
                    x="-30"
                    y="50"
                    width="60"
                    height="30"
                >
                    <div 
                        onClick={handleTokenInputClick} 
                        onDoubleClick={(e) => e.stopPropagation()}
                        style={{ width: '100%', height: '100%' }}
                    >
                        <input
                            type="number"
                            value={tempTokenCount}
                            onChange={handleInputChange}
                            className="token-input"
                            min="0"
                            onFocus={handleFocus}
                            onBlur={handleBlur}
                            onKeyDown={handleKeyDown}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                                width: '80%',
                                fontSize: '20px',
                                padding: '2px'
                            }}
                        />
                    </div>
                </foreignObject>
            )}

            {/* Label Below - Only show when not editing */}
            {!isEditingName && (
                <text 
                    x={props.radius + 10}
                    y={-props.radius + 10}
                    textAnchor="start" 
                    dominantBaseline="hanging" 
                    className="token-count"
                    fill="white"
                    fontSize="18"
                >
                    {props.name}
                </text>
            )}
            
            {/* Name editing input - Only show when editing name */}
            {isEditingName && (
                <foreignObject 
                    x={props.radius + 10}
                    y={-props.radius - 20}
                    width="150"
                    height="40"
                >
                    <input
                        type="text"
                        value={tempName}
                        onChange={handleNameChange}
                        className="name-input"
                        style={{
                            width: '80%',
                            textAlign: 'left',
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

            {/* Handle Resizing and render bounding box*/}
            {props.isSelected && !props.arcMode && (
                <>
                    {/* Dashed bounding box */}
                    <rect
                        x={-props.radius}
                        y={-props.radius}
                        width={2 * props.radius}
                        height={2 * props.radius}
                        fill="none"
                        stroke="#007bff"
                        strokeDasharray="8"
                        strokeWidth="2"
                    />

                    {/* Corner Resize handles */}
                    <circle
                        cx={-props.radius}
                        cy={-props.radius}
                        r={8}
                        fill="#007bff"
                        style={{cursor: 'nwse-resize'}}
                        onMouseDown={(e) => {
                            e.stopPropagation();
                            setActiveHandle('top-left');
                        }}
                    />
                    <circle
                        cx={props.radius}
                        cy={-props.radius}
                        r={8}
                        fill="#007bff"
                        style={{cursor: 'nesw-resize'}}
                        onMouseDown={(e) => {
                            e.stopPropagation();
                            setActiveHandle('top-right');
                        }}
                    />
                    <circle
                        cx={-props.radius}
                        cy={props.radius}
                        r={8}
                        fill="#007bff"
                        style={{cursor: 'nesw-resize'}}
                        onMouseDown={(e) => {
                            e.stopPropagation();
                            setActiveHandle('bottom-left');
                        }}
                    />
                    <circle
                        cx={props.radius}
                        cy={props.radius}
                        r={8}
                        fill="#007bff"
                        style={{cursor: 'nwse-resize'}}
                        onMouseDown={(e) => {
                            e.stopPropagation();
                            setActiveHandle('bottom-right');
                        }}
                    />
                </>
            )}
        </g>
    );
};