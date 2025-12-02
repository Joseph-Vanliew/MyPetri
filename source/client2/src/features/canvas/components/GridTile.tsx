import React from 'react';
import { useGridStore } from '../../../stores/gridStore.js';

interface GridTileProps {
  x: number; // Top-left corner X in SVG coordinates
  y: number; // Top-left corner Y in SVG coordinates
  width: number; // Tile width in SVG coordinates
  height: number; // Tile height in SVG coordinates
}

const GridTile: React.FC<GridTileProps> = ({ x, y, width, height }) => {
  const { 
    gridSize, 
    showGrid, 
    majorGridWidthMultiplier, 
    majorGridHeightMultiplier 
  } = useGridStore();
  
  if (!showGrid) return null;

  // Calculating the major grid dimensions using store constants
  const majorGridWidth = gridSize * majorGridWidthMultiplier;
  const majorGridHeight = gridSize * majorGridHeightMultiplier;
  
  // Calculate grid boundaries aligned with major grid lines within this tile
  // Clamp to tile boundaries to prevent overlapping grid content between adjacent tiles
  const rawStartX = Math.floor(x / majorGridWidth) * majorGridWidth;
  const rawStartY = Math.floor(y / majorGridHeight) * majorGridHeight;
  
  
  // Clamp to tile boundaries - this prevents overlap with neighboring tiles
  const startX = Math.max(x, rawStartX);
  const startY = Math.max(y, rawStartY);

  

  // Generate unique pattern ID for this tile to avoid conflicts
  const patternId = `grid-pattern-${x}-${y}`;

  return (
    <g className="grid-tile" style={{ pointerEvents: 'none' }}>
      {/* Clip path to ensure nothing renders beyond tile boundaries */}
      <defs>
        <clipPath id={`clip-${patternId}`}>
          <rect x={x} y={y} width={width} height={height} />
        </clipPath>
        
        <pattern 
          id={patternId}
          width={gridSize} 
          height={gridSize} 
          patternUnits="userSpaceOnUse"
          patternTransform={`translate(${x}, ${y})`}
        >
          {/* Simple grid cell border */}
          <path 
            d={`M 0 0 L ${gridSize} 0 L ${gridSize} ${gridSize} L 0 ${gridSize} Z`} 
            fill="none" 
            stroke="rgba(255, 255, 255, 0.15)" 
            strokeWidth=".35"
          />
        </pattern>
      </defs>
      
      {/* All grid content - clipped to exact tile bounds to prevent overflow */}
      <g clipPath={`url(#clip-${patternId})`}>
        {/* Grid background - reduced by 2*gridSize to match pattern overlay */}
        <rect 
          x={x}
          y={y}
          width={width - 2 * gridSize} 
          height={height - 2 * gridSize} 
          fill="var(--grid-background-color)"
        />
        
        {/* Grid pattern overlay - reduced by 2*gridSize to prevent 2 extra cells on east/south edges */}
        <rect 
          x={x}
          y={y}
          width={width - 2 * gridSize} 
          height={height - 2 * gridSize} 
          fill={`url(#${patternId})`}
        />
        
        {/* Major grid lines - vertical */}
        {(() => {
          const lines = [];
          // Stop 2*gridSize before right edge for internal lines, but include boundary line at tile edge
          const maxX = x + width - 2 * gridSize;
          const rightEdge = x + width - 2 * gridSize; // Boundary line position
          
          for (let xPos = startX; xPos <= maxX; xPos += majorGridWidth) {
            // Don't render if this line would be at the right boundary (will be rendered separately)
            if (xPos === rightEdge) continue;
            
            lines.push(
              <line
                key={`v-${xPos}`}
                x1={xPos}
                y1={startY}
                x2={xPos}
                y2={y + height - 2 * gridSize}
                stroke="rgba(255, 255, 255, 0.15)"
                strokeWidth="1"
              />
            );
          }
          
          // Add boundary line at the right edge
          lines.push(
            <line
              key={`v-boundary-right`}
              x1={rightEdge}
              y1={startY}
              x2={rightEdge}
              y2={y + height - 2 * gridSize}
              stroke="rgba(255, 255, 255, 0.15)"
              strokeWidth="1"
            />
          );
          
          return lines;
        })()}
        
        {/* Major grid lines - horizontal */}
        {(() => {
          const lines = [];
          // Stop 2*gridSize before bottom edge for internal lines, but include boundary line at tile edge
          const maxY = y + height - 2 * gridSize;
          const bottomEdge = y + height - 2 * gridSize; // Boundary line position
          
          for (let yPos = startY; yPos <= maxY; yPos += majorGridHeight) {
            // Don't render if this line would be at the bottom boundary (will be rendered separately)
            if (yPos === bottomEdge) continue;
            
            lines.push(
              <line
                key={`h-${yPos}`}
                x1={startX}
                y1={yPos}
                x2={x + width - 2 * gridSize}
                y2={yPos}
                stroke="rgba(255,255,255,0.15)"
                strokeWidth="1"
              />
            );
          }
          
          // Add boundary line at the bottom edge
          lines.push(
            <line
              key={`h-boundary-bottom`}
              x1={startX}
              y1={bottomEdge}
              x2={x + width - 2 * gridSize}
              y2={bottomEdge}
              stroke="rgba(255,255,255,0.15)"
              strokeWidth="1"
            />
          );
          
          return lines;
        })()}
      </g>
    </g>
  );
};

export default GridTile;

