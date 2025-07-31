import React from 'react';
import { useToolbarStore } from '../../stores/index.js';

interface LeftSidebarProps {
  width: number;
  content?: React.ReactNode;
}

const LeftSidebar: React.FC<LeftSidebarProps> = ({ width, content }) => {
  const { selectedTool } = useToolbarStore();

  return (
    <div className="left-sidebar" style={{ width: `${width}px` }}>
      {content ? (
        content
      ) : (
        <>
          <div className="sidebar-header">
            <h3>Tool Options</h3>
          </div>
          <div className="tool-options">
            {selectedTool !== 'NONE' && (
              <div className="options-panel">
                <h4>{selectedTool} Options</h4>
                {/* TODO: Render tool-specific options */}
                <p>Options for {selectedTool} will be rendered here</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default LeftSidebar; 