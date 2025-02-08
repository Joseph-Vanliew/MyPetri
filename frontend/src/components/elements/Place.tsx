// src/components/elements/Place.tsx
import React, { useRef, useState, useEffect } from 'react';
import type { UIPlace } from '../../types';

interface PlaceProps extends UIPlace {
    isSelected: boolean;
    onSelect: (id: string) => void;
    onUpdatePosition: (id: string, x: number, y: number) => void;
    onUpdateSize: (id: string, newRadius: number) => void;
}

export const Place = (props : PlaceProps) => {

    const groupRef = useRef<SVGGElement>(null);
    //Sets the handle for resizing
    const [activeHandle, setActiveHandle] = useState<string | null>(null);
    //Clears useState for dragging
    const [isDragging, setIsDragging] = useState(false);
    //Makes sure we're clicking on a place
    const [dragOffset, setDragOffset] = useState({ dx: 0, dy: 0 });

    /* helper function for the dragging useState */
    const handleDragStart = (e: React.MouseEvent<SVGGElement>) => {
        // Only start dragging if no resize handle is active.
        if (activeHandle) return;
        e.stopPropagation();
        setIsDragging(true);

        // Get the SVG element
        const svg = groupRef.current?.ownerSVGElement;
        if (!svg || !groupRef.current) return;

        // Convert the mouse position to the group's local coordinates.
        const pt = svg.createSVGPoint();
        pt.x = e.clientX;
        pt.y = e.clientY;
        const inverseCTM = groupRef.current.getScreenCTM()?.inverse();
        if (!inverseCTM) return;
        const localPoint = pt.matrixTransform(inverseCTM);

        // Save the offset from the element's center (assumed to be at 0,0).
        setDragOffset({ dx: localPoint.x, dy: localPoint.y });
    };

    // RESIZING
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

    // DRAGGING / REPOSITIONING
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

            // Calculate new position:
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
    }, [isDragging, dragOffset, props.id, props.onUpdatePosition, props.x, props.y]);


    return (
        <g
            ref={groupRef}
            transform={`translate(${props.x},${props.y})`}
            className="petri-element place"
            onClick={(e) => {
                // Stop propagation so that this click doesn't trigger other canvas clicks.
                e.stopPropagation();
                props.onSelect(props.id);
            }}
            onMouseDown={handleDragStart}
        >
            {/* Original Circle */}
            <circle
                r={props.radius}
                fill="#0f0f0f"
                stroke="#ffffff"
                strokeWidth="1"
            >
            </circle>

            {/* Text label below the circle */}
            <text
                x="0"
                y={props.radius + 10}
                textAnchor="middle"
                dominantBaseline="middle"
                className="token-count"
            >
                {props.name}
            </text>

            {/* Handle Resizing and render bounding box*/}
            {props.isSelected && (
                <>
                    {/* Dashed bounding box */}
                    <rect
                        x={-props.radius}
                        y={-props.radius}
                        width={2 * props.radius}
                        height={2 * props.radius}
                        fill="none"
                        stroke="#007bff"
                        strokeDasharray="4"
                    />

                    {/* Corner Resize handles */}
                    <circle
                        cx={-props.radius}
                        cy={-props.radius}
                        r={4}
                        fill="#007bff"
                        style={{ cursor: 'nwse-resize' }}
                        onMouseDown={(e) => {
                            e.stopPropagation();
                            setActiveHandle('top-left');
                        }}
                    />
                    <circle
                        cx={props.radius}
                        cy={-props.radius}
                        r={4}
                        fill="#007bff"
                        style={{ cursor: 'nesw-resize' }}
                        onMouseDown={(e) => {
                            e.stopPropagation();
                            setActiveHandle('top-right');
                        }}
                    />
                    <circle
                        cx={-props.radius}
                        cy={props.radius}
                        r={4}
                        fill="#007bff"
                        style={{ cursor: 'nesw-resize' }}
                        onMouseDown={(e) => {
                            e.stopPropagation();
                            setActiveHandle('bottom-left');
                        }}
                    />
                    <circle
                        cx={props.radius}
                        cy={props.radius}
                        r={4}
                        fill="#007bff"
                        style={{ cursor: 'nwse-resize' }}
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