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
    RADIUS: 8,         // Radius of the inhibitor circle
    EDGE_PADDING: 2,   // Additional padding outside target border
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
  }
  // Inhibitor arcs don't need arrow offsets since they use circles instead

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
  const offset = ARC_POSITIONING.INHIBITOR.RADIUS + ARC_POSITIONING.INHIBITOR.EDGE_PADDING;
  
  // Move back along the path so the circle sits outside the target border
  const cx = endPoint.x - (dx / len) * offset;
  const cy = endPoint.y - (dy / len) * offset;
  
  return { cx, cy, r: ARC_POSITIONING.INHIBITOR.RADIUS };
} 