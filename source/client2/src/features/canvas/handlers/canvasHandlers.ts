import { screenToSVGCoordinates, snapToGrid as snapToGridUtil } from '../utils/coordinateUtils.js';
import { calculateArcEndpoints } from '../../elements/utils/arcCalculationUtils.js';

interface CanvasHandlersProps {
  // Canvas state
  projectActivePageId: string | undefined;
  selectedTool: string;
  toolOptions: any;
  gridSize: number;
  snapToGrid: boolean;
  isArcMode: boolean;
  arcDrawingStartId: string | null;
  currentPageElements: any[];
  
  // Canvas refs and state setters
  canvasRef: React.RefObject<SVGSVGElement | null>;
  setArcHoverElementId: (id: string | null | ((prev: string | null) => string | null)) => void;
  setArcDrawingStartId: (id: string | null) => void;
  
  // Selection state
  selectionStartRef: React.MutableRefObject<{ x: number; y: number } | null>;
  isSelecting: boolean;
  selectionBox: { x: number; y: number; width: number; height: number } | null;
  setSelectionBox: (box: { x: number; y: number; width: number; height: number } | null) => void;
  setIsSelecting: (selecting: boolean) => void;
  setFadeSelectionBox: (box: { x: number; y: number; width: number; height: number } | null) => void;
  
  // Element actions
  createPlace: (pageId: string, x: number, y: number, radius: number) => void;
  createTransition: (pageId: string, x: number, y: number, width: number, height: number) => void;
  createTextElement: (pageId: string, x: number, y: number, text: string) => void;
  createShapeElement: (pageId: string, x: number, y: number, shapeType?: "rectangle" | "circle" | "triangle" | "diamond") => void;
  createArc: (pageId: string, sourceId: string, targetId: string, weight?: number, arcType?: "normal" | "inhibitor" | "bidirectional") => void;
  selectElements: (pageId: string, elementIds: string[]) => void;
  clearSelection: (pageId: string) => void;
  
  // Clear arc state function
  clearArcState: () => void;
}

export const createCanvasHandlers = ({
  projectActivePageId,
  selectedTool,
  toolOptions,
  gridSize,
  snapToGrid,
  isArcMode,
  arcDrawingStartId,
  currentPageElements,
  canvasRef,
  setArcHoverElementId,
  setArcDrawingStartId,
  selectionStartRef,
  isSelecting,
  selectionBox,
  setSelectionBox,
  setIsSelecting,
  setFadeSelectionBox,
  createPlace,
  createTransition,
  createTextElement,
  createShapeElement,
  createArc,
  selectElements,
  clearSelection,
  clearArcState,
}: CanvasHandlersProps) => {
  // Handle canvas click for element placement
  const handleCanvasClick = (event: React.MouseEvent) => {
    if (!projectActivePageId || selectedTool === 'NONE') {
      return;
    }

    // Use consistent coordinate transformation
    const svgPoint = screenToSVGCoordinates(event.clientX, event.clientY, event.currentTarget as SVGSVGElement);
    
    // Snap to grid if enabled using utility function
    const finalCoords = snapToGrid ? snapToGridUtil(svgPoint.x, svgPoint.y, gridSize) : svgPoint;
    
    switch (selectedTool) {
      case 'PLACE':
        createPlace(projectActivePageId, finalCoords.x, finalCoords.y, toolOptions.PLACE.radius);
        break;
      case 'TRANSITION':
        createTransition(projectActivePageId, finalCoords.x, finalCoords.y, toolOptions.TRANSITION.width, toolOptions.TRANSITION.height);
        break;
      case 'TEXT':
        createTextElement(projectActivePageId, finalCoords.x, finalCoords.y, 'Text');
        break;
      case 'SHAPE':
        createShapeElement(projectActivePageId, finalCoords.x, finalCoords.y, toolOptions.SHAPE.shapeType);
        break;
      case 'ARC':
      case 'ARC_INHIBITOR':
      case 'ARC_BIDIRECTIONAL':
        // Click on empty canvas does nothing for arc tools
        break;
    }
  };

  // Handle drop from toolbar for non-arc elements
  const handleCanvasDragOver: React.DragEventHandler<SVGSVGElement> = (e) => {
    e.preventDefault();
  };

  const handleCanvasDrop: React.DragEventHandler<SVGSVGElement> = (e) => {
    e.preventDefault();
    if (!projectActivePageId) return;
    const tool = e.dataTransfer.getData('text/plain');
    if (!tool || tool === 'ARC' || tool === 'ARC_INHIBITOR' || tool === 'ARC_BIDIRECTIONAL') return;
    if (!canvasRef.current) return;
    const svgPoint = screenToSVGCoordinates(e.clientX, e.clientY, canvasRef.current);
    const finalX = snapToGrid ? Math.round(svgPoint.x / gridSize) * gridSize : svgPoint.x;
    const finalY = snapToGrid ? Math.round(svgPoint.y / gridSize) * gridSize : svgPoint.y;
    switch (tool) {
      case 'PLACE':
        createPlace(projectActivePageId, finalX, finalY, toolOptions.PLACE.radius);
        break;
      case 'TRANSITION':
        createTransition(projectActivePageId, finalX, finalY, toolOptions.TRANSITION.width, toolOptions.TRANSITION.height);
        break;
      case 'TEXT':
        createTextElement(projectActivePageId, finalX, finalY, 'Text');
        break;
      case 'SHAPE':
        createShapeElement(projectActivePageId, finalX, finalY, toolOptions.SHAPE.shapeType);
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
    if (projectActivePageId) {
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
        selectElements(projectActivePageId, selectedIds);
      } else {
        clearSelection(projectActivePageId);
      }
    }
    // Trigger fade-out of the selection box
    setFadeSelectionBox(selectionBox);
    setIsSelecting(false);
    setSelectionBox(null);
    window.setTimeout(() => setFadeSelectionBox(null), 200);
    selectionStartRef.current = null;
  };

  // Element click handling for arc connection workflow
  const handleConnectableClick = (elementId: string) => {
    if (!projectActivePageId) return;
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
    createArc(projectActivePageId, arcDrawingStartId, elementId, 1, arcType as any);
    // Clear arc drawing state but stay in arc mode for multiple arcs
    clearArcState();
    // Don't reset tool - stay in arc mode for multiple arcs
  };

  // Arc hover targeting state
  const handleElementMouseEnter = (_element: any) => {
    if (!isArcMode) return;
    setArcHoverElementId(_element.id);
  };

  const handleElementMouseLeave = (_element: any) => {
    if (!isArcMode) return;
    setArcHoverElementId((prev: string | null) => (prev === _element.id ? null : prev));
  };

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

  return {
    handleCanvasClick,
    handleCanvasDragOver,
    handleCanvasDrop,
    handleCanvasMouseDown,
    handleCanvasMouseMove,
    handleCanvasMouseUp,
    handleConnectableClick,
    handleElementMouseEnter,
    handleElementMouseLeave,
    getArcEndpoints,
  };
};