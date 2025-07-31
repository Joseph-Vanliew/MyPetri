import React from 'react';

interface ToolSectionProps {
  title: string;
  children: React.ReactNode;
}

const ToolSection: React.FC<ToolSectionProps> = ({ title, children }) => {
  return (
    <div className="toolbar-section">
      <h4>{title}</h4>
      <div className="tool-group">
        {children}
      </div>
    </div>
  );
};

export default ToolSection; 