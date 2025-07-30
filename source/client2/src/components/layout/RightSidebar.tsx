import React from 'react';

interface RightSidebarProps {
  width: number;
}

const RightSidebar: React.FC<RightSidebarProps> = ({ width }) => {
  return (
    <div className="right-sidebar" style={{ width: `${width}px` }}>
      <div className="sidebar-header">
        <h3>Analysis Tools</h3>
      </div>
      <div className="analysis-tools">
        <div className="tool-tab">
          <h4>Validator</h4>
          {/* TODO: Add validator component */}
          <p>Petri net validation tools will be here</p>
        </div>
        <div className="tool-tab">
          <h4>Analyzer</h4>
          {/* TODO: Add analyzer component */}
          <p>Petri net analysis tools will be here</p>
        </div>
        <div className="tool-tab">
          <h4>JSON Viewer</h4>
          {/* TODO: Add JSON viewer component */}
          <p>Project data viewer will be here</p>
        </div>
      </div>
    </div>
  );
};

export default RightSidebar; 