import React from 'react';
import type { UIArc, UIPlace, UITransition } from '../../../types';
import { getElementAnchorPoint } from './Arc'; // Assuming this is correctly exported from Arc.tsx

interface ArcPreviewProps {
    selectedTool: string;
    selectedElements: string[];
    places: UIPlace[];
    transitions: UITransition[];
    arcType: UIArc['type'];
    mousePosition: { x: number; y: number } | null; // Expects null initially
}

export const ArcPreview: React.FC<ArcPreviewProps> = ({
    selectedTool,
    selectedElements,
    places,
    transitions,
    arcType,
    mousePosition
}) => {

    // --- Initial Checks --- 
    // Don't render if not in Arc mode, no source selected, or mouse position is unknown
    if (selectedTool !== 'ARC' || selectedElements.length !== 1 || mousePosition === null) {
        return null;
    }

    // --- Calculations (only run if checks above pass) --- 
    const sourceId = selectedElements[0];
    const sourceElement = 
        places.find(p => p.id === sourceId) || 
        transitions.find(t => t.id === sourceId);

    // Need source element to draw from
    if (!sourceElement) return null;

    // We know mousePosition is not null here, so assign it directly
    const currentMousePos = mousePosition;

    // Check if mouse is hovering over a valid potential target
    const potentialTargetElement = 
        places.find(p => 
            Math.sqrt(Math.pow(p.x - currentMousePos.x, 2) + Math.pow(p.y - currentMousePos.y, 2)) <= p.radius &&
            p.id !== sourceId // Cannot target self
        ) ||
        transitions.find(t => {
            const halfWidth = t.width / 2;
            const halfHeight = t.height / 2;
            return (
                currentMousePos.x >= t.x - halfWidth &&
                currentMousePos.x <= t.x + halfWidth &&
                currentMousePos.y >= t.y - halfHeight &&
                currentMousePos.y <= t.y + halfHeight &&
                t.id !== sourceId // Cannot target self
            );
        });

    // Determine the target point: snap to hovered element center or use mouse position
    const targetPoint = potentialTargetElement 
        ? { x: potentialTargetElement.x, y: potentialTargetElement.y }
        : currentMousePos;

    // Calculate anchor points
    const sourceAnchor = getElementAnchorPoint(sourceElement, targetPoint);
    // Use targetPoint directly if no potential target element is hovered
    const targetAnchor = potentialTargetElement 
        ? getElementAnchorPoint(potentialTargetElement, sourceElement) // Point back to source for anchor calculation
        : targetPoint; 

    // Calculate direction vector for adjustments
    const dx = targetAnchor.x - sourceAnchor.x;
    const dy = targetAnchor.y - sourceAnchor.y;
    const length = Math.sqrt(dx * dx + dy * dy);

    // Avoid division by zero if source and target are coincident
    if (length === 0) return null;

    const ndx = dx / length;
    const ndy = dy / length;

    // Adjust endpoints for markers/inhibitor circles
    let adjustedSourceX = sourceAnchor.x;
    let adjustedSourceY = sourceAnchor.y;
    let adjustedTargetX = targetAnchor.x;
    let adjustedTargetY = targetAnchor.y;

    const markerUrl = arcType === 'INHIBITOR' ? undefined : "url(#arrow)";

    if (arcType === "BIDIRECTIONAL") {
        adjustedSourceX = sourceAnchor.x + ndx * 6;
        adjustedSourceY = sourceAnchor.y + ndy * 6;
        adjustedTargetX = targetAnchor.x - ndx * 6;
        adjustedTargetY = targetAnchor.y - ndy * 6;
    } else if (arcType === "REGULAR") {
        adjustedTargetX = targetAnchor.x - ndx * 6;
        adjustedTargetY = targetAnchor.y - ndy * 6;
    } else if (arcType === "INHIBITOR") {
        adjustedTargetX = targetAnchor.x - ndx * 15; // Use appropriate offset for inhibitor preview
        adjustedTargetY = targetAnchor.y - ndy * 15;
    }

    // --- Render Output --- 
    return (
        <g className="arc-preview" pointerEvents="none">
            <line
                x1={adjustedSourceX}
                y1={adjustedSourceY}
                x2={adjustedTargetX}
                y2={adjustedTargetY}
                stroke="#fff" // Consistent blue preview color
                strokeWidth="3"
                markerEnd={markerUrl}
                markerStart={arcType === "BIDIRECTIONAL" ? "url(#arrow)" : undefined}
            />
            {/* Inhibitor circle preview */}
            {arcType === 'INHIBITOR' && (
                <circle 
                    cx={adjustedTargetX} // Draw at the adjusted point
                    cy={adjustedTargetY}
                    r={8} // Match the real inhibitor circle size
                    fill="#ff3333"
                    stroke="#007bff" // Preview stroke color
                    strokeWidth="1" 
                />
            )}
        </g>
    );
}; 