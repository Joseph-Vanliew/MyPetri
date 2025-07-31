import React from 'react';
import type { Transition as TransitionType } from '../../../types/domain.js';
import '../elements.css';

interface TransitionProps {
  transition: TransitionType;
  onSelect?: (transition: TransitionType) => void;
  onDeselect?: (transition: TransitionType) => void;
  onDragStart?: (transition: TransitionType, event: React.MouseEvent) => void;
  onDrag?: (transition: TransitionType, event: React.MouseEvent) => void;
  onDragEnd?: (transition: TransitionType, event: React.MouseEvent) => void;
}

const Transition: React.FC<TransitionProps> = ({ 
  transition, 
  onSelect, 
  onDeselect, 
  onDragStart
}) => {
  const { x, y, width, height, name: label, isSelected: selected, enabled } = transition;

  const handleClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (selected) {
      onDeselect?.(transition);
    } else {
      onSelect?.(transition);
    }
  };

  const handleMouseDown = (event: React.MouseEvent) => {
    event.stopPropagation();
    onDragStart?.(transition, event);
  };

  return (
    <g
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      className="transition-element"
      transform={`translate(${x},${y})`}
    >
      {/* Main rectangle */}
      <rect
        x={-width / 2}
        y={-height / 2}
        width={width}
        height={height}
        rx="8"
        className={`transition-rectangle ${enabled ? 'enabled' : ''}`}
      />
      
      {/* Label */}
      {label && (
        <text
          x="0"
          y="0"
          className="transition-label"
        >
          {label}
        </text>
      )}
      
      {/* Selection indicator - bounding box */}
      {selected && (
        <rect
          x={-width / 2}
          y={-height / 2}
          width={width}
          height={height}
          className="transition-bounding-box"
        />
      )}
    </g>
  );
};

export default Transition; 