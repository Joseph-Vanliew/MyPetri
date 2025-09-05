import React, { useCallback, useState, useEffect } from 'react';
import { useCanvasStore, useElementsStore, useProjectStore, useToolbarStore } from '../../../stores/index.js';
import { useGridStore } from '../../../stores/gridStore.js';
import { useZoomAndPan } from '../hooks/useZoomAndPan.js';
import { useElementDrag } from '../hooks/useElementDrag.js';
import Grid from './Grid.js';
import MarkerDefinitions from '../../elements/components/MarkerDefinitions.js';
import Place from '../../elements/components/Place.js';
import Transition from '../../elements/components/Transition.js';
import Arc from '../../elements/components/Arc.js';
import ArcPreview from '../../elements/components/ArcPreview.js';
import '../canvas.css';
import { calculateArcEndpoints} from '../../elements/utils/arcCalculationUtils.js';
import { screenToSVGCoordinates, snapToGrid as snapToGridUtil } from '../utils/coordinateUtils.js';

const Canvas: React.FC = () => {
  const [arcPreviewPos, setArcPreviewPos] = useState<{ x: number; y: number } | null>(null);
  const [arcHoverElementId, setArcHoverElementId] = useState<string | null>(null);
  const {
    zoomLevel,
    panOffset,
    viewBox,
    setActivePage
  } = useCanvasStore();
  
  const { selectElement, selectElements, removeElements, clearSelection, getElements, createPlace, createTransition, createTextElement, createShapeElement, updateElement, createArc } = useElementsStore();
  const { project } = useProjectStore();
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
  const selectionStartRef = React.useRef<{ x: number; y: number } | null>(null);
  const [fadeSelectionBox, setFadeSelectionBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  // Helper function to clear arc drawing state (keeps tool selected for multiple arcs)
  const clearArcState = useCallback(() => {
    setArcDrawingStartId(null);
    setArcPreviewPos(null);
    setArcHoverElementId(null);
  }, [setArcDrawingStartId]);

  // Handle keyboard shortcuts (Escape: clear selection/arc; Delete/Backspace: delete selected)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore when typing in inputs or contenteditable
      const target = event.target as HTMLElement | null;
      const isTyping = !!target && (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      );

      if (event.key === 'Escape') {
        // Always prevent default for Escape key to prevent fullscreen exit
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        
        // Clear any selected elements
        if (project?.activePageId) {
          clearSelection(project.activePageId);
        }
        // Clear arc drawing mode and preview state
        clearArcState();
        // Reset tool to none
        setSelectedTool('NONE' as any);
      } else if (!isTyping && (event.key === 'Delete' || event.key === 'Backspace')) {
        if (project?.activePageId) {
          const selected = useElementsStore.getState().getSelectedElements(project.activePageId);
          if (selected.length > 0) {
            event.preventDefault();
            const selectedIds = new Set(selected.map(el => el.id));
            // Also delete arcs connected to any selected element
            const all = useElementsStore.getState().getElements(project.activePageId);
            const connectedArcIds = all
              .filter((el: any) => el.type === 'arc' && (selectedIds.has(el.sourceId) || selectedIds.has(el.targetId)))
              .map((el: any) => el.id);
            const idsToDelete = [...selectedIds, ...connectedArcIds].map(String);
            removeElements(project.activePageId, idsToDelete);
            clearSelection(project.activePageId);
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [clearSelection, clearArcState, setSelectedTool, project?.activePageId]);

  // Clear arc state when tool changes (unless explicitly setting to NONE)
  useEffect(() => {
    if (selectedTool !== 'ARC' && selectedTool !== 'ARC_INHIBITOR' && selectedTool !== 'ARC_BIDIRECTIONAL' && selectedTool !== 'NONE') {
      clearArcState();
    }
  }, [selectedTool, clearArcState]);

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
    projectActivePageId: project?.activePageId,
    getSelectedElements: (pageId: string) => useElementsStore.getState().getSelectedElements(pageId)
  });

  // Get elements for the current page
  const currentPageElements = project?.activePageId 
    ? getElements(project.activePageId)
    : [];

  // Separate elements by type
  const places = currentPageElements.filter((el: any) => el.type === 'place');
  const transitions = currentPageElements.filter((el: any) => el.type === 'transition');
  const arcs = currentPageElements.filter((el: any) => el.type === 'arc');

  // Compute arc endpoints using shared utility
  const getArcEndpoints = (arc: any) => {
    const sourceElement = currentPageElements.find(el => el.id === arc.sourceId);
    const targetElement = currentPageElements.find(el => el.id === arc.targetId);
    if (!sourceElement || !targetElement) {
      return {
        startPoint: { x: arc.x, y: arc.y },
        endPoint: { x: arc.x + arc.width, y: arc.y + arc.height }
      };
    }

    // Use shared calculation utility for consistent behavior
    const { startPoint, endPoint } = calculateArcEndpoints({
      startElement: sourceElement as any,
      endElement: targetElement as any,
      arcType: arc.arcType
    });

    return { startPoint, endPoint };
  };

  // Element click handling for arc connection workflow
  const handleConnectableClick = (elementId: string) => {
    if (!project?.activePageId) return;
    if (!(selectedTool === 'ARC' || selectedTool === 'ARC_INHIBITOR' || selectedTool === 'ARC_BIDIRECTIONAL')) return;

    if (!arcDrawingStartId) {
      setArcDrawingStartId(elementId);
      return;
    }

    if (arcDrawingStartId === elementId) {
      clearArcState();
      return;
    }

    // Validate endpoints
    const startEl = currentPageElements.find(el => el.id === arcDrawingStartId);
    const endEl = currentPageElements.find(el => el.id === elementId);
    if (!startEl || !endEl) {
      clearArcState();
      return;
    }

    const isStartPlace = startEl.type === 'place';
    const isStartTransition = startEl.type === 'transition';
    const isEndPlace = endEl.type === 'place';
    const isEndTransition = endEl.type === 'transition';

    // Only between place and transition (no place->place or transition->transition)
    if ((isStartPlace && isEndPlace) || (isStartTransition && isEndTransition)) {
      clearArcState();
      return;
    }

    // Map tool to arc type
    const arcType = selectedTool === 'ARC' ? 'normal' : selectedTool === 'ARC_INHIBITOR' ? 'inhibitor' : 'bidirectional';

    // Inhibitor only allowed from place -> transition
    if (arcType === 'inhibitor' && !(isStartPlace && isEndTransition)) {
      clearArcState();
      return;
    }

    // Create arc with default weight 1
    createArc(project.activePageId, arcDrawingStartId, elementId, 1, arcType as any);
    // Clear arc drawing state but stay in arc mode for multiple arcs
    clearArcState();
    // Don't reset tool - stay in arc mode for multiple arcs
  };

  const handleElementSelect = (element: any) => {
    if (selectedTool === 'ARC' || selectedTool === 'ARC_INHIBITOR' || selectedTool === 'ARC_BIDIRECTIONAL') {
      handleConnectableClick(element.id);
      return;
    }
    
    // Check if this element is already part of a multi-selection
    if (project?.activePageId) {
      const selectedElements = useElementsStore.getState().getSelectedElements(project.activePageId);
      const isAlreadySelected = selectedElements.some((el: any) => el.id === element.id);
      
      if (isAlreadySelected && selectedElements.length > 1) {
        // Element is already part of multi-selection, don't change selection
        // drag the entire group
        return;
      }
    }
    
    selectElement(project?.activePageId || '', element.id);
  };

  const handleElementDeselect = (_element: any) => {
    // For now, just clear selection
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
    // Update arc preview position if drawing
    const isArcModeLocal = selectedTool === 'ARC' || selectedTool === 'ARC_INHIBITOR' || selectedTool === 'ARC_BIDIRECTIONAL';
    if (isArcModeLocal && arcDrawingStartId && canvasRef.current) {
      const pos = screenToSVGCoordinates(event.clientX, event.clientY, canvasRef.current);
      setArcPreviewPos(pos);
    }
  }, [handleMouseMove, canvasRef, selectedTool, arcDrawingStartId]);

  // Handle canvas click for element placement
  const handleCanvasClick = (event: React.MouseEvent) => {
    if (!project?.activePageId || selectedTool === 'NONE') {
      return;
    }

    // Use consistent coordinate transformation
    const svgPoint = screenToSVGCoordinates(event.clientX, event.clientY, event.currentTarget as SVGSVGElement);
    
    // Snap to grid if enabled using utility function
    const finalCoords = snapToGrid ? snapToGridUtil(svgPoint.x, svgPoint.y, gridSize) : svgPoint;
    
    switch (selectedTool) {
      case 'PLACE':
        createPlace(project.activePageId, finalCoords.x, finalCoords.y, toolOptions.PLACE.radius);
        break;
      case 'TRANSITION':
        createTransition(project.activePageId, finalCoords.x, finalCoords.y, toolOptions.TRANSITION.width, toolOptions.TRANSITION.height);
        break;
      case 'TEXT':
        createTextElement(project.activePageId, finalCoords.x, finalCoords.y, 'Text');
        break;
      case 'SHAPE':
        createShapeElement(project.activePageId, finalCoords.x, finalCoords.y, toolOptions.SHAPE.shapeType);
        break;
      case 'ARC':
      case 'ARC_INHIBITOR':
      case 'ARC_BIDIRECTIONAL':
        // Click on empty canvas does nothing for arc tools
        break;
    }
  };

  // Arc hover targeting state
  const isArcMode = selectedTool === 'ARC' || selectedTool === 'ARC_INHIBITOR' || selectedTool === 'ARC_BIDIRECTIONAL';
  const handleElementMouseEnter = (_element: any) => {
    if (!isArcMode) return;
    setArcHoverElementId(_element.id);
  };
  const handleElementMouseLeave = (_element: any) => {
    if (!isArcMode) return;
    setArcHoverElementId((prev) => (prev === _element.id ? null : prev));
  };

  // Handle drop from toolbar for non-arc elements
  const handleCanvasDragOver: React.DragEventHandler<SVGSVGElement> = (e) => {
    e.preventDefault();
  };

  const handleCanvasDrop: React.DragEventHandler<SVGSVGElement> = (e) => {
    e.preventDefault();
    if (!project?.activePageId) return;
    const tool = e.dataTransfer.getData('text/plain');
    if (!tool || tool === 'ARC' || tool === 'ARC_INHIBITOR' || tool === 'ARC_BIDIRECTIONAL') return;
    if (!canvasRef.current) return;
    const svgPoint = screenToSVGCoordinates(e.clientX, e.clientY, canvasRef.current);
    const finalX = snapToGrid ? Math.round(svgPoint.x / gridSize) * gridSize : svgPoint.x;
    const finalY = snapToGrid ? Math.round(svgPoint.y / gridSize) * gridSize : svgPoint.y;
    switch (tool) {
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
    }
  };

  // Mouse handlers for selection box
  const handleCanvasMouseDown: React.MouseEventHandler<SVGSVGElement> = (e) => {
    // Only start selection when clicking on empty canvas area (not on elements)
    if ((e.target as Element).tagName.toLowerCase() !== 'svg' && (e.target as SVGElement).closest('.place-element, .transition-element, .arc-element')) {
      return;
    }
    e.preventDefault();
    const svg = e.currentTarget;
    const start = screenToSVGCoordinates(e.clientX, e.clientY, svg);
    selectionStartRef.current = start;
    setSelectionBox({ x: start.x, y: start.y, width: 0, height: 0 });
    setIsSelecting(true);
  };

  const handleCanvasMouseMove: React.MouseEventHandler<SVGSVGElement> = (e) => {
    if (!isSelecting || !selectionStartRef.current) return;
    const svg = e.currentTarget;
    const curr = screenToSVGCoordinates(e.clientX, e.clientY, svg);
    const x = Math.min(selectionStartRef.current.x, curr.x);
    const y = Math.min(selectionStartRef.current.y, curr.y);
    const width = Math.abs(curr.x - selectionStartRef.current.x);
    const height = Math.abs(curr.y - selectionStartRef.current.y);
    setSelectionBox({ x, y, width, height });
  };

  const handleCanvasMouseUp: React.MouseEventHandler<SVGSVGElement> = () => {
    if (!isSelecting || !selectionBox) return;
    if (project?.activePageId) {
      // Determine which elements intersect selectionBox
      const elems = currentPageElements;
      const selectedIds = elems.filter((el: any) => {
        const elBounds = { x: el.x - el.width / 2, y: el.y - el.height / 2, width: el.width, height: el.height };
        const intersects = !(elBounds.x + elBounds.width < selectionBox.x ||
                             selectionBox.x + selectionBox.width < elBounds.x ||
                             elBounds.y + elBounds.height < selectionBox.y ||
                             selectionBox.y + selectionBox.height < elBounds.y);
        return intersects;
      }).map((el: any) => el.id);
      if (selectedIds.length > 0) {
        selectElements(project.activePageId, selectedIds);
      } else {
        clearSelection(project.activePageId);
      }
    }
    // Trigger fade-out of the selection box
    setFadeSelectionBox(selectionBox);
    setIsSelecting(false);
    setSelectionBox(null);
    window.setTimeout(() => setFadeSelectionBox(null), 200);
    selectionStartRef.current = null;
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
          onMouseDown={(e) => { e.preventDefault(); handleCanvasMouseDown(e); }}
          onMouseMove={(e) => { handleMouseMoveWrapper(e); handleCanvasMouseMove(e); }}
          onMouseUp={(e) => { handleMouseUp(e); handleCanvasMouseUp(e as any); }}
          onClick={handleCanvasClick}
          onDragOver={handleCanvasDragOver}
          onDrop={handleCanvasDrop}
        >
          {/* Marker definitions for arrows */}
          <MarkerDefinitions />
          
          {/* Grid */}
          <Grid viewBox={viewBox} />
          
          {/* Canvas background - transparent to let grid show through */}
          <rect 
            width="100%" 
            height="100%" 
            fill="transparent" 
            style={{ pointerEvents: 'auto' }}
          />
          
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
          {fadeSelectionBox && (
            <rect
              x={fadeSelectionBox.x}
              y={fadeSelectionBox.y}
              width={fadeSelectionBox.width}
              height={fadeSelectionBox.height}
              className="selection-box-fade"
              pointerEvents="none"
            />
          )}

          {/* Render Arcs (render first so they appear behind elements) */}
          {arcs.map((arc) => (
            (() => {
              const { startPoint, endPoint } = getArcEndpoints(arc);
              return (
                <Arc
                  key={arc.id}
                  arc={arc as any}
                  pathData={`M ${startPoint.x},${startPoint.y} L ${endPoint.x},${endPoint.y}`}
                  startPoint={startPoint}
                  endPoint={endPoint}
                  onSelect={handleElementSelect}
                  onDeselect={handleElementDeselect}
                  onDragStart={handleElementDragStartWrapper}
                  onDrag={handleElementDragWrapper}
                  onDragEnd={handleElementDragEnd}
                />
              );
            })()
          ))}

          {/* In-progress arc preview */}
          <ArcPreview
            isArcMode={isArcMode}
            arcDrawingStartId={arcDrawingStartId}
            arcPreviewPos={arcPreviewPos}
            arcHoverElementId={arcHoverElementId}
            currentPageElements={currentPageElements}
            selectedTool={selectedTool}
          />


          
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
              isArcTarget={isArcMode && selectedTool !== 'ARC_INHIBITOR'}
              onMouseEnterElement={(p) => handleElementMouseEnter(p)}
              onMouseLeaveElement={(p) => handleElementMouseLeave(p)}
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
              isArcTarget={isArcMode}
              onMouseEnterElement={(t) => handleElementMouseEnter(t)}
              onMouseLeaveElement={(t) => handleElementMouseLeave(t)}
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