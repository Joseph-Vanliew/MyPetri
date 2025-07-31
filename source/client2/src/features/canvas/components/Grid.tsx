import React from 'react';
import { getGridLines } from '../utils/coordinateUtils.js';

interface GridProps {
  viewBox: { x: number; y: number; width: number; height: number };
  gridSize: number;
  showGrid: boolean;
}

const Grid: React.FC<GridProps> = ({ viewBox, gridSize, showGrid }) => {
  if (!showGrid) return null;

  const { vertical, horizontal } = getGridLines(viewBox, gridSize);

  return (
    <g className="grid" style={{ pointerEvents: 'none' }}>
      {/* Grid pattern for background */}
      <defs>
        <pattern 
          id="grid-pattern" 
          width={gridSize} 
          height={gridSize} 
          patternUnits="userSpaceOnUse"
          patternTransform={`translate(${viewBox.x % gridSize}, ${viewBox.y % gridSize})`}
        >
          <path 
            d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`} 
            fill="none" 
            stroke="rgba(255, 255, 255, 0.08)" 
            strokeWidth="1"
          />
        </pattern>
      </defs>
      
      {/* Grid background - tied to viewport */}
      <rect 
        x={viewBox.x}
        y={viewBox.y}
        width={viewBox.width} 
        height={viewBox.height} 
        fill="url(#grid-pattern)" 
      />
      
      {/* Major grid lines (every 5th line) */}
      {vertical.map((x, index) => {
        if (index % 5 === 0) {
          return (
            <line
              key={`v-${x}`}
              x1={x}
              y1={viewBox.y}
              x2={x}
              y2={viewBox.y + viewBox.height}
              stroke="rgba(255, 255, 255, 0.15)"
              strokeWidth="1"
            />
          );
        }
        return null;
      })}
      
      {horizontal.map((y, index) => {
        if (index % 5 === 0) {
          return (
            <line
              key={`h-${y}`}
              x1={viewBox.x}
              y1={y}
              x2={viewBox.x + viewBox.width}
              y2={y}
              stroke="rgba(255,255,255,0.15)"
              strokeWidth="1"
            />
          );
        }
        return null;
      })}
      
      {/* Grid coordinates (optional - can be toggled) */}
      {vertical.map((x, index) => {
        if (index % 10 === 0) {
          return (
            <text
              key={`coord-x-${x}`}
              x={x}
              y={viewBox.y + 15}
              textAnchor="middle"
              fill="rgba(255,255,255,0.3)"
              fontSize="10"
              style={{ pointerEvents: 'none' }}
            >
              {x}
            </text>
          );
        }
        return null;
      })}
      
      {horizontal.map((y, index) => {
        if (index % 10 === 0) {
          return (
            <text
              key={`coord-y-${y}`}
              x={viewBox.x + 15}
              y={y}
              textAnchor="middle"
              fill="rgba(255,255,255,0.3)"
              fontSize="10"
              style={{ pointerEvents: 'none' }}
            >
              {y}
            </text>
          );
        }
        return null;
      })}
    </g>
  );
};

export default Grid; 