import { getAnchorPointForElement, getElementCenter } from '../../canvas/utils/anchorPointUtils.js';
import type { Element } from '../../../types/domain.js';


export const ARC_POSITIONING = {
  // Bidirectional arc offsets
  BIDIRECTIONAL: {
    START_OFFSET: 24,  // Distance start arrow sits outside source border
    END_OFFSET: 4,     // Distance end arrow sits outside target border
  },
  // Normal arc offsets  
  NORMAL: {
    END_OFFSET: 4,     // Distance end arrow sits outside target border
  },
  // Inhibitor circle positioning
  INHIBITOR: {
    RADIUS: 6,         // Radius of the inhibitor circle
    EDGE_PADDING: 2,   // Additional padding outside target border
  },
  // Weight label positioning
  WEIGHT_LABEL: {
    PERPENDICULAR_OFFSET: 12,  // Distance from the arc line
    ALONG_OFFSET: 15,          // Distance along the arc from start point
  },
} as const;

export interface ArcEndpoints {
  startPoint: { x: number; y: number };
  endPoint: { x: number; y: number };
}

export interface ArcCalculationParams {
  startElement: Element;
  endElement: Element | { x: number; y: number };
  arcType: 'normal' | 'inhibitor' | 'bidirectional';
}


export function calculateArcEndpoints({
  startElement,
  endElement,
  arcType
}: ArcCalculationParams): ArcEndpoints {
  const isPreview = 'x' in endElement && 'y' in endElement && !('id' in endElement);
  
  let startAnchor: { x: number; y: number };
  let endAnchor: { x: number; y: number };

  if (isPreview) {
    // Preview mode: endElement is a point (mouse cursor or hover element center)
    const endPoint = endElement as { x: number; y: number };
    startAnchor = getAnchorPointForElement(startElement as any, endPoint);
    endAnchor = endPoint;
  } else {
    // Final rendering mode: endElement is an actual Element
    const targetElement = endElement as Element;
    const startCenter = getElementCenter(startElement as any);
    const targetCenter = getElementCenter(targetElement as any);
    
    startAnchor = getAnchorPointForElement(startElement as any, targetCenter);
    endAnchor = getAnchorPointForElement(targetElement as any, startCenter);
  }

  // Apply offsets for arrows to sit outside element borders
  const dx = endAnchor.x - startAnchor.x;
  const dy = endAnchor.y - startAnchor.y;
  const len = Math.hypot(dx, dy) || 1;
  
  if (arcType === 'bidirectional') {
    // Bidirectional: offset both start and end so arrows sit outside borders
    startAnchor = {
      x: startAnchor.x + (dx / len) * ARC_POSITIONING.BIDIRECTIONAL.START_OFFSET,
      y: startAnchor.y + (dy / len) * ARC_POSITIONING.BIDIRECTIONAL.START_OFFSET,
    };

    endAnchor = {
      x: endAnchor.x - (dx / len) * ARC_POSITIONING.BIDIRECTIONAL.END_OFFSET,
      y: endAnchor.y - (dy / len) * ARC_POSITIONING.BIDIRECTIONAL.END_OFFSET,
    };
  } else if (arcType === 'normal') {
    // Normal arc: only offset end so arrow sits outside target border
    endAnchor = {
      x: endAnchor.x - (dx / len) * ARC_POSITIONING.NORMAL.END_OFFSET,
      y: endAnchor.y - (dy / len) * ARC_POSITIONING.NORMAL.END_OFFSET,
    };
  } else if (arcType === 'inhibitor') {
    // Inhibitor arc: offset end so arc stops at the edge of the inhibitor circle
    const inhibitorOffset = ARC_POSITIONING.INHIBITOR.RADIUS + ARC_POSITIONING.INHIBITOR.EDGE_PADDING;
    endAnchor = {
      x: endAnchor.x - (dx / len) * inhibitorOffset,
      y: endAnchor.y - (dy / len) * inhibitorOffset,
    };
  }

  return { startPoint: startAnchor, endPoint: endAnchor };
}

/**
 * Generate SVG path data from arc endpoints
 */
export function generateArcPath(startPoint: { x: number; y: number }, endPoint: { x: number; y: number }): string {
  return `M ${startPoint.x},${startPoint.y} L ${endPoint.x},${endPoint.y}`;
}

/**
 * Calculate inhibitor circle position (positioned outside target border)
 */
export function calculateInhibitorCirclePosition(startPoint: { x: number; y: number }, endPoint: { x: number; y: number }): { cx: number; cy: number; r: number } {
  const dx = endPoint.x - startPoint.x;
  const dy = endPoint.y - startPoint.y;
  const len = Math.hypot(dx, dy) || 1;
  
  // Move back along the path so the circle sits outside the target border
  const cx = endPoint.x - (dx / len);
  const cy = endPoint.y - (dy / len);
  
  return { cx, cy, r: ARC_POSITIONING.INHIBITOR.RADIUS };
}

/**
 * Calculate weight label position for arc
 */
export function calculateWeightLabelPosition(startPoint: { x: number; y: number }, endPoint: { x: number; y: number }): { x: number; y: number } {
  const dx = endPoint.x - startPoint.x;
  const dy = endPoint.y - startPoint.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  
  // Normalize the direction vector
  const dirX = dx / length;
  const dirY = dy / length;
  
  // Calculate perpendicular vector
  const perpX = -dirY;
  const perpY = dirX;
  
  // Position the label offset from the start point
  // Use perpendicular direction to avoid arrow overlap
  const offset = ARC_POSITIONING.WEIGHT_LABEL.PERPENDICULAR_OFFSET;
  const labelX = startPoint.x + (perpX * offset);
  const labelY = startPoint.y + (perpY * offset);
  
  // Additional offset along the arc direction to move it further from the start point
  const alongOffset = ARC_POSITIONING.WEIGHT_LABEL.ALONG_OFFSET;
  const finalX = labelX + (dirX * alongOffset);
  const finalY = labelY + (dirY * alongOffset);
  
  return { x: finalX, y: finalY };
} 