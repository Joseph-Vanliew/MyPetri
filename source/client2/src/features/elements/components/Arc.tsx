import React from 'react';
import type { Arc as ArcType } from '../../../types/domain.js';
import { calculateInhibitorCirclePosition } from '../utils/arcCalculationUtils.js';
import '../elements.css';

interface ArcProps {
  arc: ArcType;
  pathData: string; // Canvas will provide the calculated path
  startPoint?: { x: number; y: number };
  endPoint?: { x: number; y: number };
  onSelect?: (arc: ArcType) => void;
  onDeselect?: (arc: ArcType) => void;
  onDragStart?: (arc: ArcType, event: React.MouseEvent) => void;
  onDrag?: (arc: ArcType, event: React.MouseEvent) => void;
  onDragEnd?: (arc: ArcType, event: React.MouseEvent) => void;
}

const Arc: React.FC<ArcProps> = ({ 
  arc, 
  pathData, 
  startPoint,
  endPoint,
  onSelect, 
  onDeselect, 
  onDragStart, 
  onDrag: _onDrag, 
  onDragEnd: _onDragEnd 
}) => {
  const { weight, arcType, isSelected: selected } = arc;

  const handleClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (selected) {
      onDeselect?.(arc);
    } else {
      onSelect?.(arc);
    }
  };

  const handleMouseDown = (event: React.MouseEvent) => {
    event.stopPropagation();
    onDragStart?.(arc, event);
  };

  return (
    <g
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      className={`arc-element ${arcType}`}
    >
      {/* Selection hit area */}
      <path
        d={pathData}
        className="selection-hit-area"
      />
      
      {/* Main arc path */}
      <path
        d={pathData}
        markerEnd={arcType === 'inhibitor' ? undefined : "url(#arrow)"}
        markerStart={arcType === 'bidirectional' ? "url(#bidirectional)" : undefined}
        className="main-path"
      />
      
      {/* Inhibitor circle - position just outside the target border */}
      {arcType === 'inhibitor' && startPoint && endPoint && (() => {
        const { cx, cy, r } = calculateInhibitorCirclePosition(startPoint, endPoint);
        return (
          <circle
            cx={cx}
            cy={cy}
            r={r}
            className="inhibitor-circle"
          />
        );
      })()}
      
      {/* Selection indicator */}
      {selected && (
        <path
          d={pathData}
          className="selection-indicator"
        />
      )}
      
      {/* Weight label - positioned at the middle of the path */}
      {weight > 1 && (
        <text
          className="weight-label"
        >
          {weight}
        </text>
      )}
    </g>
  );
};

export default Arc; 