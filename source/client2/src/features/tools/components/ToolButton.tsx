import React from 'react';
import type { ToolType } from '../types/ToolTypes';

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
  return (
    <button
      className={`tool-button ${isActive ? 'active' : ''}`}
      onClick={() => onClick(toolType)}
      title={title}
    >
      {children}
    </button>
  );
};

export default ToolButton; 