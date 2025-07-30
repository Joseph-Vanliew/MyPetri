import React from 'react';
import { useCanvasStore } from '../../../stores/index.js';
import { useZoomAndPan } from '../hooks/useZoomAndPan.js';
import Grid from './Grid.js';
import '../canvas.css';

const Canvas: React.FC = () => {
  const { 
    zoomLevel, 
    panOffset, 
    viewBox, 
    gridSize, 
    showGrid, 
    snapToGrid,
    toggleGrid,
    toggleSnapToGrid,
    setGridSize
  } = useCanvasStore();
  const { canvasRef } = useZoomAndPan();

  return (
    <div className="canvas">
      <div className="canvas-header">
        <h3>Canvas</h3>
        <div className="canvas-controls">
          <span>Zoom: {(zoomLevel * 100).toFixed(0)}%</span>
          <span>Pan: ({panOffset.x.toFixed(0)}, {panOffset.y.toFixed(0)})</span>
          
          {/* Grid Controls */}
          <div className="grid-controls">
            <button 
              className={`grid-toggle ${showGrid ? 'active' : ''}`}
              onClick={toggleGrid}
              title="Toggle Grid"
            >
              Grid
            </button>
            <button 
              className={`snap-toggle ${snapToGrid ? 'active' : ''}`}
              onClick={toggleSnapToGrid}
              title="Toggle Snap to Grid"
            >
              Snap
            </button>
            <select 
              value={gridSize} 
              onChange={(e) => setGridSize(Number(e.target.value))}
              className="grid-size-select"
            >
              <option value={10}>10px</option>
              <option value={20}>20px</option>
              <option value={50}>50px</option>
              <option value={100}>100px</option>
            </select>
          </div>
        </div>
      </div>
      <div className="canvas-content">
        <svg
          ref={canvasRef}
          className="canvas-svg"
          viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
          style={{
            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`
          }}
          onWheel={(e) => e.preventDefault()}
          onMouseDown={(e) => e.preventDefault()}
        >
          {/* Grid */}
          <Grid viewBox={viewBox} gridSize={gridSize} showGrid={showGrid} />
          
          {/* Canvas background - this should capture events */}
          <rect 
            width="100%" 
            height="100%" 
            fill="rgba(26, 26, 26, 0.8)" 
            stroke="rgba(255,255,255,0.2)" 
            strokeWidth="1"
            style={{ pointerEvents: 'auto' }}
          />
          
          {/* Instructions */}
          <text x="50%" y="30%" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="16">
            Use Ctrl/Cmd + Mouse Wheel to zoom
          </text>
          <text x="50%" y="35%" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="16">
            Use Mouse Wheel to pan up/down
          </text>
          <text x="50%" y="40%" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="16">
            Use Shift + Mouse Wheel to pan left/right
          </text>
          <text x="50%" y="45%" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="16">
            Use Middle Mouse Button to pan freely
          </text>
          
          {/* Grid status */}
          <text x="50%" y="55%" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="14">
            Grid: {showGrid ? 'ON' : 'OFF'} | Snap: {snapToGrid ? 'ON' : 'OFF'} | Size: {gridSize}px
          </text>
          
          {/* TODO: Render elements here */}
          <text x="50%" y="70%" textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="24">
            Canvas Area - Elements will be rendered here
          </text>
        </svg>
      </div>
    </div>
  );
};

export default Canvas; 