import React from 'react';
import { useToolbarStore, useElementsStore, useProjectStore, useCanvasStore } from '../../../stores/index.js';
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
  const { createPlace, createTransition, createTextElement, createShapeElement } = useElementsStore();
  const { project } = useProjectStore();
  const { viewBox } = useCanvasStore();

  // Calculate the center of the current viewport
  const getViewportCenter = () => {
    const centerX = viewBox.x + viewBox.width / 2;
    const centerY = viewBox.y + viewBox.height / 2;
    return { x: centerX, y: centerY };
  };

  // Handle tool selection and element placement
  const handleToolClick = (tool: ToolType) => {
    if (tool === 'NONE') {
      setSelectedTool('NONE' as any);
      return;
    }

    // If we have an active page, place the element at viewport center
    if (project?.activePageId) {
      const center = getViewportCenter();
      
      switch (tool) {
        case 'PLACE':
          createPlace(project.activePageId, center.x, center.y, toolOptions.PLACE.radius);
          break;
        case 'TRANSITION':
          createTransition(project.activePageId, center.x, center.y, toolOptions.TRANSITION.width, toolOptions.TRANSITION.height);
          break;
        case 'TEXT':
          createTextElement(project.activePageId, center.x, center.y, 'Text');
          break;
        case 'SHAPE':
          createShapeElement(project.activePageId, center.x, center.y, toolOptions.SHAPE.shapeType);
          break;
        case 'ARC':
        case 'ARC_INHIBITOR':
        case 'ARC_BIDIRECTIONAL':
          // Arcs need to be created between two elements, so we'll just select the tool
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