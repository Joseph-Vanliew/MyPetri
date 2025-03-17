import React, { useEffect, useState } from 'react';
import { UIPlace, UITransition, UIArc } from '../../types';
import { getElementAnchorPoint } from './utils/anchorPointUtils';

interface ArcPreviewProps {
  selectedTool: 'NONE' | 'PLACE' | 'TRANSITION' | 'ARC';
  selectedElements: string[];
  places: UIPlace[];
  transitions: UITransition[];
  arcType: UIArc['type'];
  mousePosition: { x: number; y: number };
}

// A key to force re-mounting of the component
let operationKey = 0;

export const ArcPreview: React.FC<ArcPreviewProps> = (props) => {
  // Generate a new key whenever the selected source changes
  const [key, setKey] = useState(operationKey);
  
  useEffect(() => {
    if (props.selectedTool === 'ARC' && props.selectedElements.length === 1) {
      // Increment the global key to force a new instance
      operationKey++;
      setKey(operationKey);
    }
  }, [props.selectedTool, props.selectedElements]);
  
  // Don't render anything if we're not in arc mode or don't have a selected source
  if (props.selectedTool !== 'ARC' || props.selectedElements.length === 0) {
    return null;
  }
  
  // Render a new instance of the inner component with a unique key
  return <ArcPreviewInner key={key} {...props} />;
};

// Inner component that handles a single arc drawing operation
const ArcPreviewInner: React.FC<ArcPreviewProps> = ({
  selectedElements,
  places,
  transitions,
  arcType,
  mousePosition
}) => {
  // State to track if this is the first render
  const [isFirstRender, setIsFirstRender] = useState(true);
  // State to store the current target position
  const [targetPosition, setTargetPosition] = useState(mousePosition);
  
  // Set up the initial target position
  useEffect(() => {
    if (isFirstRender) {
      const sourceId = selectedElements[0];
      const sourceElement = 
        places.find(p => p.id === sourceId) ||
        transitions.find(t => t.id === sourceId);
      
      if (sourceElement) {
        // Calculate a position outside the source element
        const angle = Math.PI / 4; // 45 degrees
        let offsetDistance;
        
        if (sourceElement.id.startsWith('place')) {
          offsetDistance = (sourceElement as UIPlace).radius * 2;
        } else {
          const transition = sourceElement as UITransition;
          offsetDistance = Math.max(transition.width, transition.height);
        }
        
        // Set the initial target position
        setTargetPosition({
          x: sourceElement.x + offsetDistance * Math.cos(angle),
          y: sourceElement.y + offsetDistance * Math.sin(angle)
        });
        
        // Mark that we've done the first render
        setIsFirstRender(false);
      }
    }
  }, [isFirstRender, selectedElements, places, transitions]);
  
  // Update the target position when the mouse moves (but only after first render)
  useEffect(() => {
    if (!isFirstRender) {
      setTargetPosition(mousePosition);
    }
  }, [mousePosition, isFirstRender]);
  
  // Don't render anything on the first render
  if (isFirstRender) {
    return null;
  }
  
  const sourceId = selectedElements[0];
  const sourceElement = 
    places.find(p => p.id === sourceId) ||
    transitions.find(t => t.id === sourceId);
      
  if (!sourceElement) return null;
  
  // Check if mouse is over a potential target element
  const potentialTargetElement = 
    places.find(p => 
      Math.sqrt(Math.pow(p.x - targetPosition.x, 2) + Math.pow(p.y - targetPosition.y, 2)) <= p.radius &&
      p.id !== sourceId
    ) ||
    transitions.find(t => {
      const halfWidth = t.width / 2;
      const halfHeight = t.height / 2;
      return (
        targetPosition.x >= t.x - halfWidth &&
        targetPosition.x <= t.x + halfWidth &&
        targetPosition.y >= t.y - halfHeight &&
        targetPosition.y <= t.y + halfHeight &&
        t.id !== sourceId
      );
    });
  
  // Use the target element's position if mouse is over a target, otherwise use the current target position
  const targetPoint = potentialTargetElement 
    ? { x: potentialTargetElement.x, y: potentialTargetElement.y }
    : targetPosition;
  
  // Calculate source anchor point
  const sourceAnchor = getElementAnchorPoint(sourceElement, targetPoint);
  
  // Calculate target anchor point if we have a potential target element
  const targetAnchor = potentialTargetElement
    ? getElementAnchorPoint(potentialTargetElement, { x: sourceElement.x, y: sourceElement.y })
    : targetPoint;
  
  // Calculate the direction vector for adjustments
  const dx = targetAnchor.x - sourceAnchor.x;
  const dy = targetAnchor.y - sourceAnchor.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  
  // Avoid division by zero
  if (length === 0) return null;
  
  // Normalizing the vector
  const ndx = dx / length;
  const ndy = dy / length;
  
  // Adjust source and target points based on arc type
  let adjustedSourceX = sourceAnchor.x;
  let adjustedSourceY = sourceAnchor.y;
  let adjustedTargetX = targetAnchor.x;
  let adjustedTargetY = targetAnchor.y;
  
  if (arcType === "BIDIRECTIONAL") {
    // Adjust both ends for bidirectional arcs
    adjustedSourceX = sourceAnchor.x + ndx * 6;
    adjustedSourceY = sourceAnchor.y + ndy * 6;
    adjustedTargetX = targetAnchor.x - ndx * 6;
    adjustedTargetY = targetAnchor.y - ndy * 6;
  } else if (arcType === "REGULAR") {
    // Adjust only the target end for regular arcs
    adjustedTargetX = targetAnchor.x - ndx * 6;
    adjustedTargetY = targetAnchor.y - ndy * 6;
  } else if (arcType === "INHIBITOR") {
    // For inhibitor arcs, position the circle further from the target element
    adjustedTargetX = targetAnchor.x - ndx * 15;
    adjustedTargetY = targetAnchor.y - ndy * 15;
  }
  
  return (
    <g className="preview-arc-layer">
      {/* Main visible arc (white stroke) */}
      <line
        x1={adjustedSourceX}
        y1={adjustedSourceY}
        x2={adjustedTargetX}
        y2={adjustedTargetY}
        stroke="#ddd"
        strokeWidth="3"
        markerEnd={
          arcType === "INHIBITOR"
            ? undefined
            : "url(#arrow)"
        }
        markerStart={arcType === "BIDIRECTIONAL" ? "url(#arrow)" : undefined}
      />

      {/* Custom circle for inhibitor arcs */}
      {arcType === "INHIBITOR" && (
        <circle
          cx={adjustedTargetX}
          cy={adjustedTargetY}
          r={8}
          fill="#ff3333"
          stroke="#ddd"
          strokeWidth="2"
        />
      )}
    </g>
  );
}; 