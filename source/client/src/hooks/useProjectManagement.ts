import { useCallback } from 'react';
import { PetriNetPageData, ValidatorPageConfig } from '../types';

interface UseProjectManagementProps {
  pages: Record<string, PetriNetPageData>;
  setPages: React.Dispatch<React.SetStateAction<Record<string, PetriNetPageData>>>;
  pageOrder: string[];
  setPageOrder: React.Dispatch<React.SetStateAction<string[]>>;
  activePageId: string | null;
  setActivePageId: React.Dispatch<React.SetStateAction<string | null>>;
  setProjectHasUnsavedChanges: (hasChanges: boolean) => void;
  setCurrentFiredTransitions: (transitions: string[]) => void;
  saveToHistory: (pageDataToSave: PetriNetPageData) => void;
  defaultValidatorConfigs: ValidatorPageConfig;
}

export const useProjectManagement = ({
  pages,
  setPages,
  pageOrder,
  setPageOrder,
  activePageId,
  setActivePageId,
  setProjectHasUnsavedChanges,
  setCurrentFiredTransitions,
  saveToHistory,
  defaultValidatorConfigs
}: UseProjectManagementProps) => {
  
  // =========================================================================================
  // PROJECT OPERATIONS
  // =========================================================================================
  
  const handleNewProject = useCallback(() => {
    const baseUrl = window.location.origin + window.location.pathname;
    const newWindow = window.open(baseUrl, '_blank');
    
    if (newWindow) {
      newWindow.localStorage.removeItem('patsAppState_v1');
    }
  }, []);

  const handleSetDeterministicMode = useCallback((newValue: boolean) => {
    if (!activePageId || !pages[activePageId]) return;

    setPages(prevPages => {
      const currentPage = prevPages[activePageId!];
      let updatedConflictMode = currentPage.conflictResolutionMode;
      let updatedConflictingTransitions = currentPage.conflictingTransitions;

      if (!newValue && currentPage.conflictResolutionMode) {
        updatedConflictMode = false;
        updatedConflictingTransitions = [];
      }

      return {
        ...prevPages,
        [activePageId!]: { 
          ...currentPage, 
          deterministicMode: newValue,
          conflictResolutionMode: updatedConflictMode,
          conflictingTransitions: updatedConflictingTransitions
        }
      };
    });
    setProjectHasUnsavedChanges(true);
  }, [activePageId, pages, setPages, setProjectHasUnsavedChanges]);

  const handleUpdateValidatorConfigs = useCallback((pageId: string, newConfigs: Partial<ValidatorPageConfig>) => {
    setPages(prevPages => {
      if (!prevPages[pageId]) {
        console.warn(`Attempted to update validator configs for non-existent page: ${pageId}`);
        return prevPages;
      }
      const currentPageData = prevPages[pageId];
      const currentValidatorConfigs = currentPageData.validatorConfigs || { ...defaultValidatorConfigs };
      
      const updatedConfigs: ValidatorPageConfig = { 
        ...currentValidatorConfigs, 
        ...newConfigs 
      };

      if (JSON.stringify(currentValidatorConfigs) === JSON.stringify(updatedConfigs)) {
        return prevPages;
      }

      return {
        ...prevPages,
        [pageId]: {
          ...currentPageData,
          validatorConfigs: updatedConfigs
        }
      };
    });
    setProjectHasUnsavedChanges(true);
  }, [setPages, defaultValidatorConfigs, setProjectHasUnsavedChanges]);

  const onValidatorConfigsChangeCallback = useCallback((updatedConfigParts: Partial<ValidatorPageConfig>) => {
    if (activePageId) {
      handleUpdateValidatorConfigs(activePageId, updatedConfigParts);
    }
  }, [activePageId, handleUpdateValidatorConfigs]);

  // =========================================================================================
  // PAGE OPERATIONS
  // =========================================================================================
  
  const handleCreatePage = useCallback(() => {
    const newPageId = `page_${Date.now()}`;
    const pageCount = pageOrder.length;
    const newPage: PetriNetPageData = {
      id: newPageId,
      title: `Page ${pageCount + 1}`,
      places: [],
      transitions: [],
      arcs: [],
      deterministicMode: false,
      conflictResolutionMode: false,
      conflictingTransitions: [],
      selectedElements: [],
      history: { places: [], transitions: [], arcs: [], title: [] },
      zoomLevel: 1,
      panOffset: { x: -750, y: -421.875 },
      validatorConfigs: { ...defaultValidatorConfigs } // Initialize
    };
    setPages(prevPages => ({
      ...prevPages,
      [newPageId]: newPage
    }));
    setPageOrder(prevOrder => [...prevOrder, newPageId]);
    setActivePageId(newPageId);
    setProjectHasUnsavedChanges(true);
  }, [pageOrder.length, setPages, setPageOrder, setActivePageId, setProjectHasUnsavedChanges, defaultValidatorConfigs]);

  const handleCreatePageWithData = useCallback((pageData: PetriNetPageData) => {
    setPages(prevPages => ({
      ...prevPages,
      [pageData.id]: pageData
    }));
    setPageOrder(prevOrder => [...prevOrder, pageData.id]);
    setActivePageId(pageData.id);
    setProjectHasUnsavedChanges(true);
  }, [setPages, setPageOrder, setActivePageId, setProjectHasUnsavedChanges]);

  const handleRenamePage = useCallback((pageId: string, newTitle: string) => {
    // This is now primarily handled by EditableTitle calling handlePageTitleSave
    // Kept for other potential direct calls.
    if (!pageId || !newTitle.trim() || !pages[pageId] || pages[pageId].title === newTitle.trim()) return;

    setPages(prevPages => {
      const pageToUpdate = prevPages[pageId];
      if (!pageToUpdate || pageToUpdate.title === newTitle.trim()) return prevPages;
      
      saveToHistory(pageToUpdate); // Save state BEFORE renaming for undo

      return {
        ...prevPages,
        [pageId]: {
          ...pageToUpdate,
          title: newTitle.trim() 
        }
      };
    });
    setProjectHasUnsavedChanges(true); 
  }, [pages, setPages, saveToHistory, setProjectHasUnsavedChanges]);

  const handleDeletePage = useCallback((pageIdToDelete: string) => {
    const pageIds = pageOrder;
    if (pageIds.length <= 1) {
      console.warn("Cannot delete the last page.");
      return; 
    }

    let nextActivePageId: string | null = null;
    const currentIndex = pageIds.indexOf(pageIdToDelete);

    if (activePageId === pageIdToDelete) {
      if (currentIndex > 0) {
        nextActivePageId = pageIds[currentIndex - 1];
      } else { // Deleting the first page
        nextActivePageId = pageIds[1]; 
      }
    } else {
      nextActivePageId = activePageId; // Keep current active page
    }

    const updatedPages = { ...pages };
    delete updatedPages[pageIdToDelete];
    setPages(updatedPages);
    
    setPageOrder(prevOrder => prevOrder.filter(id => id !== pageIdToDelete));
    
    setActivePageId(nextActivePageId);
    setCurrentFiredTransitions([]);
    setProjectHasUnsavedChanges(true); // Deleting a page is an unsaved change
  }, [pageOrder, activePageId, pages, setPages, setPageOrder, setActivePageId, setCurrentFiredTransitions, setProjectHasUnsavedChanges]);

  const handleReorderPages = useCallback((newPageOrder: string[]) => {
    // Compare old and new order to see if a change actually occurred
    if (JSON.stringify(pageOrder) !== JSON.stringify(newPageOrder)) {
      setPageOrder(newPageOrder);
      setProjectHasUnsavedChanges(true); // Reordering pages is an unsaved change
    }
  }, [pageOrder, setPageOrder, setProjectHasUnsavedChanges]);

  // =========================================================================================
  // VIEW MANAGEMENT
  // =========================================================================================
  
  const handleViewChange = useCallback((view: { zoomLevel: number, panOffset: {x: number, y: number} }) => {
    if (!activePageId || !pages[activePageId]) return; 
    setPages(prev => {
      if (!prev[activePageId!]) return prev;
      // Check if update is necessary
      const currentPage = prev[activePageId!];
      if (currentPage.zoomLevel === view.zoomLevel && 
        currentPage.panOffset?.x === view.panOffset.x &&
        currentPage.panOffset?.y === view.panOffset.y) {
        return prev; 
      }
      return {
        ...prev,
        [activePageId!]: {
          ...currentPage,
          zoomLevel: view.zoomLevel,
          panOffset: view.panOffset
        }
      };
    });
    // Zooming and panning DO NOT set projectHasUnsavedChanges
  }, [activePageId, pages, setPages]);

  const handleZoomLevelChange = useCallback((newZoom: number) => {
    if (activePageId && pages[activePageId]) { // Check pages[activePageId] for robustness
      setPages(prev => {
        if (!prev[activePageId!]) return prev;
        const currentPage = prev[activePageId!];
        if (currentPage.zoomLevel === newZoom) return prev; // Avoid unnecessary updates
        return {
          ...prev,
          [activePageId!]: { ...currentPage, zoomLevel: newZoom }
        };
      });
      // Zooming does not set projectHasUnsavedChanges to true
    }
  }, [activePageId, pages, setPages]);

  const handleCenterView = useCallback(() => {
    if (!activePageId) return;

    // default centered view
    const defaultZoom = 1.0;
    const defaultPanOffset = { x: -750, y: -421.875 }; 

    setPages(prev => {
      if (!prev[activePageId!]) return prev;
      const currentPage = prev[activePageId!];

      if (currentPage.zoomLevel === defaultZoom && 
        currentPage.panOffset?.x === defaultPanOffset.x &&
        currentPage.panOffset?.y === defaultPanOffset.y) {
         return prev; 
      }
      
      return {
        ...prev,
        [activePageId!]: {
          ...currentPage,
          zoomLevel: defaultZoom,
          panOffset: defaultPanOffset
        }
      };
    });
    // Centering view DOES NOT set projectHasUnsavedChanges to true
  }, [activePageId, setPages]);

  return {
    // Project operations
    handleNewProject,
    handleSetDeterministicMode,
    handleUpdateValidatorConfigs,
    onValidatorConfigsChangeCallback,
    
    // Page operations
    handleCreatePage,
    handleCreatePageWithData,
    handleRenamePage,
    handleDeletePage,
    handleReorderPages,
    
    // View management
    handleViewChange,
    handleZoomLevelChange,
    handleCenterView,
  };
}; 