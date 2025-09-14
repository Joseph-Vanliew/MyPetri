import React, { useRef, useEffect } from 'react';
import { useToolbarStore, useElementsStore, useProjectStore, useCanvasStore } from '../../../stores/index.js';
import { useInteractionStore } from '../../../stores/interactionStore.js';
import ToolButton from './ToolButton.js';
import ToolSection from './ToolSection.js';
import { 
  PlaceIcon, 
  TransitionIcon, 
  ArcIcon, 
  InhibitorArcIcon, 
  BidirectionalArcIcon, 
  TextIcon, 
  ShapeIcon,
  DEFAULT_ICON_SIZE
} from '../icons/index.js';
import type { ToolType } from '../types/ToolTypes';

const Toolbar: React.FC = () => {
  const { selectedTool, setSelectedTool, toolOptions } = useToolbarStore();
  const { createPlace, createTransition, createTextElement, createShapeElement, selectElements } = useElementsStore();
  const { project } = useProjectStore();
  const { viewBox, zoomLevel, panOffset } = useCanvasStore();
  const { interactionVersion } = useInteractionStore();

  // Calculate the center of the current viewport
  const getViewportCenter = () => {
    const centerX = viewBox.x + viewBox.width / 2;
    const centerY = viewBox.y + viewBox.height / 2;
    return { x: centerX, y: centerY };
  };

  // Track last placement offset state across renders
  const perToolLastPosRef = useRef<Record<string, { x: number; y: number } | null>>({});
  const PLACE_OFFSET = 40;

  // Handle tool selection and element placement
  const handleToolClick = (tool: ToolType) => {
    if (tool === 'NONE') {
      setSelectedTool('NONE' as any);
      return;
    }

    // for the active page, place the element at viewport center
    if (project?.activePageId) {
      // Determine placement position: use last placed position + offset, else center
      const center = getViewportCenter();
      const key = tool;
      const last = perToolLastPosRef.current[key] || null;
      const base = last || center;
      const pos = {
        x: base.x + (last ? PLACE_OFFSET : 0),
        y: base.y
      };
      
      switch (tool) {
        case 'PLACE':
          {
            const el = createPlace(project.activePageId, pos.x, pos.y, toolOptions.PLACE.radius);
            selectElements(project.activePageId, [el.id]);
            perToolLastPosRef.current[key] = { x: pos.x, y: pos.y };
          }
          break;
        case 'TRANSITION':
          {
            const el = createTransition(project.activePageId, pos.x, pos.y, toolOptions.TRANSITION.width, toolOptions.TRANSITION.height);
            selectElements(project.activePageId, [el.id]);
            perToolLastPosRef.current[key] = { x: pos.x, y: pos.y };
          }
          break;
        case 'TEXT':
          {
            const el = createTextElement(project.activePageId, pos.x, pos.y, 'Text');
            selectElements(project.activePageId, [el.id]);
            perToolLastPosRef.current[key] = { x: pos.x, y: pos.y };
          }
          break;
        case 'SHAPE':
          {
            const el = createShapeElement(project.activePageId, pos.x, pos.y, toolOptions.SHAPE.shapeType);
            selectElements(project.activePageId, [el.id]);
            perToolLastPosRef.current[key] = { x: pos.x, y: pos.y };
          }
          break;
        case 'ARC':
        case 'ARC_INHIBITOR':
        case 'ARC_BIDIRECTIONAL':
          setSelectedTool(tool as any);
          return;
      }
      
      // Reset to NONE tool after placing
      setSelectedTool('NONE' as any);
    } else {
      // No active page, just select the tool
      setSelectedTool(tool as any);
    }
  };

  // Reset last placement map if page changes, viewport changes, or any interaction occurs (drag, etc.)
  useEffect(() => {
    perToolLastPosRef.current = {};
  }, [project?.activePageId]);

  useEffect(() => {
    perToolLastPosRef.current = {};
  }, [zoomLevel, panOffset.x, panOffset.y]);

  useEffect(() => {
    perToolLastPosRef.current = {};
  }, [interactionVersion]);

  return (
    <div className="toolbar-sidebar">
      <div className="toolbar-header">
        <h3>Tools</h3>
      </div>
      
      <ToolSection title="Elements">
        {/* Place Tool */}
        <ToolButton
          toolType="PLACE"
          isActive={selectedTool === 'PLACE'}
          onClick={handleToolClick}
          title="Add a place (circle)"
          // Prevent keyboard activation via space/enter from placing items unintentionally
        >
          <div className="tool-preview">
            <PlaceIcon size={DEFAULT_ICON_SIZE} />
          </div>
          <span className="tool-name">Place</span>
        </ToolButton>

        {/* Transition Tool */}
        <ToolButton
          toolType="TRANSITION"
          isActive={selectedTool === 'TRANSITION'}
          onClick={handleToolClick}
          title="Add a transition (rectangle)"
          // Prevent keyboard activation via space/enter from placing items unintentionally
        >
          <div className="tool-preview">
            <TransitionIcon size={DEFAULT_ICON_SIZE} />
          </div>
          <span className="tool-name">Transition</span>
        </ToolButton>
      </ToolSection>

      <ToolSection title="Arcs">
        {/* Normal Arc */}
        <ToolButton
          toolType="ARC"
          isActive={selectedTool === 'ARC'}
          onClick={handleToolClick}
          title="Connect elements with normal arc"
        >
          <div className="tool-preview">
            <ArcIcon size={DEFAULT_ICON_SIZE} />
          </div>
          <span className="tool-name">Arc</span>
        </ToolButton>

        {/* Inhibitor Arc */}
        <ToolButton
          toolType="ARC_INHIBITOR"
          isActive={selectedTool === 'ARC_INHIBITOR'}
          onClick={handleToolClick}
          title="Connect with inhibitor arc"
        >
          <div className="tool-preview">
            <InhibitorArcIcon size={DEFAULT_ICON_SIZE} />
          </div>
          <span className="tool-name">Inhibitor</span>
        </ToolButton>

        {/* Bidirectional Arc */}
        <ToolButton
          toolType="ARC_BIDIRECTIONAL"
          isActive={selectedTool === 'ARC_BIDIRECTIONAL'}
          onClick={handleToolClick}
          title="Connect with bidirectional arc"
        >
          <div className="tool-preview">
            <BidirectionalArcIcon size={DEFAULT_ICON_SIZE} />
          </div>
          <span className="tool-name">Bidirectional</span>
        </ToolButton>
      </ToolSection>

      <ToolSection title="Annotations">
        {/* Text Tool */}
        <ToolButton
          toolType="TEXT"
          isActive={selectedTool === 'TEXT'}
          onClick={handleToolClick}
          title="Add text annotation"
        >
          <div className="tool-preview">
            <TextIcon size={DEFAULT_ICON_SIZE} />
          </div>
          <span className="tool-name">Text</span>
        </ToolButton>

        {/* Shape Tool */}
        <ToolButton
          toolType="SHAPE"
          isActive={selectedTool === 'SHAPE'}
          onClick={handleToolClick}
          title="Add geometric shapes"
        >
          <div className="tool-preview">
            <ShapeIcon size={DEFAULT_ICON_SIZE} />
          </div>
          <span className="tool-name">Shape</span>
        </ToolButton>
      </ToolSection>
    </div>
  );
};

export default Toolbar; 