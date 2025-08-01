import React, { useState, useRef, useEffect } from 'react';
import { PetriNetDTO, ProjectDTO } from '../types';
import './styles/MenuBar.css';

interface MenuBarProps {
  projectData: ProjectDTO | null;
  onImport: (data: PetriNetDTO) => void;
  onOpenProject: (event?: React.ChangeEvent<HTMLInputElement>) => void;
  onSaveProject: () => void;
  onSaveProjectAs: () => void;
  onImportPages: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onExportActivePage: () => void;
  onExportProject: () => void;
  currentZoom: number;
  onZoomChange: (newZoom: number) => void;
  onCreatePage: () => void;
  projectFileHandle: FileSystemFileHandle | null;
  projectHasUnsavedChanges: boolean;
  onRenameProjectTitle: (newTitle: string) => void;
  onNewProject: () => void;
  onSaveSnapshot: () => void;
  onRestoreSnapshot: () => void;
  hasSnapshot: boolean;
  activePageTitle: string;
  showSavedIndicator?: boolean;
}

export function MenuBar({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  projectData: _projectData,
  onImport, 
  onOpenProject,
  onSaveProject,
  onSaveProjectAs,
  onImportPages,
  onExportActivePage,
  onExportProject,
  onCreatePage,
  projectHasUnsavedChanges,
  onNewProject,
  onSaveSnapshot,
  onRestoreSnapshot,
  hasSnapshot,
  activePageTitle,
  showSavedIndicator,
}: MenuBarProps) {
  const [showFileMenu, setShowFileMenu] = useState(false);
  const [showExportSubMenu, setShowExportSubMenu] = useState(false);

  const fileMenuRef = useRef<HTMLDivElement>(null);
  const exportSubMenuRef = useRef<HTMLDivElement>(null);

  const openProjectInputRef = useRef<HTMLInputElement>(null);
  const importPagesInputRef = useRef<HTMLInputElement>(null);
  const legacyImportInputRef = useRef<HTMLInputElement>(null);

  const toggleFileMenu = () => setShowFileMenu(!showFileMenu);
  const toggleExportSubMenu = (e: React.MouseEvent) => {
    e.stopPropagation(); 
    setShowExportSubMenu(!showExportSubMenu);
  };

  const handleLegacyFileOpen = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importedData = JSON.parse(e.target?.result as string) as PetriNetDTO;
          onImport(importedData); // Call the legacy onImport
        } catch (error) {
          console.error("Error parsing imported file:", error);
          alert("Failed to parse file. Please ensure it's a valid Petri net JSON.");
        }
      };
      reader.readAsText(file);
    }
    setShowFileMenu(false);
    if (event.target) event.target.value = ''; // Reset file input
  };

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (fileMenuRef.current && !fileMenuRef.current.contains(event.target as Node)) {
        setShowFileMenu(false);
        setShowExportSubMenu(false);
      }
    }
    // Add listener in the CAPTURE phase
    document.addEventListener("mousedown", handleClickOutside, true);
    // Cleanup: remove the listener
    return () => {
      document.removeEventListener("mousedown", handleClickOutside, true);
    };
  }, [fileMenuRef, setShowFileMenu, setShowExportSubMenu]);

  return (
    <div className="menu-bar">
      <div ref={fileMenuRef} style={{ position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center' }} className="menu-item" onClick={toggleFileMenu}>
          <span>File</span>
          <span 
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: projectHasUnsavedChanges ? '#FF1744' : '#76FF03',
              marginLeft: '8px',
              display: 'inline-block',
              boxShadow: '0 0 3px 1px rgba(0,0,0,0.2)'
            }}
            title={projectHasUnsavedChanges ? 'Unsaved changes' : 'All changes saved'}
          ></span>
        </div>
        {showFileMenu && (
          <div className="dropdown-menu">
            <div className="menu-item" onClick={() => { onNewProject(); setShowFileMenu(false); }}>New Project</div>
            
            <div className="menu-item" onClick={() => {
              if ('showOpenFilePicker' in window) {
                onOpenProject();
                setShowFileMenu(false);
              } else {
                openProjectInputRef.current?.click();
              }
            }}>Open Project...</div>
            <input type="file" ref={openProjectInputRef} style={{ display: 'none' }} accept=".petri,.pats,.json" onChange={(e) => { onOpenProject(e); setShowFileMenu(false); }} />
            
            
            
            <div className="menu-item" onClick={() => { onSaveProject(); setShowFileMenu(false); }}>Save Project</div>
            <div className="menu-item" onClick={() => { onSaveProjectAs(); setShowFileMenu(false); }}>Save Project As...</div>
            
           
            
            <div className="menu-item" onClick={() => importPagesInputRef.current?.click()}>Import Page(s)...</div>
            <input type="file" ref={importPagesInputRef} style={{ display: 'none' }} accept=".page.json,.json" multiple onChange={(e) => { onImportPages(e); setShowFileMenu(false); }} />
            
            <div className="menu-item" onClick={(e) => toggleExportSubMenu(e)} ref={exportSubMenuRef}>
              Export
              {showExportSubMenu && (
                <div className="dropdown-menu submenu">
                  <div className="menu-item" onClick={() => { onExportActivePage(); setShowExportSubMenu(false); setShowFileMenu(false); }}>Export Active Page...</div>
                  <div className="menu-item" onClick={() => { onExportProject(); setShowExportSubMenu(false); setShowFileMenu(false); }}>Export Project...</div>
                </div>
              )}
            </div>
            
            <div className="menu-item-separator"></div>
            
            <div className="menu-item" onClick={() => { onCreatePage(); setShowFileMenu(false); }}>Create New Page</div>
            
            {/* Legacy Import Option */}
            <div className="menu-item-separator"></div>
            <div className="menu-item" onClick={() => legacyImportInputRef.current?.click()}>Import Legacy Petri File</div>
            <input type="file" ref={legacyImportInputRef} style={{ display: 'none' }} accept=".json,.pats" onChange={handleLegacyFileOpen} />

          </div>
        )}
      </div>
      
      {/* Snapshot Controls */}
      <div className="controls">
        <button 
          className="menu-button save-button"
          onClick={onSaveSnapshot}
          title={`Save snapshot of ${activePageTitle}`}
        >
          <span className="icon">⧇</span>
        </button>
        
        <button 
          className="menu-button"
          onClick={onRestoreSnapshot}
          disabled={!hasSnapshot}
          title={hasSnapshot ? `Restore snapshot of ${activePageTitle}` : `No snapshot available for ${activePageTitle}`}
        >
          ↺
        </button>
        
        {showSavedIndicator && (
          <span className="saved-indicator">
            ✅ Saved
          </span>
        )}
      </div>
      
    </div>
  );
} 