import React from 'react';
import { useToolbarStore } from '../../stores/index.js';

const Ribbon: React.FC = () => {
  const { selectedTool, availableTools, setSelectedTool } = useToolbarStore();

  return (
    <div className="ribbon">
      <div className="tool-selection">
        {availableTools.map((tool) => (
          <button
            key={tool}
            className={`tool-button ${selectedTool === tool ? 'active' : ''}`}
            onClick={() => setSelectedTool(tool as any)}
          >
            {tool}
          </button>
        ))}
      </div>
      <div className="file-operations">
        <button className="operation-button">New</button>
        <button className="operation-button">Open</button>
        <button className="operation-button">Save</button>
        <button className="operation-button">Export</button>
      </div>
    </div>
  );
};

export default Ribbon; 