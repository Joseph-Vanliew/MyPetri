import React, { useRef, useState, useEffect, useCallback } from 'react';
import { UITextBox } from '../../types';

interface TextBoxProps extends UITextBox {
    isSelected: boolean;
    onSelect: (id: string, event?: React.MouseEvent) => void;
    onUpdatePosition: (id: string, newX: number, newY: number, dragState: 'start' | 'dragging' | 'end') => void;
    onUpdateSize: (id: string, newWidth: number, newHeight: number, resizeState: 'start' | 'resizing' | 'end') => void;
    onUpdateText?: (id: string, newText: string) => void;
    arcMode?: boolean;
    onTypingChange: (isTyping: boolean) => void;
}

export const TextBox = (props: TextBoxProps) => {
    // ===== REFS =====
    const groupRef = useRef<SVGGElement>(null);

    // ===== STATE =====
    // Interaction states
    const [activeHandle, setActiveHandle] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ dx: 0, dy: 0 });
    const [isHovered, setIsHovered] = useState(false);
    

    
    // Text editing states
    const [isEditingText, setIsEditingText] = useState(false);
    const [tempText, setTempText] = useState(props.text || '');

    // Always use the position from props (which includes alignment guide snapping)
    const visualPosition = { x: props.x, y: props.y };

    // ===== EVENT HANDLERS =====
    // Text editing handlers
    const handleDoubleClick = (e: React.MouseEvent) => {
        if (props.arcMode) return; // Don't allow editing in arc mode
        e.stopPropagation();
        setIsEditingText(true);
        props.onTypingChange(true);
    };
    
    const handleTextChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        setTempText(event.target.value);
    };
    
    const handleTextKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.key === "Enter" && event.ctrlKey) {
            finishTextEdit();
        } else if (event.key === "Escape") {
            cancelTextEdit();
        }
    };
    
    const finishTextEdit = () => {
        setIsEditingText(false);
        props.onTypingChange(false);
        if (props.onUpdateText) {
            props.onUpdateText(props.id, tempText);
        }
    };
    
    const cancelTextEdit = () => {
        setIsEditingText(false);
        props.onTypingChange(false);
        setTempText(props.text || '');
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
    };

    // ===== EFFECTS =====
    // Sync text with props
    useEffect(() => {
        setTempText(props.text || '');
    }, [props.text]);
    
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

            // Convert the screen coordinates to the group's local coordinate system.
            const pt = svg.createSVGPoint();
            pt.x = e.clientX;
            pt.y = e.clientY;
            const inverseCTM = groupRef.current.getScreenCTM()?.inverse();
            if (!inverseCTM) return;
            const localPoint = pt.matrixTransform(inverseCTM);

            let newWidth = props.width;
            let newHeight = props.height;

            // Calculate new dimensions based on handle
            switch (activeHandle) {
                case 'right':
                    newWidth = Math.max(Math.abs(localPoint.x) * 2, 50);
                    break;
                case 'bottom':
                    newHeight = Math.max(Math.abs(localPoint.y) * 2, 30);
                    break;
                case 'bottom-right':
                    newWidth = Math.max(Math.abs(localPoint.x) * 2, 50);
                    newHeight = Math.max(Math.abs(localPoint.y) * 2, 30);
                    break;
                default:
                    break;
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
    }, [activeHandle, props]);

    // ===== RENDER =====
    return (
        <g
            ref={groupRef}
            data-id={props.id}
            transform={`translate(${visualPosition.x},${visualPosition.y})`}
            className="petri-element textbox"
            onClick={(e) => {
                e.stopPropagation();
                if (!props.arcMode) {
                    props.onSelect(props.id, e);
                }
            }}
            onDoubleClick={handleDoubleClick}
            onMouseDown={handleDragStart}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={props.arcMode && isHovered ? {cursor: 'pointer'} : undefined}
        >
            {/* Arc mode highlight */}
            {props.arcMode && isHovered && (
                <rect
                    x={-props.width / 2 - 6}
                    y={-props.height / 2 - 6}
                    width={props.width + 12}
                    height={props.height + 12}
                    rx="8"
                    className="textbox-arc-highlight"
                />
            )}

            {/* No rectangle - just text */}

            {/* Text content - Only show when not editing */}
            {!isEditingText && (
                <text
                    x="0"
                    y="0"
                    className={`textbox-text ${props.isSelected ? 'selected' : ''}`}
                    textAnchor="middle"
                    dominantBaseline="middle"
                >
                    {props.text || 'Text'}
                </text>
            )}
            
            {/* Text editing input - Only show when editing */}
            {isEditingText && (
                <foreignObject 
                    x={-props.width / 2 + 10}
                    y={-props.height / 2 + 10}
                    width={props.width - 20}
                    height={props.height - 20}
                >
                    <textarea
                        value={tempText}
                        onChange={handleTextChange}
                        className="textbox-text-input"
                        autoFocus
                        onBlur={finishTextEdit}
                        onKeyDown={handleTextKeyDown}
                        placeholder="Enter text here..."
                        style={{
                            width: '100%',
                            height: '100%',
                            resize: 'none',
                            border: 'none',
                            outline: 'none',
                            background: 'transparent',
                            color: 'white',
                            fontSize: '16px',
                            fontFamily: 'sans-serif',
                            textAlign: 'center',
                            verticalAlign: 'middle',
                            lineHeight: '1.2'
                        }}
                    />
                </foreignObject>
            )}

            {/* If selected, show bounding box + resize handles */}
            {props.isSelected && !props.arcMode && (
                <>
                    <rect
                        x={-props.width / 2}
                        y={-props.height / 2}
                        width={props.width}
                        height={props.height}
                        className="textbox-bounding-box"
                        fill="none"
                    />
                    
                    {/* Resize handles */}
                    <circle
                        cx={props.width / 2}
                        cy={0}
                        r="8"
                        className="textbox-resize-handle right"
                        onMouseDown={(e) => handleResizeStart('right', e)}
                    />
                    <circle
                        cx={0}
                        cy={props.height / 2}
                        r="8"
                        className="textbox-resize-handle bottom"
                        onMouseDown={(e) => handleResizeStart('bottom', e)}
                    />
                    <circle
                        cx={props.width / 2}
                        cy={props.height / 2}
                        r="8"
                        className="textbox-resize-handle bottom-right"
                        onMouseDown={(e) => handleResizeStart('bottom-right', e)}
                    />
                </>
            )}
        </g>
    );
}; 