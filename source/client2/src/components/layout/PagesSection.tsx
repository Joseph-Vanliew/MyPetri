import React, { useState } from 'react';
import { useProjectStore } from '../../stores/index.js';

const PagesSection: React.FC = () => {
  const { project, setActivePage, addPage, removePage, updatePageName } = useProjectStore();
  const [editingPageId, setEditingPageId] = useState<string | null>(null);

  if (!project) return null;

  return (
    <div className="pages-section">
      <div className="page-tabs">
        {project.pages.map((page) => (
          <div
            key={page.id}
            className={`page-tab ${project.activePageId === page.id ? 'active' : ''}`}
            onClick={() => setActivePage(page.id)}
            onDoubleClick={() => setEditingPageId(page.id)}
          >
            {editingPageId === page.id ? (
              <input
                type="text"
                value={page.name}
                autoFocus
                onChange={(e) => updatePageName(page.id, e.target.value)}
                onBlur={() => setEditingPageId(null)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    (e.target as HTMLInputElement).blur();
                  } else if (e.key === 'Escape') {
                    setEditingPageId(null);
                  }
                }}
                className="page-name-input"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className="page-name">{page.name}</span>
            )}
            <button
              className="remove-page-btn"
              onClick={(e) => {
                e.stopPropagation();
                removePage(page.id);
              }}
            >
              ×
            </button>
          </div>
        ))}
        <button className="add-page-btn" onClick={() => addPage(`Page ${project.pages.length + 1}`)}>
          +
        </button>
      </div>
    </div>
  );
};

export default PagesSection; 