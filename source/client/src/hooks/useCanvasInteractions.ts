import { useCallback, useRef } from 'react';
import { PetriNetPageData } from '../types';

interface UseCanvasInteractionsProps {
  activePageId: string | null;
  activePageData: PetriNetPageData | null;
  pages: Record<string, PetriNetPageData>;
  setPages: React.Dispatch<React.SetStateAction<Record<string, PetriNetPageData>>>;
  setProjectHasUnsavedChanges: (hasChanges: boolean) => void;
  saveToHistory: (pageData: PetriNetPageData) => void;
  pageOrder: string[];
  setPageOrder: React.Dispatch<React.SetStateAction<string[]>>;
}

export const useCanvasInteractions = ({
  activePageId,
  activePageData,
  pages,
  setPages,
  setProjectHasUnsavedChanges,
  saveToHistory,
  pageOrder,
  setPageOrder
}: UseCanvasInteractionsProps) => {
  
  // =========================================================================================
  // ELEMENT RESIZING
  // =========================================================================================
  
  const updatePlaceSize = useCallback((id: string, newRadius: number, resizeState: 'start' | 'resizing' | 'end') => {
    if (!activePageId) return;
    
    if (resizeState === 'start') {
      // Save history only at the start of the resize, if the page data exists
      if (activePageData) {
        saveToHistory(activePageData);
      }
    }

    setPages(prev => {
      if (!prev[activePageId!]) return prev;
      const currentPageData = prev[activePageId!];

      const updatedPlaces = currentPageData.places.map(p => 
        p.id === id ? { ...p, radius: newRadius } : p
      );

      if (JSON.stringify(currentPageData.places) === JSON.stringify(updatedPlaces)) return prev;
      
      if (resizeState === 'end') {
        setProjectHasUnsavedChanges(true);
      }

      return {
        ...prev,
        [activePageId!]: { 
          ...currentPageData, 
          places: updatedPlaces,
        }
      };
    });
  }, [activePageId, activePageData, setPages, setProjectHasUnsavedChanges, saveToHistory]);

  const updateTransitionSize = useCallback((id: string, newWidth: number, newHeight: number, resizeState: 'start' | 'resizing' | 'end') => {
    if (!activePageId) return;

    if (resizeState === 'start') {
      if (activePageData) {
        saveToHistory(activePageData);
      }
    }

    setPages(prev => {
      if (!prev[activePageId!]) return prev;
      const currentPageData = prev[activePageId!];

      const updatedTransitions = currentPageData.transitions.map(t => 
         t.id === id ? { ...t, width: newWidth, height: newHeight } : t
      );

       if (JSON.stringify(currentPageData.transitions) === JSON.stringify(updatedTransitions)) return prev;
       
      if (resizeState === 'end') {
        setProjectHasUnsavedChanges(true);
      }

      return {
        ...prev,
        [activePageId!]: { 
          ...currentPageData, 
          transitions: updatedTransitions, 
        }
      };
    });
  }, [activePageId, activePageData, setPages, setProjectHasUnsavedChanges, saveToHistory]);

  // =========================================================================================
  // ELEMENT DRAGGING
  // =========================================================================================
  
  const dragStartPositionsRef = useRef<Map<string, { x: number, y: number }>>(new Map());

  const updateElementPosition = useCallback((id: string, newX: number, newY: number, dragState: 'start' | 'dragging' | 'end' = 'end') => {
    if (!activePageId || !activePageData) return;
    
    // --- Drag Start Logic ---
    if (dragState === 'start') {
      saveToHistory(activePageData); 
      const { places: placesAtDragStart, transitions: transitionsAtDragStart, textBoxes: textBoxesAtDragStart, selectedElements: currentSelectedElements } = activePageData; 
      dragStartPositionsRef.current.clear();
      const elementsToTrack = [...placesAtDragStart, ...transitionsAtDragStart, ...textBoxesAtDragStart];
      currentSelectedElements.forEach(selectedId => {
        const element = elementsToTrack.find(el => el.id === selectedId); 
        if (element) {
          dragStartPositionsRef.current.set(selectedId, { x: element.x, y: element.y });
        }
      });
      if (!currentSelectedElements.includes(id)) {
        const mainElement = elementsToTrack.find(el => el.id === id);
        if (mainElement) {
          dragStartPositionsRef.current.set(id, { x: mainElement.x, y: mainElement.y });
         }
      }
      return; 
    }

    // --- Dragging or End Logic ---
    const startPos = dragStartPositionsRef.current.get(id);
    if (!startPos) { 
       if (dragState === 'end') dragStartPositionsRef.current.clear();
       console.warn("Drag update/end called without valid start position for element:", id);
       return; 
     }

    const deltaX = newX - startPos.x;
    const deltaY = newY - startPos.y;

    // Update state if dragging OR ending
    if (dragState === 'dragging' || dragState === 'end') {
       setPages(prevPages => {
         const currentPage = prevPages[activePageId!];
         if (!currentPage) return prevPages;
         
         const currentSelectedElements = currentPage.selectedElements; 
         const isMultiSelect = currentSelectedElements.length > 1 && currentSelectedElements.includes(id);

         const updatedPlaces = currentPage.places.map(p => {
           const originalStartPos = dragStartPositionsRef.current.get(p.id);
           const shouldMove = p.id === id || (isMultiSelect && currentSelectedElements.includes(p.id));
           if (shouldMove && originalStartPos) { 
             return { ...p, x: originalStartPos.x + deltaX, y: originalStartPos.y + deltaY };
        }
        return p;
         });

         const updatedTransitions = currentPage.transitions.map(t => {
           const originalStartPos = dragStartPositionsRef.current.get(t.id);
           const shouldMove = t.id === id || (isMultiSelect && currentSelectedElements.includes(t.id));
           if (shouldMove && originalStartPos) {
             return { ...t, x: originalStartPos.x + deltaX, y: originalStartPos.y + deltaY };
        }
        return t;
         });

         const updatedTextBoxes = currentPage.textBoxes?.map(tb => {
           const originalStartPos = dragStartPositionsRef.current.get(tb.id);
           const shouldMove = tb.id === id || (isMultiSelect && currentSelectedElements.includes(tb.id));
           if (shouldMove && originalStartPos) {
             return { ...tb, x: originalStartPos.x + deltaX, y: originalStartPos.y + deltaY };
           }
           return tb;
         }) || [];

         const placesChanged = JSON.stringify(currentPage.places) !== JSON.stringify(updatedPlaces);
         const transitionsChanged = JSON.stringify(currentPage.transitions) !== JSON.stringify(updatedTransitions);
         const textBoxesChanged = JSON.stringify(currentPage.textBoxes) !== JSON.stringify(updatedTextBoxes);

         if (!placesChanged && !transitionsChanged && !textBoxesChanged) {
           return prevPages; 
         }

         return {
           ...prevPages,
           [activePageId!]: {
             ...currentPage,
             places: updatedPlaces,
             transitions: updatedTransitions,
             textBoxes: updatedTextBoxes,
           }
         };
       });
    }

    // Clear ref only on end
    if (dragState === 'end') {
      dragStartPositionsRef.current.clear();
    }
  }, [activePageId, activePageData, setPages, saveToHistory]);

  // =========================================================================================
  // ELEMENT PROPERTY UPDATES
  // =========================================================================================
  
  const handleTokenUpdate = useCallback((placeId: string, newTokens: number) => {
    if (!activePageId || !activePageData) return;
    setPages(prevPages => {
      const currentPage = prevPages[activePageId!];
      if (!currentPage) return prevPages;
      const updatedPlaces = currentPage.places.map(place =>
        place.id === placeId ? { ...place, tokens: newTokens } : place
      );
      if (updatedPlaces === currentPage.places) return prevPages;
      return {
        ...prevPages,
        [activePageId!]: { ...currentPage, places: updatedPlaces }
      };
    });
    setProjectHasUnsavedChanges(true);
  }, [activePageId, pages, setPages, setProjectHasUnsavedChanges]);

  const handleNameUpdate = useCallback((id: string, newName: string) => {
     if (!activePageId || !activePageData) return;
    setPages(prevPages => {
      const currentPage = prevPages[activePageId!];
      if (!currentPage) return prevPages;

      let changed = false;
      const updatedPlaces = currentPage.places.map(place => {
        if (place.id === id) {
          changed = true;
          return { ...place, name: newName };
        }
        return place;
      });
      const updatedTransitions = currentPage.transitions.map(transition => {
        if (transition.id === id) {
          changed = true;
          return { ...transition, name: newName };
        }
        return transition;
      });

      if (!changed) return prevPages;

      return {
        ...prevPages,
        [activePageId!]: {
          ...currentPage,
          places: updatedPlaces,
          transitions: updatedTransitions
        }
      };
    });
    setProjectHasUnsavedChanges(true);
  }, [activePageId, pages, setPages, setProjectHasUnsavedChanges]);

  const handleUpdatePlaceCapacity = useCallback((id: string, newCapacity: number | null) => {
     if (!activePageId || !activePageData) return;
    setPages(prevPages => {
      const currentPage = prevPages[activePageId!];
      if (!currentPage) return prevPages;

      let changed = false;
      const updatedPlaces = currentPage.places.map(place => {
        if (place.id === id) {
          const newBounded = newCapacity !== null;
          let validCapacity = newCapacity;
          if (newBounded && (validCapacity === null || validCapacity < 0)) {
             validCapacity = 0;
          }
          let newTokens = place.tokens;
          if (newBounded && validCapacity !== null && newTokens > validCapacity) {
            newTokens = validCapacity;
          }
          if (place.bounded !== newBounded || place.capacity !== validCapacity || place.tokens !== newTokens) {
            changed = true;
          return { ...place, bounded: newBounded, capacity: validCapacity, tokens: newTokens };
          }
        }
        return place;
      });

      if (!changed) return prevPages;

      return {
        ...prevPages,
        [activePageId!]: { ...currentPage, places: updatedPlaces }
      };
    });
    setProjectHasUnsavedChanges(true);
  }, [activePageId, pages, setPages, setProjectHasUnsavedChanges]);

  const handleSetDeterministicMode = useCallback((newValue: boolean) => {
    if (!activePageId || !activePageData) return;

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

  // =========================================================================================
  // VIEW CONTROLS
  // =========================================================================================
  
  const handleViewChange = useCallback((view: { zoomLevel: number, panOffset: {x: number, y: number} }) => {
    if (!activePageId || !activePageData) return; 
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
    if (activePageId && activePageData) { // Check activePageData for robustness
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

  // =========================================================================================
  // PAGE MANAGEMENT
  // =========================================================================================
  
  const handleReorderPages = useCallback((newPageOrder: string[]) => {
    // Compare old and new order to see if a change actually occurred
    if (JSON.stringify(pageOrder) !== JSON.stringify(newPageOrder)) {
      setPageOrder(newPageOrder);
      setProjectHasUnsavedChanges(true); // Reordering pages is an unsaved change
    }
  }, [pageOrder, setPageOrder, setProjectHasUnsavedChanges]);

  // Add text box update handlers
  const handleTextBoxSizeUpdate = useCallback((id: string, newWidth: number, newHeight: number, resizeState: 'start' | 'resizing' | 'end') => {
    if (!activePageId || !activePageData) return;
    
    if (resizeState === 'start') {
        // Save to history before resizing
        saveToHistory(activePageData);
    }
    
    setPages(prevPages => {
        const currentPage = prevPages[activePageId!];
        if (!currentPage) return prevPages;
        
        const updatedTextBoxes = currentPage.textBoxes?.map(textBox =>
            textBox.id === id ? { ...textBox, width: newWidth, height: newHeight } : textBox
        ) || [];
        
        if (updatedTextBoxes === currentPage.textBoxes) return prevPages;
        
        return {
            ...prevPages,
            [activePageId!]: { ...currentPage, textBoxes: updatedTextBoxes }
        };
    });
    
    if (resizeState === 'end') {
        setProjectHasUnsavedChanges(true);
    }
}, [activePageId, activePageData, setPages, saveToHistory, setProjectHasUnsavedChanges]);

const handleTextBoxTextUpdate = useCallback((id: string, newText: string) => {
    if (!activePageId || !activePageData) return;
    setPages(prevPages => {
        const currentPage = prevPages[activePageId!];
        if (!currentPage) return prevPages;
        
        const updatedTextBoxes = currentPage.textBoxes?.map(textBox =>
            textBox.id === id ? { ...textBox, text: newText } : textBox
        ) || [];
        
        if (updatedTextBoxes === currentPage.textBoxes) return prevPages;
        
        return {
            ...prevPages,
            [activePageId!]: { ...currentPage, textBoxes: updatedTextBoxes }
        };
    });
    setProjectHasUnsavedChanges(true);
}, [activePageId, activePageData, setPages, setProjectHasUnsavedChanges]);

  return {
    // Element resizing
    updatePlaceSize,
    updateTransitionSize,
    
    // Element dragging
    updateElementPosition,
    
    // Element property updates
    handleTokenUpdate,
    handleNameUpdate,
    handleUpdatePlaceCapacity,
    handleSetDeterministicMode,
    
    // View controls
    handleViewChange,
    handleZoomLevelChange,
    handleCenterView,
    
    // Page management
    handleReorderPages,
    
    // Text box handlers
    handleTextBoxSizeUpdate,
    handleTextBoxTextUpdate,
  };
}; 