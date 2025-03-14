// src/components/elements/Arc.tsx
import type { UIArc, UIPlace, UITransition } from '../../types';

interface ArcProps extends UIArc {
    source: UIPlace | UITransition;
    target: UIPlace | UITransition;
    isSelected: boolean;
    onSelect: (id: string) => void;
}

// Deciding which helper to use based on the element type.
function getElementAnchorPoint( element: UIPlace | UITransition, otherCenter: { x: number; y: number }) {
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

export const Arc = ( props: ArcProps ) => {
    // Compute centers of source and target nodes.
    const sourceCenter = { x: props.source.x, y: props.source.y };
    const targetCenter = { x: props.target.x, y: props.target.y };

    // Compute anchor points on the boundaries.
    const sourceAnchor = getElementAnchorPoint(props.source, targetCenter);
    const targetAnchor = getElementAnchorPoint(props.target, sourceCenter);

    // For all arc types, we need to adjust the line slightly to accommodate markers
    let adjustedSourceX = sourceAnchor.x;
    let adjustedSourceY = sourceAnchor.y;
    let adjustedTargetX = targetAnchor.x;
    let adjustedTargetY = targetAnchor.y;
    
    // Calculate the direction vector
    const dx = targetAnchor.x - sourceAnchor.x;
    const dy = targetAnchor.y - sourceAnchor.y;
    
    // Calculate the length of the vector
    const length = Math.sqrt(dx * dx + dy * dy);
    
    // Normalizing the vector
    const ndx = dx / length;
    const ndy = dy / length;
    
    if (props.type === "BIDIRECTIONAL") {
        // Adjust both ends for bidirectional arcs
        adjustedSourceX = sourceAnchor.x + ndx * 6;  // Adjusted from 8 to 6
        adjustedSourceY = sourceAnchor.y + ndy * 6;  // Adjusted from 8 to 6
        adjustedTargetX = targetAnchor.x - ndx * 6;  // Adjusted from 8 to 6
        adjustedTargetY = targetAnchor.y - ndy * 6;  // Adjusted from 8 to 6
    } else if (props.type === "REGULAR") {
        // Adjust only the target end for regular arcs
        adjustedTargetX = targetAnchor.x - ndx * 6;  // Adjusted from 8 to 6
        adjustedTargetY = targetAnchor.y - ndy * 6;  // Adjusted from 8 to 6
    } else if (props.type === "INHIBITOR") {
        // For inhibitor arcs, position the circle further from the target element
        adjustedTargetX = targetAnchor.x - ndx * 15; // Adjusted from 20 to 15
        adjustedTargetY = targetAnchor.y - ndy * 15; // Adjusted from 20 to 15
    }

    return (
        <g onClick={(e) => {
            e.stopPropagation();
            props.onSelect(props.id);  // Select arc when clicked
        }}>
            {/* Invisible stroke for easier selection */}
            <line
                x1={sourceAnchor.x}
                y1={sourceAnchor.y}
                x2={targetAnchor.x}
                y2={targetAnchor.y}
                stroke="transparent"
                strokeWidth="15"  // Adjusted from 20 to 15
            />

            {/* Main visible arc (white stroke) */}
            <line
                x1={adjustedSourceX}
                y1={adjustedSourceY}
                x2={adjustedTargetX}
                y2={adjustedTargetY}
                stroke="#ddd"
                strokeWidth="3"  // Adjusted from 4 to 3
                markerEnd={
                    props.type === "INHIBITOR"
                        ? undefined
                        : "url(#arrow)"
                }
                markerStart={props.type === "BIDIRECTIONAL" ? "url(#arrow)" : undefined}
            />

            {/* Custom circle for inhibitor arcs */}
            {props.type === "INHIBITOR" && (
                <circle
                    cx={adjustedTargetX}
                    cy={adjustedTargetY}
                    r={8}  // Adjusted from 10 to 8
                    fill="#ff3333"
                    stroke="#ddd"
                    strokeWidth="2"  // Adjusted from 3 to 2
                />
            )}

            {/* Overlay dashed blue stroke when selected */}
            {props.isSelected && (
                <line
                    x1={adjustedSourceX}
                    y1={adjustedSourceY}
                    x2={adjustedTargetX}
                    y2={adjustedTargetY}
                    stroke="#007bff"
                    strokeWidth="2"  // Adjusted from 3 to 2
                    strokeDasharray="8,8"  // Adjusted from 10,10 to 8,8
                />
            )}
        </g>
    );
};