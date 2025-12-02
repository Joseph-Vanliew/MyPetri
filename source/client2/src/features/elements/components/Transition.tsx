import React from 'react';
import type { Transition as TransitionType } from '../../../types/domain.js';
import '../elements.css';
import { RESIZE_HANDLE_RADIUS } from '../../elements/registry/ElementUIConstants.js';
import { useElementsStore, useProjectStore, useToolbarStore } from '../../../stores/index.js';
import { useTransitionEditing } from '../hooks/useTransitionEditing.js';
import { createTransitionHandlers } from '../handlers/transitionHandlers.js';

interface TransitionProps {
  transition: TransitionType;
  // Only essential props that can't come from stores
  onDragStart?: (transition: TransitionType, event: React.MouseEvent) => void;
  onMouseEnterElement?: (transition: TransitionType, event: React.MouseEvent) => void;
  onMouseLeaveElement?: (transition: TransitionType, event: React.MouseEvent) => void;
  onArcConnect?: (elementId: string) => void;
  // Drag state - computed from draggingIds in Canvas (could move to store)
  isDragging?: boolean;
}

const Transition: React.FC<TransitionProps> = ({ 
  transition, 
  onDragStart,
  onMouseEnterElement,
  onMouseLeaveElement,
  onArcConnect,
  isDragging = false,
}) => {
  const { x, y, width, height, name: label, isSelected: selected, enabled } = transition;

  // Read from stores instead of props
  const { selectElement, clearSelection, updateElement } = useElementsStore();
  const { project } = useProjectStore();
  const { selectedTool } = useToolbarStore();
  
  // Compute derived state
  const isArcMode = selectedTool === 'ARC' || selectedTool === 'ARC_INHIBITOR' || selectedTool === 'ARC_BIDIRECTIONAL';
  const isArcTarget = isArcMode;

  // Handlers that use stores
  const handleSelect = React.useCallback(() => {
    // If in arc mode, use arc connection handler instead of selecting
    if (isArcMode && onArcConnect) {
      onArcConnect(transition.id);
      return;
    }
    if (project?.activePageId) {
      selectElement(project.activePageId, transition.id);
    }
  }, [project?.activePageId, selectElement, transition.id, isArcMode, onArcConnect]);

  const handleDeselect = React.useCallback(() => {
    // Don't deselect when in arc mode
    if (isArcMode) return;
    if (project?.activePageId) {
      clearSelection(project.activePageId);
    }
  }, [project?.activePageId, clearSelection, isArcMode]);

  // Use custom hooks and handlers
  const editingState = useTransitionEditing({ 
    transition, 
    onUpdate: (updates) => {
      if (project?.activePageId) {
        updateElement(project.activePageId, transition.id, updates);
      }
    }
  });
  
  const handlers = createTransitionHandlers({
    transition,
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
      className="transition-element"
      style={{ cursor: isArcMode ? 'pointer' : 'move' }}
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
      
      {/* Drag bounding box - independent of selection */}
      {isDragging && !selected && (
        <rect
          x={-width / 2}
          y={-height / 2}
          width={width}
          height={height}
          className="transition-bounding-box drag-bounding-box"
          fill="rgba(0, 122, 204, 0.15)"
          stroke="#007acc"
          strokeDasharray="6,4"
          strokeWidth={1}
        />
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