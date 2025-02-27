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
}

export const Transition = (props: TransitionProps) => {
    const groupRef = useRef<SVGGElement>(null);

    // Which resize handle is active? (e.g. "top-left", etc.)
    const [activeHandle, setActiveHandle] = useState<string | null>(null);

    // Dragging
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ dx: 0, dy: 0 });

    // preserve shape on drag
    const [originalWidth, setOriginalWidth] = useState(props.width);
    const [originalHeight, setOriginalHeight] = useState(props.height);
    const [aspectRatio, setAspectRatio] = useState(props.height === 0 ? 1 : props.width / props.height);

    const [isHovered, setIsHovered] = useState(false);

    // -----------------------------------
    // DRAGGING / REPOSITIONING
    // -----------------------------------
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

    // -----------------------------------
    // RESIZING
    // -----------------------------------
    const handleResizeStart = (handle: string, e: React.MouseEvent) => {
        e.stopPropagation(); // don't start drag
        setActiveHandle(handle);
        setOriginalWidth(props.width);
        setOriginalHeight(props.height);
        setAspectRatio(
            props.height === 0 ? 1 : props.width / props.height
        );
    };

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


    return (
        <g
            ref={groupRef}
            transform={`translate(${props.x},${props.y})`}
            className="petri-element transition"
            onClick={(e) => {
                e.stopPropagation();
                props.onSelect(props.id);
            }}

            onMouseDown={handleDragStart}

            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Main rectangle */}
            <rect
                x={-props.width / 2}
                y={-props.height / 2}
                width={props.width}
                height={props.height}
                rx={4}
                fill="#0f0f0f"
                stroke={props.isSelected ? "#ffffff" : "#ffffff"}
                strokeWidth="1"
            />

            {/* Optional label */}
            <text
                x="0"
                y="0"
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#fff"
            >
                {props.name}
            </text>

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
            {/* When in arc mode and if arcType is not INHIBITOR, render a port marker */}
            {props.arcMode && isHovered && (
                <circle
                    cx={props.width / 2} // Right edge of the rectangle
                    cy={0}
                    r={4}
                    fill="green"
                    style={{ cursor: 'pointer' }}
                    onClick={(e) => {
                        e.stopPropagation();
                        // Call onSelect to mark this transition for arc creation
                        props.onArcPortClick(props.id);
                    }}
                />
            )}
        </g>
    );
};