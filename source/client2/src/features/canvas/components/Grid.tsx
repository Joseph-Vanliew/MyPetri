import React from 'react';
import { useGridStore } from '../../../stores/gridStore';
import { useCanvasStore, type GridTile } from '../../../stores/canvasStore';
import { useProjectStore, useElementsStore } from '../../../stores/index';
import GridTileComponent from './GridTile';

interface GridProps {
  viewBox: { x: number; y: number; width: number; height: number };
}

const Grid: React.FC<GridProps> = ({ viewBox }) => {
  const { 
    gridSize, 
    setGridSize, 
    showGrid,
    showAllTiles,
    toggleShowAllTiles
  } = useGridStore();
  const { project } = useProjectStore();
  const { getGridTiles, getVisibleGridTiles } = useCanvasStore();
  const { getElements } = useElementsStore();
  
  // Get all elements for visibility calculation
  const elements = project?.activePageId ? getElements(project.activePageId) : [];
  
  // Calculate element bounds for visibility
  const elementBounds = elements
    .filter(e => e.type !== 'arc')
    .map(element => {
      if (element.type === 'place') {
        const radius = (element as any).radius || element.width / 2;
        return {
          x: element.x,
          y: element.y,
          width: radius * 2,
          height: radius * 2,
        };
      }
      return {
        x: element.x,
        y: element.y,
        width: element.width,
        height: element.height,
      };
    });
  
  // Get grid tiles - either all tiles or just visible ones based on toggle
  const gridTiles = project?.activePageId 
    ? (showAllTiles 
        ? getGridTiles(project.activePageId)
        : getVisibleGridTiles(project.activePageId, elementBounds))
    : [];
  
  if (!showGrid) return null;

  return (
    <g className="grid" style={{ pointerEvents: 'none' }}>
      {/* Grid controls - only show in viewBox */}
      <foreignObject x={viewBox.x + 10} y={viewBox.y + 10} width="280" height="60">
        <div style={{ 
          display: 'flex',
          flexDirection: 'column',
          gap: '5px',
          background: 'rgba(0, 0, 0, 0.7)', 
          color: 'white', 
          padding: '5px', 
          borderRadius: '4px',
          fontSize: '12px',
          border: '1px solid rgba(255, 255, 255, 0.3)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ marginRight: '8px' }}>Show All Tiles:</label>
            <input
              type="checkbox"
              checked={showAllTiles}
              onChange={toggleShowAllTiles}
              style={{ 
                cursor: 'pointer',
                width: '16px',
                height: '16px'
              }}
              title="Show all pre-rendered grid tiles (for debugging/visualization)"
            />
          </div>
        </div>
      </foreignObject>
      
      {/* Render all grid tiles */}
      {gridTiles.map((tile, index) => (
        <GridTileComponent
          key={`tile-${tile.x}-${tile.y}-${index}`}
          x={tile.x}
          y={tile.y}
          width={tile.width}
          height={tile.height}
        />
      ))}
    </g>
  );
};

export default Grid; 