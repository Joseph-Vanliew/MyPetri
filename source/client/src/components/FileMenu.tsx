import React, { useState, useRef, useEffect } from 'react';
import { PetriNetDTO } from '../types';

interface FileMenuProps {
  petriNetData: PetriNetDTO | null;
  onImport: (data: PetriNetDTO) => void;
  onSaveAs?: () => void;
  highlightTitle?: () => void;
}

export const FileMenu: React.FC<FileMenuProps> = ({ petriNetData, onImport, onSaveAs, highlightTitle }) => {
  const [isOpen, setIsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const isSaveDisabled = !petriNetData;

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const handleImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
    setIsOpen(false);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const importedData = JSON.parse(content) as PetriNetDTO;
        
        // If the imported file doesn't have a title, use the filename (without extension)
        if (!importedData.title) {
          const filename = file.name.replace(/\.[^/.]+$/, ""); // Remove file extension
          importedData.title = filename;
        }
        
        onImport(importedData);
      } catch (error) {
        console.error('Error parsing imported file:', error);
        alert('Invalid file format or structure. Please select a valid .pats or .json file.');
      }
    };
    reader.readAsText(file);
    
    // Reset the input so the same file can be imported again
    if (event.target) {
      event.target.value = '';
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSaveClick = () => {
    if (isSaveDisabled || !onSaveAs) {
      console.warn("Save As not possible: No data or handler.");
      return;
    }

    const pageTitle = petriNetData?.title;

    const isDefaultPageTitle = pageTitle && /^Page \d+$/.test(pageTitle);

    if (highlightTitle && isDefaultPageTitle) {
      highlightTitle();
      setIsOpen(false);
      return;
    } 

    onSaveAs();
    setIsOpen(false);
  };

  return (
    <div className="file-menu" style={{ position: 'relative' }} ref={menuRef}>
      <div 
        onClick={toggleMenu}
        style={{
          padding: '6px 12px',
          color: '#f0f0f0',
          cursor: 'pointer',
          fontWeight: isOpen ? 'bold' : 'normal',
          backgroundColor: isOpen ? '#444' : 'transparent',
          borderRadius: '3px',
          transition: 'background-color 0.2s ease',
          fontSize: '16px',
          letterSpacing: '0.5px'
        }}
        onMouseOver={(e) => !isOpen && (e.currentTarget.style.backgroundColor = '#333')}
        onMouseOut={(e) => !isOpen && (e.currentTarget.style.backgroundColor = 'transparent')}
        title="File operations"
      >
        File
      </div>
      
      {isOpen && (
        <div 
          className="dropdown-menu"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            backgroundColor: '#333',
            border: '1px solid #555',
            borderRadius: '4px',
            zIndex: 1000,
            minWidth: '160px',
            boxShadow: '0 4px 8px rgba(0,0,0,0.3)'
          }}
        >
          <div 
            onClick={handleImportClick}
            style={{
              padding: '10px 14px',
              cursor: 'pointer',
              color: 'white',
              transition: 'background-color 0.2s ease',
              fontSize: '15px'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#444'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            title="Import a Petri net from a file"
          >
            Import...
          </div>
          <div 
            onClick={handleSaveClick}
            style={{
              padding: '10px 14px',
              cursor: isSaveDisabled ? 'not-allowed' : 'pointer',
              color: isSaveDisabled ? '#888' : 'white',
              backgroundColor: isSaveDisabled ? '#333' : 'transparent',
              transition: 'background-color 0.2s ease',
              fontSize: '15px'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#444'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            title="Save the current Petri net to a file"
          >
            Save As...
          </div>
        </div>
      )}
      
      {/* Hidden file input for import */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".pats,.json,application/json"
        style={{ display: 'none' }}
      />
    </div>
  );
}; 