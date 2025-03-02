// src/components/elements/Arc.tsx
import type { UIArc, UIPlace, UITransition } from '../../types';

interface ArcProps extends UIArc {
    source: UIPlace | UITransition;
    target: UIPlace | UITransition;
    isSelected: boolean;
    onSelect: (id: string) => void;
}

// Compute the anchor point on a circle's circumference
function getCircleAnchorPoint(center: { x: number; y: number }, radius: number, target: { x: number; y: number }) {
    const dx = target.x - center.x;
    const dy = target.y - center.y;
    const angle = Math.atan2(dy, dx);
    return {
        x: center.x + radius * Math.cos(angle),
        y: center.y + radius * Math.sin(angle),
    };
}

// Compute the intersection on a rectangle's boundary
function getRectAnchorPoint(center: { x: number; y: number }, width: number, height: number, target: { x: number; y: number }) {
    const dx = target.x - center.x;
    const dy = target.y - center.y;
    const halfWidth = width / 2;
    const halfHeight = height / 2;
    if (dx === 0 && dy === 0) return center;

    // Determine the scaling factors needed to reach the rectangle edge
    const scaleX = halfWidth / Math.abs(dx);
    const scaleY = halfHeight / Math.abs(dy);
    const scale = Math.min(scaleX, scaleY);
    return {
        x: center.x + dx * scale,
        y: center.y + dy * scale,
    };
}

// Decide which helper to use based on the element type.
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

export const Arc = ( props: ArcProps) => {
    // Compute centers of source and target nodes.
    const sourceCenter = { x: props.source.x, y: props.source.y };
    const targetCenter = { x: props.target.x, y: props.target.y };

    // Compute anchor points on the boundaries.
    const sourceAnchor = getElementAnchorPoint(props.source, targetCenter);
    const targetAnchor = getElementAnchorPoint(props.target, sourceCenter);


    return (
        <g onClick={(e) => {
            e.stopPropagation();
            props.onSelect(props.id);  // ✅ Select arc when clicked
        }}>
            {/* Invisible stroke for easier selection */}
            <line
                x1={sourceAnchor.x}
                y1={sourceAnchor.y}
                x2={targetAnchor.x}
                y2={targetAnchor.y}
                stroke="transparent"
                strokeWidth="10"
            />

            {/* Main visible arc (white stroke) */}
            <line
                x1={sourceAnchor.x}
                y1={sourceAnchor.y}
                x2={targetAnchor.x}
                y2={targetAnchor.y}
                stroke="#ddd"
                strokeWidth="2"
                markerEnd={
                    props.type === "INHIBITOR"
                        ? "url(#inhibitor)"
                        : props.type === "BIDIRECTIONAL"
                            ? "url(#bidirectional)"
                            : "url(#arrow)"
                }
                markerStart={props.type === "BIDIRECTIONAL" ? "url(#arrow)" : undefined}
            />

            {/* Overlay dashed blue stroke when selected */}
            {props.isSelected && (
                <line
                    x1={sourceAnchor.x}
                    y1={sourceAnchor.y}
                    x2={targetAnchor.x}
                    y2={targetAnchor.y}
                    stroke="#007bff"  // ✅ Blue color for selection
                    strokeWidth="1.5"  // Slightly thicker to stand out
                    strokeDasharray="5,5"  // ✅ Dashed effect
                />
            )}
        </g>
    );
};