import React from 'react';
import type { ToolType } from '../types/ToolTypes';
import { useToolbarStore } from '../../../stores/index.js';

interface ToolButtonProps {
  toolType: ToolType;
  isActive: boolean;
  onClick: (tool: ToolType) => void;
  title: string;
  children: React.ReactNode;
}

const ToolButton: React.FC<ToolButtonProps> = ({
  toolType,
  isActive,
  onClick,
  title,
  children
}) => {
  const { startDragFromToolbar, endDragFromToolbar, updateDragPreviewPosition } = useToolbarStore();

  const isArcTool = toolType === 'ARC' || toolType === 'ARC_INHIBITOR' || toolType === 'ARC_BIDIRECTIONAL';

  const handleDragStart: React.DragEventHandler<HTMLButtonElement> = (e) => {
    if (isArcTool) return;
    // Initiate DnD from toolbar
    startDragFromToolbar(toolType as any);
    updateDragPreviewPosition({ x: e.clientX, y: e.clientY });
    try {
      e.dataTransfer.setData('text/plain', toolType);
      e.dataTransfer.effectAllowed = 'copy';
      // Optionally hide default drag image
      const img = new Image();
      img.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=';
      e.dataTransfer.setDragImage(img, 0, 0);
    } catch {}
  };

  const handleDrag: React.DragEventHandler<HTMLButtonElement> = (e) => {
    if (isArcTool) return;
    updateDragPreviewPosition({ x: e.clientX, y: e.clientY });
  };

  const handleDragEnd: React.DragEventHandler<HTMLButtonElement> = () => {
    if (isArcTool) return;
    endDragFromToolbar();
  };

  return (
    <button
      className={`tool-button ${isActive ? 'active' : ''}`}
      onClick={() => onClick(toolType)}
      title={title}
      draggable={!isArcTool}
      onDragStart={handleDragStart}
      onDrag={handleDrag}
      onDragEnd={handleDragEnd}
    >
      {children}
    </button>
  );
};

export default ToolButton; 