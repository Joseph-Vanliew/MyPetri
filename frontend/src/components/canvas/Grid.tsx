import React from 'react';
import { GRID_CELL_SIZE } from '../../types';

interface GridProps {
  viewBox: { x: number; y: number; w: number; h: number };
}

export const Grid: React.FC<GridProps> = ({ viewBox }) => {
  const lines = [];
  const gridPadding = 300;
  
  const startX = Math.floor((viewBox.x - gridPadding) / GRID_CELL_SIZE) * GRID_CELL_SIZE;
  const endX = Math.ceil((viewBox.x + viewBox.w + gridPadding) / GRID_CELL_SIZE) * GRID_CELL_SIZE;
  const startY = Math.floor((viewBox.y - gridPadding) / GRID_CELL_SIZE) * GRID_CELL_SIZE;
  const endY = Math.ceil((viewBox.y + viewBox.h + gridPadding) / GRID_CELL_SIZE) * GRID_CELL_SIZE;

  // Generate vertical lines
  for (let xVal = startX; xVal <= endX; xVal += GRID_CELL_SIZE) {
    lines.push(
      <line
        key={`v-${xVal}`}
        x1={xVal}
        y1={viewBox.y - gridPadding}
        x2={xVal}
        y2={viewBox.y + viewBox.h + gridPadding}
        stroke="#e9ecef"
        opacity="0.4"
        strokeWidth="0.5"
      />
    );
  }

  // Generate horizontal lines
  for (let yVal = startY; yVal <= endY; yVal += GRID_CELL_SIZE) {
    lines.push(
      <line
        key={`h-${yVal}`}
        x1={viewBox.x - gridPadding}
        y1={yVal}
        x2={viewBox.x + viewBox.w + gridPadding}
        y2={yVal}
        stroke="#e9ecef"
        opacity="0.4"
        strokeWidth="0.5"
      />
    );
  }

  return <g className="grid-layer">{lines}</g>;
}; 