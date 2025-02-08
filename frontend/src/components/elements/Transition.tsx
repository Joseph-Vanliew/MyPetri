import React, { useRef, useState, useEffect } from 'react';
import type { UITransition } from '../../types';

interface TransitionProps extends UITransition {
    isSelected: boolean;
    onSelect: (id: string) => void;
    onUpdatePosition: (id: string, x: number, y: number) => void;
    onUpdateSize: (id: string, newWidth: number, newHeight: number) => void;
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

    // -----------------------------------
    // DRAGGING / REPOSITIONING
    // -----------------------------------
    const handleDragStart = (e: React.MouseEvent<SVGGElement>) => {
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
        e.stopPropagation(); // don’t start drag
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

            // We'll preserve aspect ratio by scaling width + height together
            let newWidth: number;
            let newHeight: number;

            // Distance from center in X + Y
            const dx = localPoint.x;
            const dy = localPoint.y;

            // We'll measure how much bigger/smaller the user has dragged
            // relative to the original half-width/half-height
            const halfW = originalWidth / 2;
            const halfH = originalHeight / 2;

            const scaleX = halfW === 0 ? 1 : Math.abs(dx) / halfW;
            const scaleY = halfH === 0 ? 1 : Math.abs(dy) / halfH;
            const scale = Math.max(scaleX, scaleY);

            newWidth = originalWidth * scale;
            newHeight = newWidth / aspectRatio;

            // clamp to min size
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
            {props.isSelected && (
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