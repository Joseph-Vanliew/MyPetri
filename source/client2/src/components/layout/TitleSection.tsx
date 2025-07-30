import React from 'react';
import { useProjectStore } from '../../stores/index.js';

const TitleSection: React.FC = () => {
  const { project, updateProjectName } = useProjectStore();

  return (
    <div className="title-section">
      <div className="project-title">
        <input
          type="text"
          value={project?.name || 'Untitled Project'}
          onChange={(e) => updateProjectName(e.target.value)}
          className="title-input"
          placeholder="Untitled Project"
        />
      </div>
      <div className="file-menu">
        {/* TODO: Add file menu buttons */}
        <button className="menu-button">File</button>
        <button className="menu-button">Edit</button>
        <button className="menu-button">View</button>
      </div>
    </div>
  );
};

export default TitleSection; 