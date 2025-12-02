import React from 'react';
import type { Place as PlaceType } from '../../../types/domain.js';
import '../elements.css';
import { RESIZE_HANDLE_RADIUS } from '../../elements/registry/ElementUIConstants.js';
import { useGridStore } from '../../../stores/gridStore.js';
import { useElementsStore, useProjectStore, useToolbarStore } from '../../../stores/index.js';
import { usePlaceEditing } from '../hooks/usePlaceEditing.js';
import { createPlaceHandlers } from '../handlers/placeHandlers.js';

interface PlaceProps {
  place: PlaceType;
  // Only essential props that can't come from stores
  onDragStart?: (place: PlaceType, event: React.MouseEvent) => void;
  onMouseEnterElement?: (place: PlaceType, event: React.MouseEvent) => void;
  onMouseLeaveElement?: (place: PlaceType, event: React.MouseEvent) => void;
  onArcConnect?: (elementId: string) => void;
  // Drag state - computed from draggingIds in Canvas (could move to store)
  isDragging?: boolean;
}

const Place: React.FC<PlaceProps> = ({ 
  place, 
  onDragStart, 
  onMouseEnterElement,
  onMouseLeaveElement,
  onArcConnect,
  isDragging = false,
}) => {
  const { x, y, tokens, name: label, isSelected: selected, bounded, radius: placeRadius } = place;
  const { gridSize, majorGridWidthMultiplier, majorGridHeightMultiplier } = useGridStore();
  
  // Read from stores instead of props
  const { selectElement, clearSelection, updateElement } = useElementsStore();
  const { project } = useProjectStore();
  const { selectedTool } = useToolbarStore();
  
  // Compute derived state
  const isArcMode = selectedTool === 'ARC' || selectedTool === 'ARC_INHIBITOR' || selectedTool === 'ARC_BIDIRECTIONAL';
  const isArcTarget = isArcMode && selectedTool !== 'ARC_INHIBITOR';
  
  // Match place radius to the larger major grid dimension
  const majorGridWidth = gridSize * majorGridWidthMultiplier;
  const majorGridHeight = gridSize * majorGridHeightMultiplier;
  const targetRadius = Math.max(majorGridWidth, majorGridHeight) / 2;
  const radius = placeRadius || targetRadius;

  // Handlers that use stores
  const handleSelect = React.useCallback(() => {
    // If in arc mode, use arc connection handler instead of selecting
    if (isArcMode && onArcConnect) {
      onArcConnect(place.id);
      return;
    }
    if (project?.activePageId) {
      selectElement(project.activePageId, place.id);
    }
  }, [project?.activePageId, selectElement, place.id, isArcMode, onArcConnect]);

  const handleDeselect = React.useCallback(() => {
    // Don't deselect when in arc mode
    if (isArcMode) return;
    if (project?.activePageId) {
      clearSelection(project.activePageId);
    }
  }, [project?.activePageId, clearSelection, isArcMode]);

  // Use custom hooks and handlers
  const editingState = usePlaceEditing({ 
    place, 
    onUpdate: (updates) => {
      if (project?.activePageId) {
        updateElement(project.activePageId, place.id, updates);
      }
    }
  });
  
  const handlers = createPlaceHandlers({
    place,
    onSelect: handleSelect,
    onDeselect: handleDeselect,
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
      style={{ cursor: isArcMode ? 'pointer' : 'move' }}
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
      
      {/* Drag bounding box - independent of selection */}
      {isDragging && !selected && (
        <rect 
          x={-radius} 
          y={-radius} 
          width={2 * radius} 
          height={2 * radius} 
          className="place-bounding-box drag-bounding-box"
          fill="rgba(0, 122, 204, 0.15)"
          stroke="#007acc"
          strokeDasharray="6,4"
          strokeWidth={1}
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