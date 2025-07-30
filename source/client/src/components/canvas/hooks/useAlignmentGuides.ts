import { useState, useCallback} from 'react';
import { UIPlace, UITransition, UITextBox } from '../../../types';

export interface AlignmentGuide {
  id: string;
  type: 'horizontal' | 'vertical';
  position: number;
  startExtent: number;
  endExtent: number;
  alignmentType: 'edge-left' | 'edge-right' | 'center-x' | 'edge-top' | 'edge-bottom' | 'center-y';
}

export interface AlignmentResult {
  snapPosition: { x: number; y: number } | null;
  activeGuides: AlignmentGuide[];
  isSnapping: boolean;
}

type AligneableElement = UIPlace | UITransition | UITextBox;

interface ElementBounds {
  id: string;
  left: number;
  right: number;
  top: number;
  bottom: number;
  centerX: number;
  centerY: number;
}

export function useAlignmentGuides(options: {
  snapDistance?: number;
  enabled?: boolean;
}) {
  const { snapDistance = 8, enabled = true } = options;
  const [activeGuides, setActiveGuides] = useState<AlignmentGuide[]>([]);

  // Calculate element bounds for alignment calculations
  const getElementBounds = useCallback((element: AligneableElement): ElementBounds => {
    if ('radius' in element) {
      // Place element
      const radius = element.radius;
      return {
        id: element.id,
        left: element.x - radius,
        right: element.x + radius,
        top: element.y - radius,
        bottom: element.y + radius,
        centerX: element.x,
        centerY: element.y
      };
    } else {
      // Transition or TextBox element (both have width and height)
      const halfWidth = element.width / 2;
      const halfHeight = element.height / 2;
      return {
        id: element.id,
        left: element.x - halfWidth,
        right: element.x + halfWidth,
        top: element.y - halfHeight,
        bottom: element.y + halfHeight,
        centerX: element.x,
        centerY: element.y
      };
    }
  }, []);

  // Find alignment guides for a dragging element
  const findAlignments = useCallback((
    draggedElement: AligneableElement,
    allElements: AligneableElement[],
    currentPosition: { x: number; y: number }
  ): AlignmentResult => {
    if (!enabled) {
      return { snapPosition: null, activeGuides: [], isSnapping: false };
    }

    // Create a temporary element with current drag position
    const tempElement = { ...draggedElement, x: currentPosition.x, y: currentPosition.y };
    const draggedBounds = getElementBounds(tempElement);
    
    // Get bounds for all other elements (excluding the dragged one)
    const otherElements = allElements.filter(el => el.id !== draggedElement.id);
    const otherBounds = otherElements.map(getElementBounds);

    const guides: AlignmentGuide[] = [];
    let snapX: number | null = null;
    let snapY: number | null = null;

    // Check for vertical alignment (horizontal guides)
    for (const targetBounds of otherBounds) {
      // Top edge alignment
      if (Math.abs(draggedBounds.top - targetBounds.top) <= snapDistance) {
        snapY = targetBounds.top + (draggedBounds.centerY - draggedBounds.top);
        guides.push({
          id: `horizontal-top-${targetBounds.id}`,
          type: 'horizontal',
          position: targetBounds.top,
          startExtent: Math.min(draggedBounds.left, targetBounds.left) - 20,
          endExtent: Math.max(draggedBounds.right, targetBounds.right) + 20,
          alignmentType: 'edge-top'
        });
      }

      // Bottom edge alignment
      if (Math.abs(draggedBounds.bottom - targetBounds.bottom) <= snapDistance) {
        snapY = targetBounds.bottom - (draggedBounds.bottom - draggedBounds.centerY);
        guides.push({
          id: `horizontal-bottom-${targetBounds.id}`,
          type: 'horizontal',
          position: targetBounds.bottom,
          startExtent: Math.min(draggedBounds.left, targetBounds.left) - 20,
          endExtent: Math.max(draggedBounds.right, targetBounds.right) + 20,
          alignmentType: 'edge-bottom'
        });
      }

      // Center Y alignment
      if (Math.abs(draggedBounds.centerY - targetBounds.centerY) <= snapDistance) {
        snapY = targetBounds.centerY;
        guides.push({
          id: `horizontal-center-${targetBounds.id}`,
          type: 'horizontal',
          position: targetBounds.centerY,
          startExtent: Math.min(draggedBounds.left, targetBounds.left) - 20,
          endExtent: Math.max(draggedBounds.right, targetBounds.right) + 20,
          alignmentType: 'center-y'
        });
      }
    }

    // Check for horizontal alignment (vertical guides)
    for (const targetBounds of otherBounds) {
      // Left edge alignment
      if (Math.abs(draggedBounds.left - targetBounds.left) <= snapDistance) {
        snapX = targetBounds.left + (draggedBounds.centerX - draggedBounds.left);
        guides.push({
          id: `vertical-left-${targetBounds.id}`,
          type: 'vertical',
          position: targetBounds.left,
          startExtent: Math.min(draggedBounds.top, targetBounds.top) - 20,
          endExtent: Math.max(draggedBounds.bottom, targetBounds.bottom) + 20,
          alignmentType: 'edge-left'
        });
      }

      // Right edge alignment
      if (Math.abs(draggedBounds.right - targetBounds.right) <= snapDistance) {
        snapX = targetBounds.right - (draggedBounds.right - draggedBounds.centerX);
        guides.push({
          id: `vertical-right-${targetBounds.id}`,
          type: 'vertical',
          position: targetBounds.right,
          startExtent: Math.min(draggedBounds.top, targetBounds.top) - 20,
          endExtent: Math.max(draggedBounds.bottom, targetBounds.bottom) + 20,
          alignmentType: 'edge-right'
        });
      }

      // Center X alignment
      if (Math.abs(draggedBounds.centerX - targetBounds.centerX) <= snapDistance) {
        snapX = targetBounds.centerX;
        guides.push({
          id: `vertical-center-${targetBounds.id}`,
          type: 'vertical',
          position: targetBounds.centerX,
          startExtent: Math.min(draggedBounds.top, targetBounds.top) - 20,
          endExtent: Math.max(draggedBounds.bottom, targetBounds.bottom) + 20,
          alignmentType: 'center-x'
        });
      }
    }

    const snapPosition = (snapX !== null || snapY !== null) ? {
      x: snapX ?? currentPosition.x,
      y: snapY ?? currentPosition.y
    } : null;

    return {
      snapPosition,
      activeGuides: guides,
      isSnapping: snapPosition !== null
    };
  }, [enabled, snapDistance, getElementBounds]);

  // Update alignments during drag
  const updateAlignments = useCallback((
    draggedElement: AligneableElement | null,
    allElements: AligneableElement[],
    currentPosition: { x: number; y: number } | null
  ): AlignmentResult => {
    if (!draggedElement || !currentPosition) {
      setActiveGuides([]);
      return { snapPosition: null, activeGuides: [], isSnapping: false };
    }

    const result = findAlignments(draggedElement, allElements, currentPosition);
    setActiveGuides(result.activeGuides);
    return result;
  }, [findAlignments]);

  // Clear all guides
  const clearGuides = useCallback(() => {
    setActiveGuides([]);
  }, []);

  return {
    activeGuides,
    updateAlignments,
    clearGuides,
    findAlignments
  };
} 