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
    </div>
  );
};

export default TitleSection; 