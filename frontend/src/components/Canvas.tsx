import React, { useState, useCallback } from 'react';
import { Place } from './elements/Place';
import { Transition } from './elements/Transition';
import { Arc } from './elements/Arc';
import { UIPlace, UITransition, UIArc, GRID_CELL_SIZE } from '../types';

interface CanvasProps {
    places: UIPlace[];
    transitions: UITransition[];
    arcs: UIArc[];
    selectedElements: string[];
    onCanvasClick: (x: number, y: number) => void;
    onSelectElement: (id: string) => void;
}

export const Canvas = ({
                           places,
                           transitions,
                           arcs,
                           selectedElements,
                           onCanvasClick,
                           onSelectElement,
                       }: CanvasProps) => {

    // starting bounds for the canvas grid and element rendering, *adjust later when polishing*
    const [viewBox, setViewBox] = useState({ x: 0, y: 0, w: 800, h: 600 });

    // for zooming in and out; potential for resizing objects
    const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
        e.preventDefault();

        // zoom aggressiveness:
        const zoomFactor = 0.05;

        // If deltaY < 0, user is scrolling up => zoom in (decrease w/h).
        // If deltaY > 0, user is scrolling down => zoom out (increase w/h).
        const direction = e.deltaY < 0 ? -1 : 1;

        // Calculate new width/height
        const newW = viewBox.w * (1 + direction * zoomFactor);
        const newH = viewBox.h * (1 + direction * zoomFactor);

        // Optionally, center the zoom on the mouse pointer:
        // 1. Convert mouse coords to SVG coords
        const svgRect = e.currentTarget.getBoundingClientRect();
        const mouseX = e.clientX - svgRect.left;
        const mouseY = e.clientY - svgRect.top;

        // 2. Mouse offset in the current SVG coordinate space
        //    (mouseX / the physical width) * the viewBox's width
        const percentX = mouseX / svgRect.width;
        const percentY = mouseY / svgRect.height;
        const xOffset = viewBox.w * percentX;
        const yOffset = viewBox.h * percentY;

        // 3. Adjust x/y so the zoom is centered on mouse
        const newX = viewBox.x + xOffset - (xOffset * newW) / viewBox.w;
        const newY = viewBox.y + yOffset - (yOffset * newH) / viewBox.h;

        setViewBox({ x: newX, y: newY, w: newW, h: newH });
    };

    const renderGrid = useCallback(
        (vBox: { x: number; y: number; w: number; h: number }) => {
            const lines = [];


            // Using Math.floor/ceil to ensure lines snap to grid multiples.
            const startX = Math.floor(vBox.x / GRID_CELL_SIZE) * GRID_CELL_SIZE;
            const endX   = Math.ceil((vBox.x + vBox.w) / GRID_CELL_SIZE) * GRID_CELL_SIZE;

            // Generate vertical lines and math for resizing
            for (let xVal = startX; xVal <= endX; xVal += GRID_CELL_SIZE) {
                lines.push(
                    <line
                        key={`v-${xVal}`}
                        x1={xVal}
                        y1={vBox.y}
                        x2={xVal}
                        y2={vBox.y + vBox.h}
                        stroke="#e9ecef"
                        opacity="0.4"
                        strokeWidth="0.5"
                    />
                );
            }

            const startY = Math.floor(vBox.y / GRID_CELL_SIZE) * GRID_CELL_SIZE;
            const endY   = Math.ceil((vBox.y + vBox.h) / GRID_CELL_SIZE) * GRID_CELL_SIZE;

            // Generate horizontal lines and math for resizing
            for (let yVal = startY; yVal <= endY; yVal += GRID_CELL_SIZE) {
                lines.push(
                    <line
                        key={`h-${yVal}`}
                        x1={vBox.x}
                        y1={yVal}
                        x2={vBox.x + vBox.w}
                        y2={yVal}
                        stroke="#e9ecef"
                        opacity="0.4"
                        strokeWidth="0.5"
                    />
                );
            }

            return lines;
        },
        []
    );

    const getElementPosition = (id: string) => {
        const place = places.find(p => p.id === id);
        if (place) return { x: place.x, y: place.y };

        const transition = transitions.find(t => t.id === id);
        if (transition) return { x: transition.x, y: transition.y };
        return null;
    };

    const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
        e.preventDefault();

        const rect = e.currentTarget.getBoundingClientRect();

        // Mouse position in *screen* pixels
        const mousePx = e.clientX - rect.left;
        const mousePy = e.clientY - rect.top;

        // The ratio between the physical <svg> size and the "virtual" viewBox size
        const scaleX = viewBox.w / rect.width;
        const scaleY = viewBox.h / rect.height;

        // Convert screen px => your current viewBox coordinates
        const xInViewBox = viewBox.x + mousePx * scaleX;
        const yInViewBox = viewBox.y + mousePy * scaleY;

        onCanvasClick(xInViewBox, yInViewBox);
    };

    return (
        <svg
            className="petri-canvas"
            width={800}
            height={600}
            // important
            viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
            onWheel={handleWheel}
            onClick={handleSvgClick}
            style={{ backgroundColor: '#1a1a1a' }}
        >
            {/* Grid Layer */}
            <g className="grid-layer">{renderGrid(viewBox)}</g>

            {/* Arcs Layer */}
            <g className="arcs-layer">
                {arcs.map(arc => {
                    const sourcePos = getElementPosition(arc.incomingId);
                    const targetPos = getElementPosition(arc.outgoingId);

                    return sourcePos && targetPos ? (
                        <Arc
                            key={arc.id}
                            id={arc.id}
                            type={arc.type}
                            sourcePos={sourcePos}
                            targetPos={targetPos}
                        />
                    ) : null;
                })}
            </g>

            {/* Elements Layer */}
            <g className="elements-layer">
                {places.map(place => (
                    <Place
                        key={place.id}
                        id={place.id}
                        x={place.x}
                        y={place.y}
                        tokens={place.tokens}
                        isSelected={selectedElements.includes(place.id)}
                        onSelect={onSelectElement}
                    />
                ))}

                {transitions.map(transition => (
                    <Transition
                        key={transition.id}
                        id={transition.id}
                        x={transition.x}
                        y={transition.y}
                        enabled={transition.enabled}
                        isSelected={selectedElements.includes(transition.id)}
                        onSelect={onSelectElement}
                    />
                ))}
            </g>

            {/* Marker definitions */}
            <defs>
                <marker
                    id="arrow"
                    viewBox="0 0 10 10"
                    refX="9"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                >
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#262626" />
                </marker>

                <marker
                    id="inhibitor"
                    viewBox="0 0 10 10"
                    refX="9"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                >
                    <circle cx="5" cy="5" r="4" fill="#ff4d4f" />
                </marker>

                <marker
                    id="bidirectional"
                    viewBox="0 0 10 10"
                    refX="1"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                >
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#262626" />
                </marker>
            </defs>
        </svg>
    );
};