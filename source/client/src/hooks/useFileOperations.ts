import { useCallback } from 'react';
import { PetriNetDTO, PetriNetPageData, ProjectDTO } from '../types';
import { downloadJSON, readJSONFile } from '../utils/petriNetUtils';

interface UseFileOperationsProps {
  projectTitle: string;
  pages: Record<string, PetriNetPageData>;
  pageOrder: string[];
  activePageId: string | null;
  setProjectTitle: (title: string) => void;
  setPages: React.Dispatch<React.SetStateAction<Record<string, PetriNetPageData>>>;
  setPageOrder: React.Dispatch<React.SetStateAction<string[]>>;
  setActivePageId: React.Dispatch<React.SetStateAction<string | null>>;
  setCurrentFiredTransitions: (transitions: string[]) => void;
  setProjectHasUnsavedChanges: (hasChanges: boolean) => void;
  setProjectFileHandle: (handle: FileSystemFileHandle | null) => void;
  setOriginalFileNameFromInput?: (filename: string | null) => void;
  clearClipboard: () => void;
  activePageData: PetriNetPageData | null;
  handleCreatePageWithData: (pageData: PetriNetPageData) => void;
}

export const useFileOperations = ({
  projectTitle,
  pages,
  pageOrder,
  activePageId,
  setProjectTitle,
  setPages,
  setPageOrder,
  setActivePageId,
  setCurrentFiredTransitions,
  setProjectHasUnsavedChanges,
  setProjectFileHandle,
  setOriginalFileNameFromInput,
  clearClipboard,
  activePageData,
  handleCreatePageWithData
}: UseFileOperationsProps) => {
  
  // =========================================================================================
  // SAVE OPERATIONS
  // =========================================================================================
  
  const handleSaveProjectAs = useCallback(async (suggestedFilename?: string) => {
    const filenameToSuggest = suggestedFilename || `${projectTitle.replace(/\s+/g, '_')}.petri`;

    const projectDataToSave: ProjectDTO = {
      projectTitle: projectTitle,
      pages: pages,
      pageOrder: pageOrder,
      activePageId: activePageId,
      version: '1.0.0' 
    };

    // FSA API Branch
    if ('showSaveFilePicker' in window) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: filenameToSuggest,
          types: [
            {
              description: 'Petri Net Project',
              accept: {
                'application/json': ['.petri'],
              },
            },
          ],
        });
        
        setProjectFileHandle(handle); // Store the handle for future Saves
        const writable = await handle.createWritable();
        await writable.write(JSON.stringify(projectDataToSave, null, 2));
        await writable.close();
        
        // Update projectTitle state if user saved with a different name
        if (handle.name && handle.name !== filenameToSuggest && handle.name.endsWith('.petri')) {
          const newTitle = handle.name.replace(/\.petri$/, '');
          if (newTitle !== projectTitle) {
            setProjectTitle(newTitle);
          }
        }
        
        console.log("Project saved successfully as new file with File System Access API");
        setProjectHasUnsavedChanges(false); 
        setOriginalFileNameFromInput?.(null); 
        
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          console.error("Error saving file with FSA API:", error);
          alert(`Failed to save project file: ${error.message}`);
        }
      }
    }
    // Fallback Branch (Download)
    else {
      console.warn("FSA API not supported, falling back to download.");
      setProjectFileHandle(null); 
      downloadJSON(projectDataToSave, filenameToSuggest);
      setProjectHasUnsavedChanges(false);
      setOriginalFileNameFromInput?.(null);
    }
  }, [projectTitle, pages, pageOrder, activePageId, setProjectFileHandle, setProjectTitle, setProjectHasUnsavedChanges, setOriginalFileNameFromInput]);

  const handleSaveProject = useCallback(async () => {
    // This would need to be passed from the parent component
    // For now, we'll just call Save As
    await handleSaveProjectAs();
  }, [handleSaveProjectAs]);

  const handleExportActivePage = useCallback((suggestedFilename?: string) => {
    if (!activePageData) {
      alert("No active page to export.");
      return;
    }
    const filename = suggestedFilename || activePageData.title.replace(/[^a-z0-9_\-\s]/gi, '_').replace(/\s+/g, '-') + '.page.json' || 'page.page.json';
    downloadJSON(activePageData, filename); // Exporting the full PetriNetPageData
  }, [activePageData]);

  // =========================================================================================
  // LOAD OPERATIONS
  // =========================================================================================
  
  const handleOpenProject = useCallback(async (event?: React.ChangeEvent<HTMLInputElement>) => {
    // Fallback Branch: Executed if an event is provided (meaning called from input element)
    if (event && event.target && event.target.files && event.target.files[0]) {
      setProjectFileHandle(null); // Cannot get a persistent handle via input
      const file = event.target.files[0];
      try {
        const contents = await file.text();
        const projectData = JSON.parse(contents) as ProjectDTO;
        
        if (!projectData || typeof projectData.projectTitle !== 'string' || !projectData.pages || !projectData.pageOrder) {
          throw new Error('Invalid project file format.');
        }

        setProjectTitle(projectData.projectTitle || file.name.replace(/\.[^/.]+$/, ""));
        setPages(projectData.pages || {});
        setPageOrder(projectData.pageOrder || []);
        setActivePageId(projectData.activePageId || (projectData.pageOrder?.[0] ?? null));
        setCurrentFiredTransitions([]);
        clearClipboard(); 
        setProjectHasUnsavedChanges(false); // Freshly opened project is considered saved
        setOriginalFileNameFromInput?.(file.name); // Store the original file name

      } catch (error: any) {
        console.error("Error opening project from input:", error);
        alert(`Failed to open project file: ${error.message}`);
        setProjectFileHandle(null); 
        setOriginalFileNameFromInput?.(null);
      }
      // Reset file input value
      if (event.target) event.target.value = '';
    }
    // FSA API Branch: Executed if no event is provided AND API is available
    else if ('showOpenFilePicker' in window) {
      try {
        const [handle] = await window.showOpenFilePicker({
          types: [
            {
              description: 'Petri Net Projects',
              accept: {
                'application/json': ['.petri', '.pats', '.json']
              }
            },
          ],
          excludeAcceptAllOption: true,
          multiple: false,
        });

        setProjectFileHandle(handle); // Store the handle
        const file = await handle.getFile();
        const contents = await file.text();
        const projectData = JSON.parse(contents) as ProjectDTO;

        if (!projectData || typeof projectData.projectTitle !== 'string' || !projectData.pages || !projectData.pageOrder) {
          throw new Error('Invalid project file format.');
        }

        setProjectTitle(projectData.projectTitle || file.name.replace(/\.[^/.]+$/, ""));
        setPages(projectData.pages || {});
        setPageOrder(projectData.pageOrder || []);
        setActivePageId(projectData.activePageId || (projectData.pageOrder?.[0] ?? null));
        setCurrentFiredTransitions([]);
        clearClipboard(); 
        setProjectHasUnsavedChanges(false); // Freshly opened project is considered saved
        setOriginalFileNameFromInput?.(null); // Clear any original file name from input

      } catch (error: any) {
         if (error.name !== 'AbortError') {
           console.error("Error opening file with FSA API:", error);
           alert(`Failed to open project file: ${error.message}`);
         }
         setProjectFileHandle(null); // Clear handle on any FSA error/cancel
         setOriginalFileNameFromInput?.(null); // Clear original file name on any FSA error/cancel
      }
    } 
    // Error Case: No event, and FSA API not supported.
    // This shouldn't be reached if MenuBar logic is correct.
    else {
      console.error("handleOpenProject: FSA not available and no input event provided. This indicates an issue in the calling logic (e.g., MenuBar).");
      alert("File open functionality is not available. Your browser might be outdated or not support this feature.");
    }
  }, [setProjectFileHandle, setProjectTitle, setPages, setPageOrder, setActivePageId, setCurrentFiredTransitions, clearClipboard, setProjectHasUnsavedChanges, setOriginalFileNameFromInput]);

  const handleImportPages = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    let changesMade = false;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const pageData = await readJSONFile(file) as PetriNetPageData;
        // Basic validation for a page file
        if (!pageData || !pageData.id || !pageData.title) { // Check for essential fields
          console.warn(`Skipping file ${file.name}: Invalid page file format.`);
          continue;
        }
        // Ensure imported page ID is unique if it clashes with an existing one
        let newPageId = pageData.id;
        let counter = 1;
        while (pages[newPageId]) {
          newPageId = `${pageData.id}_imported_${counter++}`;
        }
        const pageDataWithNewGuid = {...pageData, id: newPageId};

        handleCreatePageWithData(pageDataWithNewGuid);
        changesMade = true;
      } catch (error) {
        console.error(`Error importing page ${file.name}:`, error);
        alert(`Failed to import page ${file.name}.`);
      }
    }
    event.target.value = '';
    if (changesMade) {
      setProjectHasUnsavedChanges(true); // Importing pages marks project as having unsaved changes
    }
  }, [pages, handleCreatePageWithData, setProjectHasUnsavedChanges]);

  const handleLegacyImport = useCallback((importedData: PetriNetDTO) => {
    const partialPageData: Partial<PetriNetPageData> = {
      id: `imported_${Date.now()}`,
      title: importedData.title || 'Imported Page',
      places: importedData.places?.map(p => ({
        id: p.id,
        tokens: p.tokens || 0,
        name: p.name || '',
        x: p.x || 0,
        y: p.y || 0,
        radius: p.radius || 46,
        bounded: p.bounded || false,
        capacity: p.capacity || null
      })) || [],
      transitions: importedData.transitions?.map(t => ({
        id: t.id,
        enabled: t.enabled || false,
        arcIds: t.arcIds || [],
        name: t.name || '',
        x: t.x || 0,
        y: t.y || 0,
        width: t.width || 120,
        height: t.height || 54
      })) || [],
      arcs: importedData.arcs?.map(a => ({
        id: a.id,
        type: a.type,
        incomingId: a.incomingId,
        outgoingId: a.outgoingId
      })) || [],
      deterministicMode: importedData.deterministicMode || false,
      conflictResolutionMode: false,
      conflictingTransitions: [],
      selectedElements: [],
      history: { places: [], transitions: [], arcs: [], textBoxes: [], title: [] },
      zoomLevel: importedData.zoomLevel ?? 1,
      panOffset: importedData.panOffset ?? { x: -750, y: -421.875 }
    };
    handleCreatePageWithData(partialPageData as PetriNetPageData);
  }, [handleCreatePageWithData]);

  // =========================================================================================
  // SNAPSHOT OPERATIONS
  // =========================================================================================
  
  const handleSaveSnapshot = useCallback(() => {
    if (!activePageId || !activePageData) {
      console.log("No active page to snapshot.");
      return;
    }

    setPages(prevPages => {
      const currentPage = prevPages[activePageId!];
      if (!currentPage) return prevPages;

      // Create snapshot of current simulation state
      const snapshot = {
        places: JSON.parse(JSON.stringify(currentPage.places)),
        transitions: JSON.parse(JSON.stringify(currentPage.transitions)),
        arcs: JSON.parse(JSON.stringify(currentPage.arcs)),
        timestamp: Date.now(),
        description: `Snapshot taken at ${new Date().toLocaleString()}`
      };

      return {
        ...prevPages,
        [activePageId!]: {
          ...currentPage,
          snapshot
        }
      };
    });
    setProjectHasUnsavedChanges(true);
  }, [activePageId, activePageData, setPages, setProjectHasUnsavedChanges]);

  const handleRestoreSnapshot = useCallback(() => {
    if (!activePageId || !activePageData || !activePageData.snapshot) {
      console.log("No snapshot to restore.");
      return;
    }

    setPages(prevPages => {
      const currentPage = prevPages[activePageId!];
      if (!currentPage || !currentPage.snapshot) return prevPages;

      return {
        ...prevPages,
        [activePageId!]: {
          ...currentPage,
          places: currentPage.snapshot.places,
          transitions: currentPage.snapshot.transitions,
          arcs: currentPage.snapshot.arcs,
          snapshot: undefined // Clear the snapshot after restoring
        }
      };
    });
    setProjectHasUnsavedChanges(true);
  }, [activePageId, activePageData, setPages, setProjectHasUnsavedChanges]);

  return {
    // Save operations
    handleSaveProject,
    handleSaveProjectAs,
    handleExportActivePage,
    
    // Load operations
    handleOpenProject,
    handleImportPages,
    handleLegacyImport,
    
    // Snapshot operations
    handleSaveSnapshot,
    handleRestoreSnapshot,
  };
}; 