// src/components/elements/Arc.tsx
import { useEffect, useState, useMemo } from 'react';
import type { UIArc, UIPlace, UITransition } from '../../../types';

interface ArcProps extends UIArc {
    source: UIPlace | UITransition;
    target: UIPlace | UITransition;
    isSelected: boolean;
    onSelect: (id: string) => void;
    allArcs: UIArc[];
}

// Deciding which helper to use based on the element type.
export function getElementAnchorPoint(element: UIPlace | UITransition, otherCenter: { x: number; y: number }) {
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
    const [sourcePos, setSourcePos] = useState({ x: props.source.x, y: props.source.y });
    const [targetPos, setTargetPos] = useState({ x: props.target.x, y: props.target.y });
    
    useEffect(() => {
        setSourcePos({ x: props.source.x, y: props.source.y });
        setTargetPos({ x: props.target.x, y: props.target.y });
    }, [props.source.x, props.source.y, props.target.x, props.target.y]);
    
    // Calculate dynamic offset using useMemo based on all arcs
    const offset = useMemo(() => {
        const OFFSET_AMOUNT = 18; // Keep the increased amount
        
        // Find siblings by filtering all arcs
        const siblings = props.allArcs.filter(a => {
            const keyA = [a.incomingId, a.outgoingId].sort().join('-');
            const keyCurrent = [props.incomingId, props.outgoingId].sort().join('-');
            return keyA === keyCurrent;
        });

        const n = siblings.length;
        if (n <= 1) return 0; // No offset if only one arc

        // Sort siblings by ID for consistent ordering
        siblings.sort((a, b) => a.id.localeCompare(b.id)); 
        const index = siblings.findIndex(a => a.id === props.id);
        
        // Check if index was found (should always be found)
        if (index === -1) return 0; 

        const startFactor = -(n - 1) / 2.0;
        const factor = startFactor + index;
        let calculatedOffset = factor * OFFSET_AMOUNT;
        
        // Determine canonical direction and flip offset if necessary
        const sortedIds = [props.incomingId, props.outgoingId].sort();
        const canonicalSourceId = sortedIds[0];
        if (props.incomingId !== canonicalSourceId) {
            calculatedOffset *= -1;
        }
        
        return calculatedOffset;

    // Depend on all arcs and the specific arc's identity/endpoints
    }, [props.allArcs, props.id, props.incomingId, props.outgoingId]);

    let sourceAnchor = getElementAnchorPoint(
        { ...props.source, x: sourcePos.x, y: sourcePos.y } as UIPlace | UITransition, 
        targetPos
    );
    let targetAnchor = getElementAnchorPoint(
        { ...props.target, x: targetPos.x, y: targetPos.y } as UIPlace | UITransition, 
        sourcePos
    );
    
    const dx = targetAnchor.x - sourceAnchor.x;
    const dy = targetAnchor.y - sourceAnchor.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    
    const ndx = length > 0 ? dx / length : 0;
    const ndy = length > 0 ? dy / length : 0;

    const perpDx = -ndy;
    const perpDy = ndx;

    if (offset !== 0 && length > 0) {
        sourceAnchor.x += perpDx * offset;
        sourceAnchor.y += perpDy * offset;
        targetAnchor.x += perpDx * offset;
        targetAnchor.y += perpDy * offset;
    }

    let adjustedSourceX = sourceAnchor.x;
    let adjustedSourceY = sourceAnchor.y;
    let adjustedTargetX = targetAnchor.x;
    let adjustedTargetY = targetAnchor.y;
    
    const adjDx = adjustedTargetX - adjustedSourceX;
    const adjDy = adjustedTargetY - adjustedSourceY;
    const adjLength = Math.sqrt(adjDx * adjDx + adjDy * adjDy);
    const adjNdx = adjLength > 0 ? adjDx / adjLength : 0;
    const adjNdy = adjLength > 0 ? adjDy / adjLength : 0;
    
    const markerUrl = "url(#arrow)";
    
    if (props.type === "BIDIRECTIONAL") {
        adjustedSourceX = sourceAnchor.x + adjNdx * 6;
        adjustedSourceY = sourceAnchor.y + adjNdy * 6;
        adjustedTargetX = targetAnchor.x - adjNdx * 6;
        adjustedTargetY = targetAnchor.y - adjNdy * 6;
    } else if (props.type === "REGULAR") {
        adjustedTargetX = targetAnchor.x - adjNdx * 6;
        adjustedTargetY = targetAnchor.y - adjNdy * 6;
    } else if (props.type === "INHIBITOR") {
        adjustedTargetX = targetAnchor.x - adjNdx * 16; 
        adjustedTargetY = targetAnchor.y - adjNdy * 16;
    }

    let controlX: number | null = null;
    let controlY: number | null = null;
    if (offset !== 0 && length > 0) {
        const midX = (sourceAnchor.x + targetAnchor.x) / 2;
        const midY = (sourceAnchor.y + targetAnchor.y) / 2;
        controlX = midX + perpDx * offset * 0.4;
        controlY = midY + perpDy * offset * 0.4;
    }

    const pathData = controlX !== null && controlY !== null
        ? `M ${adjustedSourceX},${adjustedSourceY} Q ${controlX},${controlY} ${adjustedTargetX},${adjustedTargetY}`
        : `M ${adjustedSourceX},${adjustedSourceY} L ${adjustedTargetX},${adjustedTargetY}`;

    const selectionPathData = controlX !== null && controlY !== null
        ? `M ${sourceAnchor.x},${sourceAnchor.y} Q ${controlX},${controlY} ${targetAnchor.x},${targetAnchor.y}`
        : `M ${sourceAnchor.x},${sourceAnchor.y} L ${targetAnchor.x},${targetAnchor.y}`;

    return (
        <g onClick={(e) => {
            e.stopPropagation();
            props.onSelect(props.id);
        }}>
            <path
                d={selectionPathData}
                fill="none"
                stroke="transparent"
                strokeWidth="20"
                pointerEvents="stroke"
            />
            <path
                d={pathData}
                fill="none"
                stroke="#fff"
                strokeWidth="3"
                markerEnd={props.type === "INHIBITOR" ? undefined : markerUrl}
                markerStart={props.type === "BIDIRECTIONAL" ? markerUrl : undefined}
            />
            {/* Custom circle logic for inhibitor arcs */}
            {(() => {
                // Log inhibitor rendering attempt
                if (props.type === "INHIBITOR") {
                    return (
                        <circle
                            cx={adjustedTargetX}
                            cy={adjustedTargetY}
                            r={8} 
                            fill="#ff3333" // Revert to red fill for visibility
                            stroke="#fff" 
                            strokeWidth="2"
                        />
                    );
                }
                return null; // Return null if not inhibitor type
            })()}
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