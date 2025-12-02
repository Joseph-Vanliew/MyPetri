import React, { useCallback, useEffect } from 'react';
import { useCanvasStore, useElementsStore, useProjectStore, useToolbarStore } from '../../../stores/index.js';
import { useGridStore } from '../../../stores/gridStore.js';
import { useZoomAndPan } from '../hooks/useZoomAndPan.js';
import { useElementDrag } from '../hooks/useElementDrag.js';
import { useCanvasInteractions } from '../hooks/useCanvasInteractions.js';
import { useGridTileExtension } from '../hooks/useGridTileExtension.js';
import { createCanvasHandlers } from '../handlers/canvasHandlers.js';
import Grid from './Grid.js';
import MarkerDefinitions from '../../elements/components/MarkerDefinitions.js';
import Place from '../../elements/components/Place.js';
import Transition from '../../elements/components/Transition.js';
import Arc from '../../elements/components/Arc.js';
import ArcPreview from '../../elements/components/ArcPreview.js';
import '../canvas.css';
import { screenToSVGCoordinates } from '../utils/coordinateUtils.js';

const Canvas: React.FC = () => {
  const {
    zoomLevel,
    panOffset,
    viewBox,
    setActivePage
  } = useCanvasStore();
  
  const { selectElements, clearSelection, getElements, createPlace, createTransition, createTextElement, createShapeElement, updateElement, createArc } = useElementsStore();
  const { project } = useProjectStore();
  const { getGridTiles } = useCanvasStore();
  useEffect(() => {
    if (project?.activePageId) {
      setActivePage(project.activePageId);
    }
  }, [project?.activePageId, setActivePage]);
  const { selectedTool, toolOptions, arcDrawingStartId, setArcDrawingStartId, setSelectedTool } = useToolbarStore();
  const { canvasRef } = useZoomAndPan();
  

  const {
    gridSize,
    showGrid,
    snapToGrid,
    toggleGrid,
    toggleSnapToGrid
  } = useGridStore();

  // Selection box state (uses canvas store for UI; elements store for selection)
  const { selectionBox, setSelectionBox, isSelecting, setIsSelecting } = useCanvasStore();

  // Get elements for the current page
  const currentPageElements = project?.activePageId 
    ? getElements(project.activePageId)
    : [];

  // Arc mode check
  const isArcMode = selectedTool === 'ARC' || selectedTool === 'ARC_INHIBITOR' || selectedTool === 'ARC_BIDIRECTIONAL';

  // Use custom hooks for interactions
  const interactions = useCanvasInteractions({
    selectedTool,
    isArcMode,
    arcDrawingStartId,
    currentPageElements,
  });
  
  // Monitor elements and extend grid tiles when needed
  useGridTileExtension();

  // Create canvas handlers
  const handlers = createCanvasHandlers({
    projectActivePageId: project?.activePageId,
    selectedTool,
    toolOptions,
    gridSize,
    snapToGrid,
    isArcMode,
    arcDrawingStartId,
    currentPageElements,
    canvasRef,
    setArcHoverElementId: interactions.setArcHoverElementId,
    setArcDrawingStartId,
    selectionStartRef: interactions.selectionStartRef,
    isSelecting,
    selectionBox,
    setSelectionBox,
    setIsSelecting,
    setFadeSelectionBox: interactions.setFadeSelectionBox,
    createPlace,
    createTransition,
    createTextElement,
    createShapeElement,
    createArc,
    selectElements,
    clearSelection,
    clearArcState: interactions.clearArcState,
    setSelectedTool,
  });

  // Use the element drag hook
  const {
    draggingIds,
    handleElementDragStart,
    handleMouseMove,
    handleMouseUp
  } = useElementDrag({
    selectedTool,
    snapToGrid,
    gridSize,
    onUpdateElement: updateElement,
    projectActivePageId: project?.activePageId,
    getSelectedElements: (pageId: string) => useElementsStore.getState().getSelectedElements(pageId)
  });

  // Separate elements by type
  const places = currentPageElements.filter((el: any) => el.type === 'place');
  const transitions = currentPageElements.filter((el: any) => el.type === 'transition');
  const arcs = currentPageElements.filter((el: any) => el.type === 'arc');

  // Wrapper function to pass canvasRef to drag start handler
  // Note: onDrag and onDragEnd are handled at SVG level via handleMouseMove/handleMouseUp
  const handleElementDragStartWrapper = useCallback((element: any, event: React.MouseEvent) => {
    handleElementDragStart(element, event, canvasRef);
  }, [handleElementDragStart, canvasRef]);

  const handleMouseMoveWrapper = useCallback((event: React.MouseEvent) => {
    handleMouseMove(event, canvasRef);
    // Update arc preview position if drawing
    if (isArcMode && arcDrawingStartId && canvasRef.current) {
      const pos = screenToSVGCoordinates(event.clientX, event.clientY, canvasRef.current);
      interactions.setArcPreviewPos(pos);
    }
  }, [handleMouseMove, canvasRef, isArcMode, arcDrawingStartId, interactions.setArcPreviewPos]);

  return (
    <div className="canvas">
      <div className="canvas-header">
        <h3>Canvas</h3>
        <div className="canvas-controls">
          <span>Zoom: {((zoomLevel / 3) * 100).toFixed(0)}%</span>
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
          onMouseDown={(e) => { e.preventDefault(); handlers.handleCanvasMouseDown(e); }}
          onMouseMove={(e) => { handleMouseMoveWrapper(e); handlers.handleCanvasMouseMove(e); }}
          onMouseUp={(e) => { handleMouseUp(e); handlers.handleCanvasMouseUp(e as any); }}
          onClick={handlers.handleCanvasClick}
          onDragOver={handlers.handleCanvasDragOver}
          onDrop={handlers.handleCanvasDrop}
        >
          {/* Marker definitions for arrows */}
          <MarkerDefinitions />
          
          {/* Grid */}
          <Grid viewBox={viewBox} />
          
          {/* Canvas background - covers all pre-rendered grid tiles */}
          {(() => {
            // Get all tiles (pre-rendered grid covers a large area)
            const allTiles = project?.activePageId ? getGridTiles(project.activePageId) : [];
            
            if (allTiles.length === 0) {
              // Fallback to viewBox if no tiles exist
              return (
                <rect 
                  width="100%" 
                  height="100%" 
                  fill="transparent" 
                  style={{ pointerEvents: 'auto' }}
                />
              );
            }
            
            // Calculate bounds of all pre-rendered tiles
            const minX = Math.min(...allTiles.map(t => t.x));
            const minY = Math.min(...allTiles.map(t => t.y));
            const maxX = Math.max(...allTiles.map(t => t.x + t.width));
            const maxY = Math.max(...allTiles.map(t => t.y + t.height));
            
            // Create a rect that covers all pre-rendered tiles
            return (
              <rect 
                x={minX}
                y={minY}
                width={maxX - minX}
                height={maxY - minY}
                fill="transparent" 
                style={{ pointerEvents: 'auto' }}
              />
            );
          })()}
          
          {/* Selection box overlay */}
          {isSelecting && selectionBox && (
            <rect
              x={selectionBox.x}
              y={selectionBox.y}
              width={selectionBox.width}
              height={selectionBox.height}
              fill="rgba(0, 122, 204, 0.15)"
              stroke="#007acc"
              strokeDasharray="6,4"
              strokeWidth={1}
              pointerEvents="none"
            />
          )}
          {interactions.fadeSelectionBox && (
            <rect
              x={interactions.fadeSelectionBox.x}
              y={interactions.fadeSelectionBox.y}
              width={interactions.fadeSelectionBox.width}
              height={interactions.fadeSelectionBox.height}
              className="selection-box-fade"
              pointerEvents="none"
            />
          )}
          

          {/* Render Arcs (render first so they appear behind elements) */}
          {arcs.map((arc) => (
            (() => {
              const { startPoint, endPoint } = handlers.getArcEndpoints(arc);
              return (
                <Arc
                  key={arc.id}
                  arc={arc as any}
                  pathData={`M ${startPoint.x},${startPoint.y} L ${endPoint.x},${endPoint.y}`}
                  startPoint={startPoint}
                  endPoint={endPoint}
                  onSelect={interactions.handleElementSelect}
                  onDeselect={interactions.handleElementDeselect}
                  onDragStart={handleElementDragStartWrapper}
                />
              );
            })()
          ))}

          {/* In-progress arc preview */}
          <ArcPreview
            isArcMode={isArcMode}
            arcDrawingStartId={arcDrawingStartId}
            arcPreviewPos={interactions.arcPreviewPos}
            arcHoverElementId={interactions.arcHoverElementId}
            currentPageElements={currentPageElements}
            selectedTool={selectedTool}
          />

          {/* Render Places */}
          {places.map((place) => (
            <Place
              key={place.id}
              place={place as any}
              onDragStart={handleElementDragStartWrapper}
              onMouseEnterElement={interactions.handleElementMouseEnter}
              onMouseLeaveElement={interactions.handleElementMouseLeave}
              onArcConnect={interactions.handleConnectableClick}
              isDragging={draggingIds.includes(place.id)}
            />
          ))}
          
          {/* Render Transitions */}
          {transitions.map((transition) => (
            <Transition
              key={transition.id}
              transition={transition as any}
              onDragStart={handleElementDragStartWrapper}
              onMouseEnterElement={interactions.handleElementMouseEnter}
              onMouseLeaveElement={interactions.handleElementMouseLeave}
              onArcConnect={interactions.handleConnectableClick}
              isDragging={draggingIds.includes(transition.id)}
            />
          ))}
          
          {/* Instructions (only show if no elements) */}
          {currentPageElements.length === 0 && (
            <>
              <text x="0" y="-150" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="16">
                Select a tool from the toolbar above
              </text>
              <text x="0" y="-100" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="16">
                Click on the canvas to place elements
              </text>
              <text x="0" y="-50" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="16">
                Use Ctrl/Cmd + Mouse Wheel to zoom
              </text>
              <text x="0" y="0" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="16">
                Use Mouse Wheel to pan up/down
              </text>
              <text x="0" y="50" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="16">
                Use Shift + Mouse Wheel to pan left/right
              </text>
              <text x="0" y="100" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="16">
                Use Middle Mouse Button to pan freely
              </text>
              <text x="0" y="200" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="14">
                Grid: {showGrid ? 'ON' : 'OFF'} | Snap: {snapToGrid ? 'ON' : 'OFF'} | Size: {gridSize}px
              </text>
              <text x="0" y="350" textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="24">
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