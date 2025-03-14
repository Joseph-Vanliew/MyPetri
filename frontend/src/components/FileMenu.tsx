import React, { useState, useRef, useEffect } from 'react';
import { PetriNetDTO } from '../types';

interface FileMenuProps {
  petriNetData: PetriNetDTO;
  onImport: (data: PetriNetDTO) => void;
  onSaveAs?: () => void;
  highlightTitle?: () => void;
}

export const FileMenu: React.FC<FileMenuProps> = ({ petriNetData, onImport, onSaveAs, highlightTitle }) => {
  const [isOpen, setIsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const handleSave = () => {
    // Check if the title is the default and prompt for editing if it is
    if (petriNetData.title === "Untitled Petri Net" && highlightTitle) {
      highlightTitle();
      setIsOpen(false);
      return;
    }
    
    // Use the current title as the default filename instead of a date-based name
    const currentTitle = petriNetData.title || "Untitled Petri Net";
    
    // Prompt the user for a filename, pre-filled with the current title
    const filename = prompt('Enter a filename for your Petri net:', currentTitle);
    
    // If the user cancels the prompt or enters an empty string, abort the save
    if (!filename) return;
    
    // Add .pats extension
    const filenameWithExtension = filename.endsWith('.pats') ? filename : `${filename}.pats`;
    
    // Create a blob with the JSON data
    // Make sure to include the title in the saved data
    const dataToSave = {
      ...petriNetData,
      title: filename // Update the title to match the filename the user chose
    };
    
    const jsonString = JSON.stringify(dataToSave, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    
    // Create a download link and trigger it
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filenameWithExtension;
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setIsOpen(false);
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
        alert('Invalid file format. Please select a valid .pats file.');
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

  // Handle save with title check
  const handleSaveClick = () => {
    if (onSaveAs) {
      // Check if the title is the default and prompt for editing if it is
      if (petriNetData.title === "Untitled Petri Net" && highlightTitle) {
        highlightTitle();
        setIsOpen(false);
        return;
      }
      onSaveAs();
    } else {
      handleSave();
    }
  };

  return (
    <div className="file-menu" style={{ position: 'relative' }} ref={menuRef}>
      <div 
        onClick={toggleMenu}
        style={{
          padding: '6px 12px',
          color: 'ddd',
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
              cursor: 'pointer',
              color: 'white',
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
        accept=".pats,application/json"
        style={{ display: 'none' }}
      />
    </div>
  );
}; 