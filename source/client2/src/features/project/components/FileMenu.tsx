import React, { useState, useRef, useEffect } from 'react';
import { useProjectStore } from '../../../stores/index.js';
import './FileMenu.css';

interface SubMenuProps {
  label: string;
  children: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
}

const SubMenu: React.FC<SubMenuProps> = ({ label, children, isOpen, onToggle }) => {
  return (
    <div className="submenu-container">
      <button className="submenu-trigger" onClick={onToggle}>
        {label}
        <span className={`submenu-arrow ${isOpen ? 'open' : ''}`}>▶</span>
      </button>
      {isOpen && (
        <div className="submenu-content">
          {children}
        </div>
      )}
    </div>
  );
};

const FileMenu: React.FC = () => {
  const { project, createNewProject, loadProject, saveProject, exportProject } = useProjectStore();
  const [isOpen, setIsOpen] = useState(false);
  const [openSubMenus, setOpenSubMenus] = useState<Set<string>>(new Set());
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setOpenSubMenus(new Set());
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const toggleSubMenu = (subMenuName: string) => {
    const newOpenMenus = new Set(openSubMenus);
    if (newOpenMenus.has(subMenuName)) {
      newOpenMenus.delete(subMenuName);
    } else {
      newOpenMenus.add(subMenuName);
    }
    setOpenSubMenus(newOpenMenus);
  };

  const handleNewProject = () => {
    createNewProject('New Project');
    setIsOpen(false);
    setOpenSubMenus(new Set());
  };

  const handleOpenProject = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pats,.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        loadProject(file);
      }
    };
    input.click();
    setIsOpen(false);
    setOpenSubMenus(new Set());
  };

  const handleSaveProject = () => {
    if (project) {
      saveProject();
    }
    setIsOpen(false);
    setOpenSubMenus(new Set());
  };

  const handleSaveAsProject = () => {
    if (project) {
      saveProject(true); // Force save as dialog
    }
    setIsOpen(false);
    setOpenSubMenus(new Set());
  };

  const handleExportPNG = () => {
    if (project) {
      exportProject('png');
    }
    setIsOpen(false);
    setOpenSubMenus(new Set());
  };

  const handleExportSVG = () => {
    if (project) {
      exportProject('svg');
    }
    setIsOpen(false);
    setOpenSubMenus(new Set());
  };

  const handleExportPDF = () => {
    if (project) {
      exportProject('pdf');
    }
    setIsOpen(false);
    setOpenSubMenus(new Set());
  };

  const handleExportJSON = () => {
    if (project) {
      exportProject('json');
    }
    setIsOpen(false);
    setOpenSubMenus(new Set());
  };

  return (
    <div className="file-menu-container" ref={menuRef}>
      <button 
        className="file-menu-trigger"
        onClick={() => setIsOpen(!isOpen)}
      >
        File
      </button>
      
      {isOpen && (
        <div className="file-menu-dropdown">
          {/* Project Operations */}
          <div className="menu-section">
            <button 
              className="menu-item"
              onClick={handleNewProject}
            >
              New Project
            </button>
            <button 
              className="menu-item"
              onClick={handleOpenProject}
            >
              Open Project...
            </button>
            <button 
              className="menu-item"
              onClick={handleSaveProject}
              disabled={!project}
            >
              Save
            </button>
            <button 
              className="menu-item"
              onClick={handleSaveAsProject}
              disabled={!project}
            >
              Save As...
            </button>
          </div>

          {/* Export Submenu */}
          <SubMenu
            label="Export"
            isOpen={openSubMenus.has('export')}
            onToggle={() => toggleSubMenu('export')}
          >
            <button 
              className="submenu-item"
              onClick={handleExportPNG}
              disabled={!project}
            >
              Export as PNG
            </button>
            <button 
              className="submenu-item"
              onClick={handleExportSVG}
              disabled={!project}
            >
              Export as SVG
            </button>
            <button 
              className="submenu-item"
              onClick={handleExportPDF}
              disabled={!project}
            >
              Export as PDF
            </button>
            <button 
              className="submenu-item"
              onClick={handleExportJSON}
              disabled={!project}
            >
              Export as JSON
            </button>
          </SubMenu>

          {/* Recent Projects Submenu */}
          <SubMenu
            label="Recent Projects"
            isOpen={openSubMenus.has('recent')}
            onToggle={() => toggleSubMenu('recent')}
          >
            <div className="recent-projects-list">
              <div className="no-recent-projects">
                No recent projects
              </div>
            </div>
          </SubMenu>

          {/* Project Info */}
          {project && (
            <div className="menu-section">
              <div className="menu-info">
                <div className="info-label">Project:</div>
                <div className="info-value">{project.name}</div>
              </div>
              <div className="menu-info">
                <div className="info-label">Pages:</div>
                <div className="info-value">{project.pages.length}</div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FileMenu; 