import React from 'react';
import type { Place as PlaceType } from '../../../types/domain.js';
import '../elements.css';
import { useGridStore } from '../../../stores/gridStore.js';

interface PlaceProps {
  place: PlaceType;
  onSelect?: (place: PlaceType) => void;
  onDeselect?: (place: PlaceType) => void;
  onDragStart?: (place: PlaceType, event: React.MouseEvent) => void;
  onDrag?: (place: PlaceType, event: React.MouseEvent) => void;
  onDragEnd?: (place: PlaceType, event: React.MouseEvent) => void;
  // Arc targeting UX
  isArcTarget?: boolean;
  onMouseEnterElement?: (place: PlaceType, event: React.MouseEvent) => void;
  onMouseLeaveElement?: (place: PlaceType, event: React.MouseEvent) => void;
}

const Place: React.FC<PlaceProps> = ({ 
  place, 
  onSelect, 
  onDeselect, 
  onDragStart, 
  onDrag: _onDrag, 
  onDragEnd: _onDragEnd,
  isArcTarget,
  onMouseEnterElement,
  onMouseLeaveElement,
}) => {
  const { x, y, tokens, name: label, isSelected: selected, bounded, radius: placeRadius } = place;
  const { gridSize, majorGridWidthMultiplier, majorGridHeightMultiplier } = useGridStore();
  
  // Match place radius to the larger major grid dimension
  const majorGridWidth = gridSize * majorGridWidthMultiplier;
  const majorGridHeight = gridSize * majorGridHeightMultiplier;
  const targetRadius = Math.max(majorGridWidth, majorGridHeight) / 2;
  const radius = placeRadius || targetRadius;

  const handleClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (selected) {
      onDeselect?.(place);
    } else {
      onSelect?.(place);
    }
  };

  const handleMouseDown = (event: React.MouseEvent) => {
    event.stopPropagation();
    // Switch cursor to grabbing for the duration of the drag
    const target = event.currentTarget as SVGGElement;
    target.classList.add('element-dragging');
    onDragStart?.(place, event);
  };

  const handleMouseUp = (event: React.MouseEvent) => {
    const target = event.currentTarget as SVGGElement;
    target.classList.remove('element-dragging');
  };

  return (
    <g
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseEnter={(e) => onMouseEnterElement?.(place, e)}
      onMouseLeave={(e) => onMouseLeaveElement?.(place, e)}
      className="place-element"
      transform={`translate(${x},${y})`}
    >
      {/* Main circle */}
      <circle
        r={radius}
        className={`place-circle ${bounded ? 'bounded' : ''}`}
      />
      
      {/* Token count */}
      <text
        x="0"
        y="0"
        className="token-count"
      >
        {tokens}
      </text>
      
      {/* Label */}
      {label && (
        <text
          x={radius + 6}
          y={-radius + 10}
          className="place-label"
        >
          {label}
        </text>
      )}
      
      {/* Selection indicator - bounding box */}
      {selected && (
        <g className="selection-indicators">
          <rect x={-radius} y={-radius} width={2 * radius} height={2 * radius} className="place-bounding-box" />
          <g className="resize-handles">
            <circle cx={-radius} cy={-radius} r={4} className="place-resize-handle top-left" />
            <circle cx={radius} cy={-radius} r={4} className="place-resize-handle top-right" />
            <circle cx={-radius} cy={radius} r={4} className="place-resize-handle bottom-left" />
            <circle cx={radius} cy={radius} r={4} className="place-resize-handle bottom-right" />
          </g>
        </g>
      )}

      {/* Arc target highlight */}
      {isArcTarget && (
        <circle
          r={radius}
          className="place-arc-highlight"
        />
      )}
    </g>
  );
};

export default Place; 