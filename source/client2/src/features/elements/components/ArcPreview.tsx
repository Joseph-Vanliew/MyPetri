import React from 'react';
import { calculateArcEndpoints, generateArcPath, calculateInhibitorCirclePosition } from '../utils/arcCalculationUtils.js';
import type { Element } from '../../../types/domain.js';

interface ArcPreviewProps {
  isArcMode: boolean;
  arcDrawingStartId: string | null;
  arcPreviewPos: { x: number; y: number } | null;
  arcHoverElementId: string | null;
  currentPageElements: Element[];
  selectedTool: string;
}

const ArcPreview: React.FC<ArcPreviewProps> = ({
  isArcMode,
  arcDrawingStartId,
  arcPreviewPos,
  arcHoverElementId,
  currentPageElements,
  selectedTool,
}) => {
  if (!isArcMode || !arcDrawingStartId || !arcPreviewPos) {
    return null;
  }

  const startEl = currentPageElements.find(el => el.id === arcDrawingStartId);
  if (!startEl) return null;

  // Validate that inhibitor arcs can only start from places
  if (selectedTool === 'ARC_INHIBITOR' && startEl.type !== 'place') {
    return null;
  }

  // Map tool to arc type
  const arcType = selectedTool === 'ARC' ? 'normal' : selectedTool === 'ARC_INHIBITOR' ? 'inhibitor' : 'bidirectional';
  
  // If hovering valid target element based on arc type, snap end to its anchor; else use cursor point
  const hoverEl = arcHoverElementId ? currentPageElements.find(el => el.id === arcHoverElementId) : null;
  const isStartPlace = startEl.type === 'place';
  
  // Validate hover target based on arc type and start element type
  let isHoverValid = false;
  if (hoverEl) {
    if (arcType === 'inhibitor') {
      // Inhibitor arcs: only place -> transition is valid
      isHoverValid = isStartPlace && hoverEl.type === 'transition';
    } else {
      // Normal and bidirectional arcs: place <-> transition (opposite types)
      isHoverValid = (isStartPlace && hoverEl.type === 'transition') || (!isStartPlace && hoverEl.type === 'place');
    }
  }
  
  const endPointTarget = isHoverValid && hoverEl ? hoverEl : arcPreviewPos;
  
  // Use shared calculation utility
  const { startPoint, endPoint } = calculateArcEndpoints({
    startElement: startEl as any,
    endElement: endPointTarget,
    arcType
  });

  const pathData = generateArcPath(startPoint, endPoint);
  const markerStart = arcType === 'bidirectional' ? 'url(#bidirectional)' : undefined;
  const markerEnd = arcType === 'inhibitor' ? undefined : 'url(#arrow)';
  
  return (
    <g className={`arc-element ${arcType}`}>
      <path d={pathData} className="main-path" markerStart={markerStart} markerEnd={markerEnd} />
      {arcType === 'inhibitor' && (() => {
        const { cx, cy, r } = calculateInhibitorCirclePosition(startPoint, endPoint);
        return <circle cx={cx} cy={cy} r={r} className="inhibitor-circle" />;
      })()}
    </g>
  );
};

export default ArcPreview; 