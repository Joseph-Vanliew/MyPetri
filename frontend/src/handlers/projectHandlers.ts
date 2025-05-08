import React from 'react';
import { ProjectDTO, PetriNetPageData, UIPlace, UITransition, UIArc, PetriNetDTO as LegacyPetriNetDTO } from '../types'; // Assuming types.ts is in src

// Interface for arguments needed by project handlers
export interface ProjectHandlerArgs {
  // State
  projectTitle: string;
  pages: Record<string, PetriNetPageData>;
  pageOrder: string[];
  activePageId: string | null;
  projectFileHandle: FileSystemFileHandle | null;

  // State Setters
  setProjectTitle: (title: string) => void;
  setPages: React.Dispatch<React.SetStateAction<Record<string, PetriNetPageData>>>;
  setPageOrder: React.Dispatch<React.SetStateAction<string[]>>;
  setActivePageId: React.Dispatch<React.SetStateAction<string | null>>;
  setProjectFileHandle: React.Dispatch<React.SetStateAction<FileSystemFileHandle | null>>;
  setHasUnsavedChanges: React.Dispatch<React.SetStateAction<boolean>>;

  // Other Functions/Callbacks from App
  setCurrentFiredTransitions: React.Dispatch<React.SetStateAction<string[]>>;
  clearClipboard: () => void;
  // Potentially other dependencies like API endpoints if needed
}

// ===== FILE UTILITY FUNCTIONS (Moved here for now) =====
const downloadJSON = (data: object, filename: string) => {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(href);
};

const readJSONFile = (file: File): Promise<any> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                if (event.target?.result) {
                    const parsed = JSON.parse(event.target.result as string);
                    resolve(parsed);
                } else {
                    reject(new Error("File reading resulted in null."));
                }
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = (error) => reject(error);
        reader.readAsText(file);
    });
};


// ===== DATA PROCESSING HANDLER (Moved here) =====
// This might need further thought if it's used outside project load/import
export const processLoadedData = (
    args: ProjectHandlerArgs,
    pageToLoad: Partial<PetriNetPageData>,
    sourceTitle?: string
) => {
    const { pages, pageOrder, setPages, setPageOrder, setActivePageId, setCurrentFiredTransitions, setHasUnsavedChanges } = args;
    const newPageId = pageToLoad.id || `page_${Date.now()}`;
    
    const loadedPlaces: UIPlace[] = (pageToLoad.places || []).map(place => ({ 
        id: place.id || `place_${Date.now()}_${newPageId}`, 
        name: place.name || '', tokens: place.tokens || 0,
        x: place.x ?? Math.random() * 500 + 100, y: place.y ?? Math.random() * 300 + 100,
        radius: place.radius ?? 46, bounded: place.bounded ?? false, capacity: place.capacity ?? null
    }));
    const loadedTransitions: UITransition[] = (pageToLoad.transitions || []).map(transition => ({ 
         id: transition.id || `trans_${Date.now()}_${newPageId}`, 
        name: transition.name || '', enabled: transition.enabled ?? false, arcIds: transition.arcIds || [], 
         x: transition.x ?? Math.random() * 500 + 200, y: transition.y ?? Math.random() * 300 + 200, 
        width: transition.width ?? 120, height: transition.height ?? 54
    }));
    const loadedArcs: UIArc[] = (pageToLoad.arcs || []).map(arc => ({ 
         id: arc.id || `arc_${Date.now()}_${newPageId}`, 
         type: arc.type ?? 'REGULAR', 
        incomingId: arc.incomingId, outgoingId: arc.outgoingId
    }));

    const newPageData: PetriNetPageData = {
        id: newPageId,
        title: pageToLoad.title || sourceTitle || `Page ${pageOrder.length + 1}`, 
        places: loadedPlaces, transitions: loadedTransitions, arcs: loadedArcs,
        deterministicMode: pageToLoad.deterministicMode ?? false, 
        conflictResolutionMode: pageToLoad.conflictResolutionMode ?? false, 
        conflictingTransitions: pageToLoad.conflictingTransitions || [], 
        selectedElements: pageToLoad.selectedElements || [], 
        history: pageToLoad.history || { places: [], transitions: [], arcs: [], title: [] }, 
        zoomLevel: pageToLoad.zoomLevel ?? 1, 
        panOffset: pageToLoad.panOffset ?? { x: -750, y: -421.875 } 
    };
    
    setPages(prevPages => ({ ...prevPages, [newPageId]: newPageData })); 
    // Only add to pageOrder if it's a truly new page ID
    if (!Object.keys(pages).includes(newPageId)) {
         setPageOrder(prevOrder => [...prevOrder, newPageId]); 
    }
    setActivePageId(newPageId);
    setCurrentFiredTransitions([]);
    setHasUnsavedChanges(true); // Data processed, mark as dirty relative to last save
};


// ===== SAVE/LOAD/IMPORT/EXPORT HANDLERS =====

export const handleOpenProject = async (
    args: ProjectHandlerArgs,
    event?: React.ChangeEvent<HTMLInputElement>
) => {
    const { setProjectTitle, setPages, setPageOrder, setActivePageId, setProjectFileHandle, setHasUnsavedChanges, setCurrentFiredTransitions, clearClipboard } = args;

    let fileToProcess: File | null = null;
    let fileHandleToStore: FileSystemFileHandle | null = null;

    // Determine the file source (FSA or fallback input)
    if (event && event.target && event.target.files && event.target.files[0]) { // Fallback
        fileToProcess = event.target.files[0];
        if(event.target) event.target.value = ''; // Clear input
    } else if ('showOpenFilePicker' in window) { // FSA API
        try {
            const [handle] = await window.showOpenFilePicker({
                types: [{ description: 'Petri Net Projects', accept: { 'application/json': ['.petri', '.pats', '.json'] } }],
                excludeAcceptAllOption: true, multiple: false,
            });
            fileToProcess = await handle.getFile();
            fileHandleToStore = handle;
        } catch (error: any) {
            if (error.name !== 'AbortError') {
                console.error("FSA open picker error:", error);
                alert(`Failed to open: ${error.message}`);
            }
            return; // Exit if cancelled or error
        }
    } else {
        console.error("File open: No method available.");
        alert("File open functionality is not available.");
        return;
    }

    // Process the selected file
    if (!fileToProcess) return;

    try {
        const contents = await fileToProcess.text();
        const projectData = JSON.parse(contents) as ProjectDTO;
        
        // Basic validation
        if (!projectData || typeof projectData.projectTitle !== 'string' || !projectData.pages || !projectData.pageOrder) {
          throw new Error('Invalid project file format.');
        }

        // Update App state
        setProjectTitle(projectData.projectTitle || fileToProcess.name.replace(/\.[^/.]+$/, ""));
        setPages(projectData.pages || {}); // Provide default empty pages if missing
        setPageOrder(projectData.pageOrder || []); // Provide default empty order if missing
        setActivePageId(projectData.activePageId || (projectData.pageOrder?.[0] ?? null)); // Set active or null
        setProjectFileHandle(fileHandleToStore); // Store FSA handle if we got one
        setCurrentFiredTransitions([]);
        clearClipboard(); 
        setHasUnsavedChanges(false); // Project loaded, it's now in a saved state

    } catch (error: any) {
        console.error("Error processing project file:", error);
        alert(`Failed to open project file: ${error.message}`);
        setProjectFileHandle(null); // Clear handle on error
    }
};

// Common save logic used by Save and Save As
const commonSaveFlow = async (
    args: ProjectHandlerArgs,
    projectDataToSave: ProjectDTO,
    existingHandle: FileSystemFileHandle | null,
    forceSaveAs = false
): Promise<FileSystemFileHandle | null> => {
    const { setHasUnsavedChanges, setProjectTitle } = args; 
    const projectJsonString = JSON.stringify(projectDataToSave, null, 2);
    const suggestedName = projectDataToSave.projectTitle.replace(/\.[^/.]+$/, "").replace(/[^a-z0-9_\-\s]/gi, '_').replace(/\s+/g, '-') + '.petri' || 'project.petri';
    
    let success = false;
    let usedHandle: FileSystemFileHandle | null = null;

    // 1. Try direct save if handle exists and not forcing Save As
    if (!forceSaveAs && existingHandle && 'createWritable' in existingHandle) {
        try {
            const writable = await existingHandle.createWritable();
            await writable.write(projectJsonString);
            await writable.close();
            success = true;
            usedHandle = existingHandle;
            console.log('Project saved successfully using existing handle.');
        } catch (error) {
            console.warn('Failed to save with existing handle, trying Save As:', error);
        }
    }

    // 2. Try FSA Save As if direct save failed or forced
    if (!success && 'showSaveFilePicker' in window) {
        try {
            const newHandle = await window.showSaveFilePicker({ suggestedName, types: [{ description: 'Petri Net Project', accept: { 'application/json': ['.petri'] } }] });
            const writable = await newHandle.createWritable();
            await writable.write(projectJsonString);
            await writable.close();
            success = true;
            usedHandle = newHandle;
            if (newHandle.name && newHandle.name.endsWith('.petri')) {
                const newTitle = newHandle.name.replace(/\.petri$/, '');
                if (newTitle !== projectDataToSave.projectTitle) {
                     setProjectTitle(newTitle); 
                }
            }
            console.log('Project saved successfully via Save As (FSA).');
        } catch (error: any) {
            if (error.name === 'AbortError') return existingHandle;
            console.error("FSA Save As error:", error); alert(`Save As failed: ${error.message}`); throw error; 
        }
    } 
    // 3. Fallback to download
    else if (!success) { 
        console.warn("FSA not supported or Save As failed, falling back to download for save.");
        downloadJSON(projectDataToSave, suggestedName);
        success = true; 
        usedHandle = null; 
    }

    // Update saved state if successful
    if (success) {
         setHasUnsavedChanges(false); // Mark as saved
    }
    return usedHandle ?? null;
};


export const handleSaveProjectAs = async (args: ProjectHandlerArgs) => {
    const { projectTitle, pages, pageOrder, activePageId, setProjectFileHandle } = args;
    const projectDataToSave: ProjectDTO = { projectTitle, pages, pageOrder, activePageId, version: '1.0.0' }; 
    try {
        const newHandle = await commonSaveFlow(args, projectDataToSave, null, true); 
        setProjectFileHandle(newHandle);
    } catch (error:any) { /* Error logged in commonSaveFlow */ }
};
    
export const handleSaveProject = async (args: ProjectHandlerArgs) => {
    const { projectTitle, pages, pageOrder, activePageId, projectFileHandle, setProjectFileHandle } = args;
    const projectDataToSave: ProjectDTO = { projectTitle, pages, pageOrder, activePageId, version: '1.0.0' };
    try {
        const newOrExistingHandle = await commonSaveFlow(args, projectDataToSave, projectFileHandle, false); 
        setProjectFileHandle(newOrExistingHandle);
    } catch (error:any) { /* Error logged in commonSaveFlow */ }
};


export const handleImportPages = async (
    args: ProjectHandlerArgs,
    event: React.ChangeEvent<HTMLInputElement>
) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    let processedAny = false;
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
            const pageData = await readJSONFile(file) as PetriNetPageData; // Use local utility
            // Basic validation for a page file
            if (!pageData || typeof pageData.id !== 'string' || typeof pageData.title !== 'string' ) { // More robust check
                console.warn(`Skipping file ${file.name}: Invalid page file format.`);
                continue;
            }
            // Ensure imported page ID is unique if it clashes
            let newPageId = pageData.id;
            let counter = 1;
            while (args.pages[newPageId]) { // Check against current pages from args
                newPageId = `${pageData.id}_imported_${counter++}`;
            }
            const pageDataWithNewGuid = {...pageData, id: newPageId};

            // Call processLoadedData (now local to this module or passed in args if needed elsewhere)
            processLoadedData(args, pageDataWithNewGuid, file.name.replace(/\.page\.json$|\.json$/, ''));
            processedAny = true;
        } catch (error) {
            console.error(`Error importing page ${file.name}:`, error);
            alert(`Failed to import page ${file.name}.`);
        }
    }
    // Reset file input value
    if (event.target) event.target.value = '';
    // setHasUnsavedChanges is handled by processLoadedData if successful
};

// Kept for legacy compatibility if needed
export const handleLegacyImport = (
    args: ProjectHandlerArgs,
    importedData: LegacyPetriNetDTO // Use specific type from types.ts
) => {
     // Create a structure that processLoadedData can understand
    const partialPageData: Partial<PetriNetPageData> = {
        title: importedData.title,
        places: importedData.places.map(p => ({ ...p, name: p.name || '', x: p.x ?? Math.random() * 500 + 100, y: p.y ?? Math.random() * 300 + 100, radius: p.radius ?? 46, bounded: p.bounded ?? false, capacity: p.capacity ?? null })), 
        transitions: importedData.transitions.map(t => ({ ...t, name: t.name || '', x: t.x ?? Math.random() * 500 + 200, y: t.y ?? Math.random() * 300 + 200, width: t.width ?? 120, height: t.height ?? 54 })), 
        arcs: importedData.arcs.map(a => ({ id: a.id, type: a.type ?? 'REGULAR', incomingId: a.incomingId, outgoingId: a.outgoingId })),
        deterministicMode: importedData.deterministicMode,
    };
    processLoadedData(args, partialPageData, "Imported Page");
    // setHasUnsavedChanges is handled by processLoadedData
};


// Note: handleExportActivePage was previously inline in MenuBar props.
// It needs to be a proper function now if extracted.
export const handleExportActivePage = (args: ProjectHandlerArgs) => {
    const { activePageId, pages } = args;
    if (!activePageId || !pages[activePageId]) {
        alert("No active page to export.");
        return;
    }
    const activePageData = pages[activePageId];
    const filename = activePageData.title.replace(/[^a-z0-9_\-\s]/gi, '_').replace(/\s+/g, '-') + '.page.json' || 'page.page.json';
    downloadJSON(activePageData, filename); // Use local utility
    // Exporting doesn't change saved state
}; 