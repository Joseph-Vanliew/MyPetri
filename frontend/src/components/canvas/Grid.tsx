import React from 'react';
import { GRID_CELL_SIZE } from '../../types';

interface GridProps {
  viewBox: { x: number; y: number; w: number; h: number };
}

export const Grid: React.FC<GridProps> = ({ viewBox }) => {
  const lines = [];
  const gridPadding = 300;
  
  // Define bounded grid area - 2000x2000 centered at origin
  const GRID_BOUNDS = {
    minX: -800,
    maxX: 800,
    minY: -900,
    maxY: 900
  };
  
  // Add dark gray background for the grid area
  lines.push(
    <rect
      key="grid-background"
      x={GRID_BOUNDS.minX}
      y={GRID_BOUNDS.minY}
      width={GRID_BOUNDS.maxX - GRID_BOUNDS.minX}
      height={GRID_BOUNDS.maxY - GRID_BOUNDS.minY}
      fill="#141414"
      pointerEvents="none"
    />
  );
  
  // Limit grid to visible area within bounds
  const startX = Math.max(GRID_BOUNDS.minX, Math.floor((viewBox.x - gridPadding) / GRID_CELL_SIZE) * GRID_CELL_SIZE);
  const endX = Math.min(GRID_BOUNDS.maxX, Math.ceil((viewBox.x + viewBox.w + gridPadding) / GRID_CELL_SIZE) * GRID_CELL_SIZE);
  const startY = Math.max(GRID_BOUNDS.minY, Math.floor((viewBox.y - gridPadding) / GRID_CELL_SIZE) * GRID_CELL_SIZE);
  const endY = Math.min(GRID_BOUNDS.maxY, Math.ceil((viewBox.y + viewBox.h + gridPadding) / GRID_CELL_SIZE) * GRID_CELL_SIZE);

  // Generate vertical lines
  for (let xVal = startX; xVal <= endX; xVal += GRID_CELL_SIZE) {
    lines.push(
      <line
        key={`v-${xVal}`}
        x1={xVal}
        y1={Math.max(viewBox.y - gridPadding, GRID_BOUNDS.minY)}
        x2={xVal}
        y2={Math.min(viewBox.y + viewBox.h + gridPadding, GRID_BOUNDS.maxY)}
        stroke="#444444"
        strokeWidth="0.5"
      />
    );
  }

  // Generate horizontal lines
  for (let yVal = startY; yVal <= endY; yVal += GRID_CELL_SIZE) {
    lines.push(
      <line
        key={`h-${yVal}`}
        x1={Math.max(viewBox.x - gridPadding, GRID_BOUNDS.minX)}
        y1={yVal}
        x2={Math.min(viewBox.x + viewBox.w + gridPadding, GRID_BOUNDS.maxX)}
        y2={yVal}
        stroke="#444444"
        strokeWidth="0.5"
      />
    );
  }

  // Add boundary lines
  lines.push(
    <rect
      key="boundary"
      x={GRID_BOUNDS.minX}
      y={GRID_BOUNDS.minY}
      width={GRID_BOUNDS.maxX - GRID_BOUNDS.minX}
      height={GRID_BOUNDS.maxY - GRID_BOUNDS.minY}
      fill="none"
      stroke="#666666"
      strokeWidth="2"
      opacity="0.5"
    />
  );

  return <g className="grid-layer">{lines}</g>;
}; 