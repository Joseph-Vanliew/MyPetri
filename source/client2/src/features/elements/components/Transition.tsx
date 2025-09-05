import React from 'react';
import type { Transition as TransitionType } from '../../../types/domain.js';
import '../elements.css';
import { RESIZE_HANDLE_RADIUS } from '../../elements/registry/ElementUIConstants.js';
import { useTransitionEditing } from '../hooks/useTransitionEditing.js';
import { createTransitionHandlers } from '../handlers/transitionHandlers.js';

interface TransitionProps {
  transition: TransitionType;
  onSelect?: (transition: TransitionType) => void;
  onDeselect?: (transition: TransitionType) => void;
  onDragStart?: (transition: TransitionType, event: React.MouseEvent) => void;
  onDrag?: (transition: TransitionType, event: React.MouseEvent) => void;
  onDragEnd?: (transition: TransitionType, event: React.MouseEvent) => void;
  onUpdate?: (transition: TransitionType, updates: Partial<TransitionType>) => void;
  // Arc targeting UX
  isArcTarget?: boolean;
  onMouseEnterElement?: (transition: TransitionType, event: React.MouseEvent) => void;
  onMouseLeaveElement?: (transition: TransitionType, event: React.MouseEvent) => void;
}

const Transition: React.FC<TransitionProps> = ({ 
  transition, 
  onSelect, 
  onDeselect, 
  onDragStart,
  onUpdate,
  isArcTarget,
  onMouseEnterElement,
  onMouseLeaveElement,
}) => {
  const { x, y, width, height, name: label, isSelected: selected, enabled } = transition;

  // Use custom hooks and handlers
  const editingState = useTransitionEditing({ transition, onUpdate });
  const handlers = createTransitionHandlers({
    transition,
    onSelect,
    onDeselect,
    onDragStart,
    onMouseEnterElement,
    onMouseLeaveElement,
  });

  return (
    <g
      onClick={handlers.handleClick}
      onMouseDown={handlers.handleMouseDown}
      onMouseEnter={handlers.handleMouseEnter}
      onMouseLeave={handlers.handleMouseLeave}
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
      {editingState.editingLabel ? (
        <foreignObject x={-width / 2} y={-height / 2} width={width} height={height}>
          <input
            type="text"
            value={editingState.tempLabel}
            onChange={editingState.handleLabelChange}
            onBlur={editingState.handleLabelSubmit}
            onKeyDown={editingState.handleLabelKeyDown}
            className="label-input"
            autoFocus
            onClick={(e) => e.stopPropagation()}
            style={{ textAlign: 'center', width: '100%', height: '100%' }}
          />
        </foreignObject>
      ) : (
        (label || selected) && (
          <text
            x="0"
            y="0"
            className="transition-label"
            onDoubleClick={editingState.handleLabelDoubleClick}
            style={{ cursor: 'pointer' }}
          >
            {label}
          </text>
        )
      )}
      
      {/* Selection indicator - bounding box */}
      {selected && (
        <g className="selection-indicators">
          <rect
            x={-width / 2}
            y={-height / 2}
            width={width}
            height={height}
            className="transition-bounding-box"
          />
          <g className="resize-handles" vectorEffect="non-scaling-stroke">
            <circle cx={-width / 2} cy={-height / 2} r={RESIZE_HANDLE_RADIUS} className="resize-handle top-left" />
            <circle cx={width / 2} cy={-height / 2} r={RESIZE_HANDLE_RADIUS} className="resize-handle top-right" />
            <circle cx={-width / 2} cy={height / 2} r={RESIZE_HANDLE_RADIUS} className="resize-handle bottom-left" />
            <circle cx={width / 2} cy={height / 2} r={RESIZE_HANDLE_RADIUS} className="resize-handle bottom-right" />
          </g>
        </g>
      )}

      {/* Arc target highlight */}
      {isArcTarget && (
        <rect
          x={-width / 2}
          y={-height / 2}
          width={width}
          height={height}
          className="transition-arc-highlight"
        />
      )}
    </g>
  );
};

export default Transition; 