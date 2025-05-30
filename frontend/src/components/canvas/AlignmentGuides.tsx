import React from 'react';
import { AlignmentGuide } from './hooks/useAlignmentGuides';

interface AlignmentGuidesProps {
  guides: AlignmentGuide[];
  viewBox: { x: number; y: number; w: number; h: number };
}

export const AlignmentGuides: React.FC<AlignmentGuidesProps> = ({ guides, viewBox }) => {
  if (guides.length === 0) return null;

  return (
    <g className="alignment-guides-layer" style={{ pointerEvents: 'none' }}>
      {guides.map((guide) => {
        const isHorizontal = guide.type === 'horizontal';
        const isDashed = guide.alignmentType.includes('center');
        
        // Extend guide lines to cover the visible viewport
        const extendedStart = isHorizontal 
          ? Math.min(guide.startExtent, viewBox.x - 50)
          : Math.min(guide.startExtent, viewBox.y - 50);
        const extendedEnd = isHorizontal
          ? Math.max(guide.endExtent, viewBox.x + viewBox.w + 50)
          : Math.max(guide.endExtent, viewBox.y + viewBox.h + 50);

        return (
          <line
            key={guide.id}
            x1={isHorizontal ? extendedStart : guide.position}
            y1={isHorizontal ? guide.position : extendedStart}
            x2={isHorizontal ? extendedEnd : guide.position}
            y2={isHorizontal ? guide.position : extendedEnd}
            stroke="#0074D9"
            strokeWidth="1"
            strokeDasharray={isDashed ? '5,3' : 'none'}
            opacity="0.8"
            className={`alignment-guide ${guide.type} ${guide.alignmentType}`}
          />
        );
      })}
    </g>
  );
}; 