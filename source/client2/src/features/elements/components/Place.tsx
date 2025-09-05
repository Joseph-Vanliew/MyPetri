import React from 'react';
import type { Place as PlaceType } from '../../../types/domain.js';
import '../elements.css';
import { RESIZE_HANDLE_RADIUS } from '../../elements/registry/ElementUIConstants.js';
import { useGridStore } from '../../../stores/gridStore.js';
import { usePlaceEditing } from '../hooks/usePlaceEditing.js';
import { createPlaceHandlers } from '../handlers/placeHandlers.js';

interface PlaceProps {
  place: PlaceType;
  onSelect?: (place: PlaceType) => void;
  onDeselect?: (place: PlaceType) => void;
  onDragStart?: (place: PlaceType, event: React.MouseEvent) => void;
  onDrag?: (place: PlaceType, event: React.MouseEvent) => void;
  onDragEnd?: (place: PlaceType, event: React.MouseEvent) => void;
  onUpdate?: (place: PlaceType, updates: Partial<PlaceType>) => void;
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
  onUpdate,
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

  // Use custom hooks and handlers
  const editingState = usePlaceEditing({ place, onUpdate });
  const handlers = createPlaceHandlers({
    place,
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
      className="place-element"
      transform={`translate(${x},${y})`}
    >
      {/* Main circle */}
      <circle
        r={radius}
        className={`place-circle ${bounded ? 'bounded' : ''}`}
      />
      
      {/* Token count */}
      {editingState.editingTokens ? (
        <foreignObject x="-20" y="-10" width="40" height="20">
          <input
            type="number"
            value={editingState.tempTokens}
            onChange={editingState.handleTokenChange}
            onBlur={editingState.handleTokenSubmit}
            onKeyDown={editingState.handleTokenKeyDown}
            className="token-input"
            autoFocus
            min="0"
            onClick={(e) => e.stopPropagation()}
          />
        </foreignObject>
      ) : (
        <text
          x="0"
          y="0"
          className="token-count"
          onDoubleClick={editingState.handleTokenDoubleClick}
          style={{ cursor: 'pointer' }}
        >
          {tokens}
        </text>
      )}
      
      {/* Label */}
      {editingState.editingLabel ? (
        <foreignObject x={radius + 6} y={-radius} width="100" height="20">
          <input
            type="text"
            value={editingState.tempLabel}
            onChange={editingState.handleLabelChange}
            onBlur={editingState.handleLabelSubmit}
            onKeyDown={editingState.handleLabelKeyDown}
            className="label-input"
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        </foreignObject>
      ) : (
        (label || selected) && (
          <text
            x={radius + 6}
            y={-radius + 10}
            className="place-label"
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
          <rect x={-radius} y={-radius} width={2 * radius} height={2 * radius} className="place-bounding-box" />
          <g className="resize-handles" vectorEffect="non-scaling-stroke">
            <circle cx={-radius} cy={-radius} r={RESIZE_HANDLE_RADIUS} className="resize-handle top-left" />
            <circle cx={radius} cy={-radius} r={RESIZE_HANDLE_RADIUS} className="resize-handle top-right" />
            <circle cx={-radius} cy={radius} r={RESIZE_HANDLE_RADIUS} className="resize-handle bottom-left" />
            <circle cx={radius} cy={radius} r={RESIZE_HANDLE_RADIUS} className="resize-handle bottom-right" />
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