import React from 'react';
import type { Place as PlaceType } from '../../../types/domain.js';
import '../elements.css';

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
  const { x, y, width, height, tokens, name: label, isSelected: selected, bounded, radius: placeRadius } = place;
  
  // Use the radius from the place data, or calculate from width/height
  const radius = placeRadius || Math.min(width, height) / 2;

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
    onDragStart?.(place, event);
  };

  return (
    <g
      onClick={handleClick}
      onMouseDown={handleMouseDown}
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
        <rect
          x={-radius}
          y={-radius}
          width={2 * radius}
          height={2 * radius}
          className="place-bounding-box"
        />
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