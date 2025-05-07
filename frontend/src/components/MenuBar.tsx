import React from 'react';
import { FileMenu } from './FileMenu';
import { PetriNetDTO } from '../types';
// Remove API_ENDPOINTS import if no longer needed after removing handleValidate
// import { API_ENDPOINTS } from '../utils/api';

interface MenuBarProps {
  petriNetData: PetriNetDTO | null;
  onImport: (data: PetriNetDTO) => void;
  highlightTitle: () => void;
}

export const MenuBar: React.FC<MenuBarProps> = ({ petriNetData, onImport, highlightTitle }) => {
  // Remove fileInputRef, handleExport, handleValidate, handleOpenFileClick, handleFileChange

  const handleSave = () => {
    if (!petriNetData) {
        console.warn("Cannot save: No active Petri net data.");
        return; 
    }

    const pageTitle = petriNetData.title || "Untitled Page"; // Get title from DTO

    // Include zoom and pan from the DTO if they exist
    const dataToSave: PetriNetDTO = {
      ...petriNetData,
      title: pageTitle,
      zoomLevel: petriNetData.zoomLevel, // Directly from DTO
      panOffset: petriNetData.panOffset  // Directly from DTO
    };

    const jsonData = JSON.stringify(dataToSave, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;

    const sanitizedTitle = (pageTitle)
      .replace(/[^\w\s-]/g, '') 
      .trim()
      .replace(/\s+/g, '-') 
      .toLowerCase();

    a.download = `${sanitizedTitle || 'petri-net'}.pats`; // Fallback filename
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSaveAs = () => {
    if (!petriNetData) {
        console.warn("Cannot save as: No active Petri net data.");
        return; 
    }
    
    const pageTitle = petriNetData.title || "Untitled Page"; // Get title from DTO

    // Include zoom and pan from the DTO if they exist
    const dataToSave: PetriNetDTO = {
      ...petriNetData,
      title: pageTitle, 
      zoomLevel: petriNetData.zoomLevel, 
      panOffset: petriNetData.panOffset
    };

    const jsonData = JSON.stringify(dataToSave, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });

    const sanitizedTitle = (pageTitle)
      .replace(/[^\w\s-]/g, '') 
      .trim()
      .replace(/\s+/g, '-') 
      .toLowerCase();

    if ('showSaveFilePicker' in window) {
      const saveFile = async () => {
        try {
          // @ts-ignore
          const fileHandle = await window.showSaveFilePicker({
            suggestedName: `${sanitizedTitle || 'petri-net'}.pats`, // Fallback filename
            types: [{
              description: 'Petri Net Files',
              accept: { 'application/json': ['.pats'] }
            }]
          });

          // @ts-ignore
          const writable = await fileHandle.createWritable();
          // @ts-ignore
          await writable.write(blob);
          // @ts-ignore
          await writable.close();
        } catch (err: unknown) {
          // if user cancels the save dialog
          console.log('Save canceled or failed:', err);

          // Fall back to the traditional method
          if (err instanceof Error && err.name !== 'AbortError') {
            handleSave();
          }
        }
      };

      saveFile();
    } else {
      // Falling back to the traditional method for browsers that don't support the File System Access API
      handleSave();
    }
  };

  return (
    <div className="menu-bar" style={{
      display: 'flex',
      alignItems: 'center',
      padding: '6px 10px',
      backgroundColor: '#252525',
      borderBottom: '1px solid #4a4a4a',
      height: '36px'
    }}>
      {/* Render FileMenu and pass necessary props */}
      <FileMenu
        petriNetData={petriNetData}
        onImport={onImport}
        onSaveAs={handleSaveAs}
        highlightTitle={highlightTitle}
      />
      {/* Remove hidden input and buttons */}
    </div>
  );
}; 