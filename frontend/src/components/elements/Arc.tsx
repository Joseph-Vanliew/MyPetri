// src/components/elements/Arc.tsx
import type { UIArc, UIPlace, UITransition } from '../../types';

interface ArcProps extends UIArc {
    source: UIPlace | UITransition;
    target: UIPlace | UITransition;
    isSelected: boolean;
}

// Compute the anchor point on a circle's circumference
function getCircleAnchorPoint(
    center: { x: number; y: number },
    radius: number,
    target: { x: number; y: number }
) {
    const dx = target.x - center.x;
    const dy = target.y - center.y;
    const angle = Math.atan2(dy, dx);
    return {
        x: center.x + radius * Math.cos(angle),
        y: center.y + radius * Math.sin(angle),
    };
}

// Compute the intersection on a rectangle's boundary
function getRectAnchorPoint(
    center: { x: number; y: number },
    width: number,
    height: number,
    target: { x: number; y: number }
) {
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
function getElementAnchorPoint(
    element: UIPlace | UITransition,
    otherCenter: { x: number; y: number }
) {
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

export const Arc = ({ type, source, target }: ArcProps) => {
    // Compute centers of source and target nodes.
    const sourceCenter = { x: source.x, y: source.y };
    const targetCenter = { x: target.x, y: target.y };

    // Compute anchor points on the boundaries.
    const sourceAnchor = getElementAnchorPoint(source, targetCenter);
    const targetAnchor = getElementAnchorPoint(target, sourceCenter);

    return (
        <line
            x1={sourceAnchor.x}
            y1={sourceAnchor.y}
            x2={targetAnchor.x}
            y2={targetAnchor.y}
            stroke={type === 'INHIBITOR' ? '#ddd' : '#ddd'}
            strokeWidth="2"
            markerEnd={
                type === 'INHIBITOR'
                    ? 'url(#inhibitor)'
                    : type === 'BIDIRECTIONAL'
                        ? 'url(#bidirectional)'
                        : 'url(#arrow)'
            }
            markerStart={type === 'BIDIRECTIONAL' ? 'url(#arrow)' : undefined}
        />
    );
};