// src/components/elements/Arc.tsx
import { useEffect, useState } from 'react';
import type { UIArc, UIPlace, UITransition } from '../../../types';

interface ArcProps extends UIArc {
    source: UIPlace | UITransition;
    target: UIPlace | UITransition;
    isSelected: boolean;
    onSelect: (id: string) => void;
    offset?: number;
}

// Deciding which helper to use based on the element type.
function getElementAnchorPoint(element: UIPlace | UITransition, otherCenter: { x: number; y: number }) {
    const center = { x: element.x, y: element.y };
    if (element.id.startsWith('place')) {
        // For a place, use its radius.
        return getCircleAnchorPoint(center, (element as UIPlace).radius, otherCenter);
    } else if (element.id.startsWith('trans')) {
        // For a transition, use its width and height.
        return getRectAnchorPoint(center, (element as UITransition).width, (element as UITransition).height, otherCenter);
    }
    return center;
}

// Computing the anchor point on a circle's circumference
function getCircleAnchorPoint(center: { x: number; y: number }, radius: number, target: { x: number; y: number }) {
    const dx = target.x - center.x;
    const dy = target.y - center.y;
    const angle = Math.atan2(dy, dx);
    return {
        x: center.x + radius * Math.cos(angle),
        y: center.y + radius * Math.sin(angle),
    };
}

// Computing the intersection on a rectangle's boundary
function getRectAnchorPoint(center: { x: number; y: number }, width: number, height: number, target: { x: number; y: number }) {
    const dx = target.x - center.x;
    const dy = target.y - center.y;
    const halfWidth = width / 2;
    const halfHeight = height / 2;
    if (dx === 0 && dy === 0) return center;

    // Determining the scaling factors needed to reach the rectangle edge
    const scaleX = halfWidth / Math.abs(dx);
    const scaleY = halfHeight / Math.abs(dy);
    const scale = Math.min(scaleX, scaleY);
    return {
        x: center.x + dx * scale,
        y: center.y + dy * scale,
    };
}

export const Arc = (props: ArcProps) => {
    const { offset = 0 } = props;

    // Use state to track the current positions
    const [sourcePos, setSourcePos] = useState({ x: props.source.x, y: props.source.y });
    const [targetPos, setTargetPos] = useState({ x: props.target.x, y: props.target.y });
    
    // Update positions when props change
    useEffect(() => {
        setSourcePos({ x: props.source.x, y: props.source.y });
        setTargetPos({ x: props.target.x, y: props.target.y });
    }, [props.source.x, props.source.y, props.target.x, props.target.y]);
    
    // Compute initial anchor points 
    let sourceAnchor = getElementAnchorPoint(
        { ...props.source, x: sourcePos.x, y: sourcePos.y } as UIPlace | UITransition, 
        targetPos
    );
    let targetAnchor = getElementAnchorPoint(
        { ...props.target, x: targetPos.x, y: targetPos.y } as UIPlace | UITransition, 
        sourcePos
    );

    // Calculate direction vector and length
    const dx = targetAnchor.x - sourceAnchor.x;
    const dy = targetAnchor.y - sourceAnchor.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    
    // Normalize direction vector
    const ndx = dx / length;
    const ndy = dy / length;

    // Calculate perpendicular vector for offset
    const perpDx = -ndy;
    const perpDy = ndx;

    // Apply offset if needed
    if (offset !== 0 && length > 0) {
        sourceAnchor.x += perpDx * offset;
        sourceAnchor.y += perpDy * offset;
        targetAnchor.x += perpDx * offset;
        targetAnchor.y += perpDy * offset;
    }

    // For all arc types, we need to adjust the line slightly to accommodate markers
    let adjustedSourceX = sourceAnchor.x;
    let adjustedSourceY = sourceAnchor.y;
    let adjustedTargetX = targetAnchor.x;
    let adjustedTargetY = targetAnchor.y;
    
    // Adjust endpoints for markers (using the potentially offset vector)
    const adjDx = adjustedTargetX - adjustedSourceX;
    const adjDy = adjustedTargetY - adjustedSourceY;
    const adjLength = Math.sqrt(adjDx * adjDx + adjDy * adjDy);
    const adjNdx = adjLength > 0 ? adjDx / adjLength : 0;
    const adjNdy = adjLength > 0 ? adjDy / adjLength : 0;
    
    if (props.type === "BIDIRECTIONAL") {
        adjustedSourceX = sourceAnchor.x + adjNdx * 6;
        adjustedSourceY = sourceAnchor.y + adjNdy * 6;
        adjustedTargetX = targetAnchor.x - adjNdx * 6;
        adjustedTargetY = targetAnchor.y - adjNdy * 6;
    } else if (props.type === "REGULAR") {
        adjustedTargetX = targetAnchor.x - adjNdx * 6;
        adjustedTargetY = targetAnchor.y - adjNdy * 6;
    } else if (props.type === "INHIBITOR") {
        adjustedTargetX = targetAnchor.x - adjNdx * 15;
        adjustedTargetY = targetAnchor.y - adjNdy * 15;
    }

    // Calculate control point for quadratic bezier curve if offset
    let controlX: number | null = null;
    let controlY: number | null = null;
    if (offset !== 0 && length > 0) {
        const midX = (sourceAnchor.x + targetAnchor.x) / 2;
        const midY = (sourceAnchor.y + targetAnchor.y) / 2;
        // Control point offset perpendicularly from the midpoint
        // The amount of curve can be adjusted by changing the multiplier (e.g., offset * 0.5)
        controlX = midX + perpDx * offset * 0.4;
        controlY = midY + perpDy * offset * 0.4;
    }

    // Path data string: Use Q for quadratic bezier if offset, M L for straight line otherwise
    const pathData = controlX !== null && controlY !== null
        ? `M ${adjustedSourceX},${adjustedSourceY} Q ${controlX},${controlY} ${adjustedTargetX},${adjustedTargetY}`
        : `M ${adjustedSourceX},${adjustedSourceY} L ${adjustedTargetX},${adjustedTargetY}`;

    // Selection path data (follows the same curve)
    const selectionPathData = controlX !== null && controlY !== null
        ? `M ${sourceAnchor.x},${sourceAnchor.y} Q ${controlX},${controlY} ${targetAnchor.x},${targetAnchor.y}`
        : `M ${sourceAnchor.x},${sourceAnchor.y} L ${targetAnchor.x},${targetAnchor.y}`;

    return (
        <g onClick={(e) => {
            e.stopPropagation();
            props.onSelect(props.id);  // Select arc when clicked
        }}>
            {/* Invisible path for easier selection, now following the curve */}
            <path
                d={selectionPathData}
                fill="none"
                stroke="transparent"
                strokeWidth="20" // Wider invisible stroke for easier clicking
                pointerEvents="stroke" // Make only the stroke clickable
            />

            {/* Main visible arc path */}
            <path
                d={pathData}
                fill="none"
                stroke="#ddd"
                strokeWidth="3"
                markerEnd={
                    props.type === "INHIBITOR"
                        ? undefined
                        : "url(#arrow)"
                }
                markerStart={props.type === "BIDIRECTIONAL" ? "url(#arrow)" : undefined}
            />

            {/* Custom circle for inhibitor arcs (position adjusted for curve) */}
            {props.type === "INHIBITOR" && (
                <circle
                    cx={adjustedTargetX}
                    cy={adjustedTargetY}
                    r={8}
                    fill="#ff3333"
                    stroke="#ddd"
                    strokeWidth="2"
                />
            )}

            {/* Overlay dashed blue path when selected */}
            {props.isSelected && (
                <path
                    d={pathData}
                    fill="none"
                    stroke="#007bff"
                    strokeWidth="2"
                    strokeDasharray="8,8"
                />
            )}
        </g>
    );
};