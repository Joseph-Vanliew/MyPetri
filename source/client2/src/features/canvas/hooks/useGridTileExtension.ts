import { useEffect, useRef } from 'react';
import { useElementsStore } from '../../../stores/elementsStore.js';
import { useCanvasStore } from '../../../stores/canvasStore.js';
import { useProjectStore } from '../../../stores/index.js';
import { getElementBounds } from '../utils/elementBoundsUtils.js';

/**
 * Hook that ensures grid tiles are initialized for a page
 * Tiles are now pre-rendered and visibility is controlled based on element presence
 */
export const useGridTileExtension = () => {
  const { project } = useProjectStore();
  const { initializeGridTiles } = useCanvasStore();
  
  useEffect(() => {
    if (!project?.activePageId) return;
    
    const pageId = project.activePageId;
    
    // Initialize all grid tiles for this page
    // Tiles are pre-rendered and visibility is controlled in the Grid component
    initializeGridTiles(pageId);
  }, [project?.activePageId, initializeGridTiles]);
};

