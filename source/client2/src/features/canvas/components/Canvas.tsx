import React, { useCallback } from 'react';
import { useCanvasStore, useElementsStore, useProjectStore, useToolbarStore } from '../../../stores/index.js';
import { useZoomAndPan } from '../hooks/useZoomAndPan.js';
import { useElementDrag } from '../hooks/useElementDrag.js';
import Grid from './Grid.js';
import MarkerDefinitions from '../../elements/components/MarkerDefinitions.js';
import Place from '../../elements/components/Place.js';
import Transition from '../../elements/components/Transition.js';
import Arc from '../../elements/components/Arc.js';
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
  
  const { selectElement, clearSelection, getElements, createPlace, createTransition, createTextElement, createShapeElement, updateElement } = useElementsStore();
  const { project } = useProjectStore();
  const { selectedTool, toolOptions } = useToolbarStore();
  const { canvasRef } = useZoomAndPan();

  // Use the element drag hook
  const {
    handleElementDragStart,
    handleElementDrag,
    handleElementDragEnd,
    handleMouseMove,
    handleMouseUp
  } = useElementDrag({
    selectedTool,
    snapToGrid,
    gridSize,
    onUpdateElement: updateElement,
    projectActivePageId: project?.activePageId
  });

  // Get elements for the current page
  const currentPageElements = project?.activePageId 
    ? getElements(project.activePageId)
    : [];

  // Separate elements by type
  const places = currentPageElements.filter((el: any) => el.type === 'place');
  const transitions = currentPageElements.filter((el: any) => el.type === 'transition');
  const arcs = currentPageElements.filter((el: any) => el.type === 'arc');

  // Calculate arc paths (simplified for now)
  const calculateArcPath = (arc: any) => {
    // For now, just draw a simple line from source to target
    // This will be enhanced later with proper anchor point calculations
    const sourceElement = currentPageElements.find(el => el.id === arc.sourceId);
    const targetElement = currentPageElements.find(el => el.id === arc.targetId);
    
    if (!sourceElement || !targetElement) {
      return `M ${arc.x},${arc.y} L ${arc.x + arc.width},${arc.y + arc.height}`;
    }

    const sourceCenter = {
      x: sourceElement.x + sourceElement.width / 2,
      y: sourceElement.y + sourceElement.height / 2
    };
    const targetCenter = {
      x: targetElement.x + targetElement.width / 2,
      y: targetElement.y + targetElement.height / 2
    };

    return `M ${sourceCenter.x},${sourceCenter.y} L ${targetCenter.x},${targetCenter.y}`;
  };

  const handleElementSelect = (element: any) => {
    selectElement(project?.activePageId || '', element.id);
  };

  const handleElementDeselect = (_element: any) => {
    // For now, just clear selection - we can enhance this later
    clearSelection(project?.activePageId || '');
  };

  // Wrapper functions to pass canvasRef to the drag handlers
  const handleElementDragStartWrapper = useCallback((element: any, event: React.MouseEvent) => {
    handleElementDragStart(element, event, canvasRef);
  }, [handleElementDragStart, canvasRef]);

  const handleElementDragWrapper = useCallback((element: any, event: React.MouseEvent) => {
    handleElementDrag(element, event, canvasRef);
  }, [handleElementDrag, canvasRef]);

  const handleMouseMoveWrapper = useCallback((event: React.MouseEvent) => {
    handleMouseMove(event, canvasRef);
  }, [handleMouseMove, canvasRef]);

  // Handle canvas click for element placement
  const handleCanvasClick = (event: React.MouseEvent) => {
    if (!project?.activePageId || selectedTool === 'NONE') {
      return;
    }

    const svgElement = event.currentTarget as SVGSVGElement;
    const rect = svgElement.getBoundingClientRect();
    const viewBox = svgElement.viewBox.baseVal;
    
    // Convert click coordinates to SVG coordinates
    const clickX = ((event.clientX - rect.left) / rect.width) * viewBox.width + viewBox.x;
    const clickY = ((event.clientY - rect.top) / rect.height) * viewBox.height + viewBox.y;
    
    // Snap to grid if enabled
    const finalX = snapToGrid ? Math.round(clickX / gridSize) * gridSize : clickX;
    const finalY = snapToGrid ? Math.round(clickY / gridSize) * gridSize : clickY;
    
    switch (selectedTool) {
      case 'PLACE':
        createPlace(project.activePageId, finalX, finalY, toolOptions.PLACE.radius);
        break;
      case 'TRANSITION':
        createTransition(project.activePageId, finalX, finalY, toolOptions.TRANSITION.width, toolOptions.TRANSITION.height);
        break;
      case 'TEXT':
        createTextElement(project.activePageId, finalX, finalY, 'Text');
        break;
      case 'SHAPE':
        createShapeElement(project.activePageId, finalX, finalY, toolOptions.SHAPE.shapeType);
        break;
      case 'ARC':
      case 'ARC_INHIBITOR':
      case 'ARC_BIDIRECTIONAL':
        // TODO: Implement arc creation between two elements
        console.log(`${selectedTool} tool selected - need to implement connection logic`);
        break;
    }
  };

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
          onMouseDown={(e) => e.preventDefault()}
          onMouseMove={handleMouseMoveWrapper}
          onMouseUp={handleMouseUp}
          onClick={handleCanvasClick}
        >
          {/* Marker definitions for arrows */}
          <MarkerDefinitions />
          
          {/* Grid */}
          <Grid viewBox={viewBox} gridSize={gridSize} showGrid={showGrid} />
          
          {/* Canvas background - transparent to let grid show through */}
          <rect 
            width="100%" 
            height="100%" 
            fill="transparent" 
            style={{ pointerEvents: 'auto' }}
          />
          
          {/* Render Arcs (render first so they appear behind elements) */}
          {arcs.map((arc) => (
            <Arc
              key={arc.id}
              arc={arc as any}
              pathData={calculateArcPath(arc)}
              onSelect={handleElementSelect}
              onDeselect={handleElementDeselect}
              onDragStart={handleElementDragStartWrapper}
              onDrag={handleElementDragWrapper}
              onDragEnd={handleElementDragEnd}
            />
          ))}
          
          {/* Render Places */}
          {places.map((place) => (
            <Place
              key={place.id}
              place={place as any}
              onSelect={handleElementSelect}
              onDeselect={handleElementDeselect}
              onDragStart={handleElementDragStartWrapper}
              onDrag={handleElementDragWrapper}
              onDragEnd={handleElementDragEnd}
            />
          ))}
          
          {/* Render Transitions */}
          {transitions.map((transition) => (
            <Transition
              key={transition.id}
              transition={transition as any}
              onSelect={handleElementSelect}
              onDeselect={handleElementDeselect}
              onDragStart={handleElementDragStartWrapper}
              onDrag={handleElementDragWrapper}
              onDragEnd={handleElementDragEnd}
            />
          ))}
          
          {/* Instructions (only show if no elements) */}
          {currentPageElements.length === 0 && (
            <>
              <text x="50%" y="25%" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="16">
                Select a tool from the toolbar above
              </text>
              <text x="50%" y="30%" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="16">
                Click on the canvas to place elements
              </text>
              <text x="50%" y="35%" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="16">
                Use Ctrl/Cmd + Mouse Wheel to zoom
              </text>
              <text x="50%" y="40%" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="16">
                Use Mouse Wheel to pan up/down
              </text>
              <text x="50%" y="45%" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="16">
                Use Shift + Mouse Wheel to pan left/right
              </text>
              <text x="50%" y="50%" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="16">
                Use Middle Mouse Button to pan freely
              </text>
              <text x="50%" y="60%" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="14">
                Grid: {showGrid ? 'ON' : 'OFF'} | Snap: {snapToGrid ? 'ON' : 'OFF'} | Size: {gridSize}px
              </text>
              <text x="50%" y="75%" textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="24">
                Canvas Area - Click to place elements
              </text>
            </>
          )}
        </svg>
      </div>
    </div>
  );
};

export default Canvas; 