import React from 'react';
import FileMenu from '../../features/project/components/FileMenu.js';
import EditMenu from '../../features/project/components/EditMenu.js';

const Ribbon: React.FC = () => {
  return (
    <div className="ribbon">
      <div className="ribbon-section">
        <FileMenu />
      </div>
      
      <div className="ribbon-section">
        <EditMenu />
      </div>
      
      <div className="ribbon-section">
        <h4>View</h4>
        <div className="view-operations">
          <button className="operation-button">Zoom In</button>
          <button className="operation-button">Zoom Out</button>
          <button className="operation-button">Fit to View</button>
        </div>
      </div>
    </div>
  );
};

export default Ribbon; 