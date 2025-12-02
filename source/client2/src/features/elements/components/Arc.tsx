import React from 'react';
import type { Arc as ArcType } from '../../../types/domain.js';
import { calculateInhibitorCirclePosition, calculateWeightLabelPosition } from '../utils/arcCalculationUtils.js';
import { useElementsStore, useProjectStore } from '../../../stores/index.js';
import '../elements.css';

interface ArcProps {
  arc: ArcType;
  pathData: string; // Canvas will provide the calculated path
  startPoint?: { x: number; y: number };
  endPoint?: { x: number; y: number };
  onSelect?: (arc: ArcType) => void;
  onDeselect?: (arc: ArcType) => void;
  onDragStart?: (arc: ArcType, event: React.MouseEvent) => void;
  // Note: onDrag and onDragEnd are handled at SVG level, not per-element
}

const Arc: React.FC<ArcProps> = ({ 
  arc, 
  pathData, 
  startPoint,
  endPoint,
  onSelect, 
  onDragStart
}) => {
  const { weight, arcType } = arc;
  
  // Compute isSelected from store (UI-only state)
  const { selectedElementIds } = useElementsStore();
  const { project } = useProjectStore();
  const selected = project?.activePageId 
    ? (selectedElementIds[project.activePageId] || []).includes(arc.id)
    : false;

  const handleClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    // Always select - don't toggle if already selected
    if (!selected) {
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
      
      {/* Weight label */}
      {startPoint && endPoint && arcType !== 'inhibitor' && (() => {
        const { x, y } = calculateWeightLabelPosition(startPoint, endPoint);
        
        return (
          <text
            x={x}
            y={y}
            className="weight-label"
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {weight}
          </text>
        );
      })()}
    </g>
  );
};

export default Arc; 