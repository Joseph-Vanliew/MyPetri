import React, { useState, useRef, useEffect } from 'react';
import { PetriNetDTO, ProjectDTO } from '../types';
// Remove API_ENDPOINTS import if no longer needed after removing handleValidate
// import { API_ENDPOINTS } from '../utils/api';

interface MenuBarProps {
  projectData: ProjectDTO | null;
  onImport: (data: PetriNetDTO) => void;
  highlightTitle: () => void;
  // New handlers for project/page operations
  onOpenProject: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onSaveProject: () => void;
  onSaveProjectAs: () => void;
  onImportPages: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onExportActivePage: () => void;
  onExportProject: () => void; // Added for completeness, maps to onSaveProjectAs for now
}

export function MenuBar({
  projectData: _projectData,
  onImport, 
  highlightTitle, 
  onOpenProject,
  onSaveProject,
  onSaveProjectAs,
  onImportPages,
  onExportActivePage,
  onExportProject
}: MenuBarProps) {
  const [showFileMenu, setShowFileMenu] = useState(false);
  const [showExportSubMenu, setShowExportSubMenu] = useState(false);
  // Add state for Import submenu if you create one
  // const [showImportSubMenu, setShowImportSubMenu] = useState(false);

  const fileMenuRef = useRef<HTMLDivElement>(null);
  const exportSubMenuRef = useRef<HTMLDivElement>(null);

  // Refs for file inputs to allow programmatic click
  const openProjectInputRef = useRef<HTMLInputElement>(null);
  const importPagesInputRef = useRef<HTMLInputElement>(null);
  const legacyImportInputRef = useRef<HTMLInputElement>(null);

  const toggleFileMenu = () => setShowFileMenu(!showFileMenu);
  const toggleExportSubMenu = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent file menu from closing
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
  }, [fileMenuRef]); // Dependency array ensures this runs once

  return (
    <div className="menu-bar">
      <div ref={fileMenuRef} style={{ position: 'relative' }}>
        <div className="menu-item" onClick={toggleFileMenu}>
          File
        </div>
        {showFileMenu && (
          <div className="dropdown-menu">
            <div className="menu-item" onClick={() => openProjectInputRef.current?.click()}>Open Project...</div>
            <input type="file" ref={openProjectInputRef} style={{ display: 'none' }} accept=".petri,.pats,.json" onChange={(e) => { onOpenProject(e); setShowFileMenu(false); }} />
            
            <div className="menu-item-separator"></div>
            
            <div className="menu-item" onClick={() => { onSaveProject(); setShowFileMenu(false); }}>Save Project</div>
            <div className="menu-item" onClick={() => { onSaveProjectAs(); setShowFileMenu(false); }}>Save Project As...</div>
            
            <div className="menu-item-separator"></div>
            
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
            
            <div className="menu-item" onClick={() => { highlightTitle(); setShowFileMenu(false); }}>Edit Project Title</div>
            
            {/* Legacy Import Option */}
            <div className="menu-item-separator"></div>
            <div className="menu-item" onClick={() => legacyImportInputRef.current?.click()}>Import Legacy Petri File</div>
            <input type="file" ref={legacyImportInputRef} style={{ display: 'none' }} accept=".json,.pats" onChange={handleLegacyFileOpen} />

          </div>
        )}
      </div>
      {/* Other top-level menus like Edit, View can be added here */}
    </div>
  );
} 