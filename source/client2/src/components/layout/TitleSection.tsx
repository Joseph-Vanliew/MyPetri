import React from 'react';
import { useProjectStore, useHistoryStore } from '../../stores/index.js';

const TitleSection: React.FC = () => {
  const { project, updateProjectName } = useProjectStore();

  const undo = useHistoryStore((s) => s.undo);
  const redo = useHistoryStore((s) => s.redo);
  const canUndo = useHistoryStore((s) => s.past.length > 0);
  const canRedo = useHistoryStore((s) => s.future.length > 0);

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
      <div className="history-controls" style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
        <button onClick={() => undo()} disabled={!canUndo} title="Undo (Cmd/Ctrl+Z)">Undo</button>
        <button onClick={() => redo()} disabled={!canRedo} title="Redo (Cmd/Ctrl+Shift+Z)">Redo</button>
      </div>
    </div>
  );
};

export default TitleSection; 