import React from 'react';
import { useGridStore } from '../../../stores/gridStore.js';

interface GridProps {
  viewBox: { x: number; y: number; width: number; height: number };
}

const Grid: React.FC<GridProps> = ({ viewBox }) => {
  const { 
    gridSize, 
    setGridSize, 
    showGrid, 
    majorGridWidthMultiplier, 
    majorGridHeightMultiplier 
  } = useGridStore();
  
  if (!showGrid) return null;

  // Calculating the major grid dimensions using store constants
  const majorGridWidth = gridSize * majorGridWidthMultiplier;
  const majorGridHeight = gridSize * majorGridHeightMultiplier;
  
  // Calculating grid boundaries that align with major grid lines
  const startX = Math.floor(viewBox.x / majorGridWidth) * majorGridWidth;
  const startY = Math.floor(viewBox.y / majorGridHeight) * majorGridHeight;
  const endX = Math.floor((viewBox.x + viewBox.width) / majorGridWidth) * majorGridWidth;
  const endY = Math.floor((viewBox.y + viewBox.height) / majorGridHeight) * majorGridHeight;
  
  const gridWidth = Math.max(majorGridWidth, endX - startX);
  const gridHeight = Math.max(majorGridHeight, endY - startY);

  return (
    <g className="grid" style={{ pointerEvents: 'none' }}>
      {/* Grid size selector */}
      <foreignObject x={viewBox.x + 10} y={viewBox.y + 10} width="120" height="30">
        <div style={{ 
          background: 'rgba(0, 0, 0, 0.7)', 
          color: 'white', 
          padding: '5px', 
          borderRadius: '4px',
          fontSize: '12px',
          border: '1px solid rgba(255, 255, 255, 0.3)'
        }}>
          <label style={{ marginRight: '8px' }}>Grid:</label>
          <select 
            value={gridSize} 
            onChange={(e) => setGridSize(Number(e.target.value))}
            style={{ 
              background: 'rgba(255, 255, 255, 0.1)', 
              color: 'white', 
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '2px',
              padding: '2px 4px'
            }}
          >
            <option value={10}>10px</option>
            <option value={20}>20px</option>
            <option value={50}>50px</option>
            <option value={100}>100px</option>
          </select>
        </div>
      </foreignObject>
      
      {/* Grid pattern for background */}
      <defs>
        <pattern 
          id="grid-pattern" 
          width={gridSize} 
          height={gridSize} 
          patternUnits="userSpaceOnUse"
          patternTransform={`translate(${startX}, ${startY})`}
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
      
      {/* Grid background - aligned with major grid boundaries */}
      <rect 
        x={startX}
        y={startY}
        width={gridWidth} 
        height={gridHeight} 
        fill="var(--grid-background-color)"
      />
      
      {/* Grid pattern overlay */}
      <rect 
        x={startX}
        y={startY}
        width={gridWidth} 
        height={gridHeight} 
        fill="url(#grid-pattern)" 
      />
      
      {/* Major grid lines */}
      {(() => {
        const lines = [];
        for (let x = startX; x <= startX + gridWidth; x += majorGridWidth) {
          lines.push(
            <line
              key={`v-${x}`}
              x1={x}
              y1={startY}
              x2={x}
              y2={startY + gridHeight}
              stroke="rgba(255, 255, 255, 0.15)"
              strokeWidth="1"
            />
          );
        }
        return lines;
      })()}
      
      {(() => {
        const lines = [];
        for (let y = startY; y <= startY + gridHeight; y += majorGridHeight) {
          lines.push(
            <line
              key={`h-${y}`}
              x1={startX}
              y1={y}
              x2={startX + gridWidth}
              y2={y}
              stroke="rgba(255,255,255,0.15)"
              strokeWidth="1"
            />
          );
        }
        return lines;
      })()}
    </g>
  );
};

export default Grid; 