// src/components/elements/Place.tsx
import React, { useRef, useState, useEffect, useCallback } from 'react';
import type {UIArc, UIPlace} from '../../types';
import '../styles/Place.css';

interface PlaceProps extends UIPlace {
    isSelected: boolean;
    onSelect: (id: string, event?: React.MouseEvent) => void;
    onUpdatePosition: (id: string, newX: number, newY: number, dragState: 'start' | 'dragging' | 'end') => void;
    onUpdateSize: (id: string, newRadius: number, resizeState: 'start' | 'resizing' | 'end') => void;
    onUpdateTokens: (id: string, newTokens: number) => void;
    onArcPortClick: (id: string) => void;
    arcMode?: boolean;
    arcType?: UIArc['type'];
    onTypingChange: (isTyping: boolean) => void;
    onUpdateName?: (id: string, newName: string) => void;
    onUpdatePlaceCapacity?: (id: string, capacity: number | null) => void;
    showCapacityEditorMode: boolean;
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
    const [isEditingTokens, setIsEditingTokens] = useState(false);
    
    // Name editing states
    const [isEditingName, setIsEditingName] = useState(false);
    const [tempName, setTempName] = useState(props.name || '');

    // Capacity editing states
    const [isEditingCapacity, setIsEditingCapacity] = useState(false);
    const [tempCapacity, setTempCapacity] = useState<string>(
        props.capacity !== null ? String(props.capacity) : ''
    );

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

    // Update tempCapacity when props.capacity changes externally ONLY if not currently editing
    useEffect(() => {
        if (!isEditingCapacity) {
            setTempCapacity(props.capacity !== null ? String(props.capacity) : '');
        }
    }, [props.capacity, isEditingCapacity]);

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
            props.onUpdateSize(props.id, newRadius, 'resizing');
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

    // Effect to turn off token editing when deselected
    useEffect(() => {
        if (!props.isSelected) {
            setIsEditingTokens(false);
        }
    }, [props.isSelected]);

    // ===== EVENT HANDLERS =====
    // Token input handlers (modified/new)
    const handleTokenFocus = (e: React.FocusEvent<HTMLInputElement>) => {
        e.stopPropagation();
        props.onTypingChange(true);
    };

    const handleTokenBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        e.stopPropagation();
        finishTokenEdit(); // Finish edit on blur
    };

    const handleTokenKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        event.stopPropagation();
        if (event.key === "Enter") {
            finishTokenEdit();
        } else if (event.key === "Escape") {
            cancelTokenEdit();
        }
    };

    const finishTokenEdit = () => {
        let newTokenCount = parseInt(tempTokenCount, 10);
        if (isNaN(newTokenCount) || newTokenCount < 0) {
            newTokenCount = props.tokens;
        }
        setTokenCount(newTokenCount);
        if (newTokenCount !== props.tokens) {
             props.onUpdateTokens(props.id, newTokenCount);
        }
        setIsEditingTokens(false);
        props.onTypingChange(false);
    };

    const cancelTokenEdit = () => {
        setTempTokenCount(props.tokens.toString());
        setIsEditingTokens(false);
        props.onTypingChange(false);
    };
    
    const handleTokenInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        event.stopPropagation();
        setTempTokenCount(event.target.value);
    };

    const handleTokenInputClick = (e: React.MouseEvent) => {
        e.stopPropagation();
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

    // Capacity editing handlers
    const handleCapacityDoubleClick = (e: React.MouseEvent) => {

        e.stopPropagation(); // Stop propagation immediately
        
        // Select the element first on double click attempt
        props.onSelect(props.id);
       
        setIsEditingCapacity(true);
        // Initialize with current value or empty string if null/n
        setTempCapacity(props.capacity !== null ? String(props.capacity) : '');
        props.onTypingChange(true);
    };

    const handleCapacityChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setTempCapacity(event.target.value);
    };

    const handleCapacityKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === "Enter") {
            finishCapacityEdit();
        } else if (event.key === "Escape") {
            cancelCapacityEdit();
        }
    };

    const cancelCapacityEdit = () => {
        setIsEditingCapacity(false);
        props.onTypingChange(false);
        setTempCapacity(props.capacity !== null ? String(props.capacity) : '');
    };

    const finishCapacityEdit = () => {
        setIsEditingCapacity(false);
        props.onTypingChange(false);
        const trimmedCapacity = tempCapacity.trim();

        if (trimmedCapacity === '') {
            if (props.onUpdatePlaceCapacity) {
                props.onUpdatePlaceCapacity(props.id, null);
            }
        } else {
            let newCapacityValue = parseInt(trimmedCapacity, 10);
            if (!isNaN(newCapacityValue) && newCapacityValue >= 0) {
                if (props.onUpdatePlaceCapacity) {
                    props.onUpdatePlaceCapacity(props.id, newCapacityValue);
                }
            } else {
                cancelCapacityEdit();
            }
        }
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

                const targetElement = e.target as SVGElement;
                // Check if the click target is the main circle shape
                const isMainCircle = targetElement.classList?.contains('place-circle');

                // ONLY trigger arc port click if in arcMode AND clicking the main circle
                if (props.arcMode && isHovered && isMainCircle) {
                    props.onArcPortClick(props.id);
                }
                // If NOT in arc mode, select the element regardless of where the click occurred within the group
                else if (!props.arcMode) {
                    props.onSelect(props.id);
                }
                // Implicit else: If in arcMode but click was not on the main circle, do nothing.
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
                    className="place-arc-highlight"
                />
            )}

            {/* Original Circle */}
            <circle
                r={props.radius}
                className={`place-circle ${props.bounded ? 'bounded' : ''}`}
            />

            {/* Token Count Display - Show when NOT editing tokens */}
            {!isEditingTokens && (
                <text
                    x="0"
                    y={props.showCapacityEditorMode ? -10 : 0}
                    className="place-token-count"
                    dominantBaseline="central"
                    onClick={(e) => {
                        e.stopPropagation();
                        // Only select if NOT in arc mode (handler only runs if pointer-events != none)
                        if (!props.arcMode) {
                            props.onSelect(props.id);
                        }
                    }}
                    onDoubleClick={(e) => {
                        e.stopPropagation();
                        if (!props.arcMode) {
                            setIsEditingTokens(true);
                        }
                    }}
                    // Add pointer-events: none when in arc mode
                    style={props.arcMode ? { pointerEvents: 'none' } : undefined}
                >
                    {tokenCount}
                </text>
            )}

            {/*Token Input - Show ONLY when editing tokens and not in arc mode */}
            {isEditingTokens && !props.arcMode && (
                 <g transform={`translate(0, ${props.showCapacityEditorMode ? -10 : 0})`}> 
                     <foreignObject x="-20" y="-12" width="40" height="24"> 
                         <div 
                             onClick={handleTokenInputClick} 
                             onDoubleClick={(e) => e.stopPropagation()}
                             style={{ width: '100%', height: '100%' }}
                         >
                             <input
                                 type="number"
                                 value={tempTokenCount}
                                 onChange={handleTokenInputChange} 
                                 className="place-token-input" 
                                 min="0"
                                 onFocus={handleTokenFocus} 
                                 onBlur={handleTokenBlur} 
                                 onKeyDown={handleTokenKeyDown} 
                                 onClick={(e) => e.stopPropagation()}
                                 autoFocus 
                                 style={{ width: '100%', height: '100%', boxSizing: 'border-box', textAlign: 'center' }} 
                             />
                         </div>
                     </foreignObject>
                 </g>
            )}

            {/* Label Below - Only show when not editing name */}
            {!isEditingName && props.name && (
                <text
                    x={props.radius + 6}
                    y={-props.radius + 10}
                    className="place-label"
                    onDoubleClick={(e) => {
                        e.stopPropagation();
                        handleDoubleClick(e);
                    }}
                    // Add pointer-events: none when in arc mode
                    style={props.arcMode ? { pointerEvents: 'none' } : undefined}
                >
                    {props.name}
                </text>
            )}
            
            {/* Capacity TEXT Label - Positioned directly */}
            {props.showCapacityEditorMode && !isEditingCapacity && (
                <text
                    x="0"
                    y="30"
                    className="place-capacity-label"
                    fill="#fff"
                    onDoubleClick={handleCapacityDoubleClick}
                    onClick={(e) => {
                        e.stopPropagation(); // Keep stopping propagation for double-click handling
                    }}
                    textAnchor="middle"
                    // Add pointer-events: none when in arc mode
                    style={props.arcMode ? { pointerEvents: 'none' } : undefined}
                >
                    <title>Max Tokens (Double-click to edit, empty=unbounded)</title>
                    {`<= ${props.capacity !== null ? props.capacity : 'n'}`}
                </text>
            )}
            
            {/* Capacity INPUT Box - Group positioned to align with where text WAS */}
            {props.showCapacityEditorMode && isEditingCapacity && (
                <g transform={`translate(0, 25)`}>
                    <foreignObject x="-20" y="-12" width="40" height="20">
                        <input
                            type="number"
                            value={tempCapacity}
                            onChange={handleCapacityChange}
                            onKeyDown={handleCapacityKeyDown}
                            onBlur={finishCapacityEdit}
                            className="place-capacity-input"
                            autoFocus
                            placeholder="n"
                            min="0"
                            style={{ width: '100%', height: '100%', boxSizing: 'border-box' }}
                        />
                    </foreignObject>
                </g>
            )}
            
            {/* Name editing input - Only show when editing name */}
            {isEditingName && (
                <foreignObject 
                    x={props.radius + 6}
                    y={-props.radius + 6}
                    width="150"
                    height="25"
                >
                    <input
                        type="text"
                        value={tempName}
                        onChange={handleNameChange}
                        className="place-name-input"
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
                        className="place-bounding-box"
                    />

                    {/* Corner Resize handles */}
                    <circle
                        cx={-props.radius}
                        cy={-props.radius}
                        r="8"
                        className="place-resize-handle top-left"
                        onMouseDown={(e) => {
                            e.stopPropagation();
                            setActiveHandle('top-left');
                        }}
                    />
                    <circle
                        cx={props.radius}
                        cy={-props.radius}
                        r="8"
                        className="place-resize-handle top-right"
                        onMouseDown={(e) => {
                            e.stopPropagation();
                            setActiveHandle('top-right');
                        }}
                    />
                    <circle
                        cx={-props.radius}
                        cy={props.radius}
                        r="8"
                        className="place-resize-handle bottom-left"
                        onMouseDown={(e) => {
                            e.stopPropagation();
                            setActiveHandle('bottom-left');
                        }}
                    />
                    <circle
                        cx={props.radius}
                        cy={props.radius}
                        r="8"
                        className="place-resize-handle bottom-right"
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