import { useCallback } from 'react';
import { UIPlace, UITransition, UIArc, GRID_CELL_SIZE, PetriNetPageData, UITextBox } from '../types';

interface UsePetriNetCoreProps {
  activePageId: string | null;
  setPages: React.Dispatch<React.SetStateAction<Record<string, PetriNetPageData>>>;
  saveToHistory: (pageDataToSave: PetriNetPageData) => void;
  setProjectHasUnsavedChanges: (hasChanges: boolean) => void;
  setSelectedTool: (tool: 'NONE' | 'PLACE' | 'TRANSITION' | 'ARC' | 'TEXTBOX') => void;
  arcType: UIArc['type'];
  selectedTool: 'NONE' | 'PLACE' | 'TRANSITION' | 'ARC' | 'TEXTBOX';
  activePageData: PetriNetPageData | null;
  dragStartPositionsRef: React.MutableRefObject<Map<string, { x: number; y: number }>>;
}

export const usePetriNetCore = ({
  activePageId,
  setPages,
  saveToHistory,
  setProjectHasUnsavedChanges,
  setSelectedTool,
  arcType,
  selectedTool,
  activePageData,
  dragStartPositionsRef
}: UsePetriNetCoreProps) => {
  
  // =========================================================================================
  // HELPER FUNCTIONS
  // =========================================================================================
  
  const findClickedElement = useCallback((x: number, y: number, currentPlaces: UIPlace[], currentTransitions: UITransition[]) => {
    const gridX = Math.round(x / GRID_CELL_SIZE) * GRID_CELL_SIZE;
    const gridY = Math.round(y / GRID_CELL_SIZE) * GRID_CELL_SIZE;

    const place = currentPlaces.find(p =>
      p.x === gridX && p.y === gridY
    );
    if (place) return place;

    const transition = currentTransitions.find(t =>
      t.x === gridX && t.y === gridY
    );
    if (transition) return transition;

    return null;
  }, []);

  const isValidArcConnection = useCallback((
    sourceId: string,
    targetId: string,
    arcType: UIArc['type'],
    allPlaces: UIPlace[],
    allTransitions: UITransition[]
  ): boolean => {
    if (sourceId === targetId) {
      return false;
    }

    const sourceElement = allPlaces.find(p => p.id === sourceId) || allTransitions.find(t => t.id === sourceId);
    const targetElement = allPlaces.find(p => p.id === targetId) || allTransitions.find(t => t.id === targetId);

    if (!sourceElement || !targetElement) {
      console.error("Could not find source or target element for arc validation.");
      return false; 
    }

    const isSourcePlace = 'radius' in sourceElement;
    const isSourceTrans = 'width' in sourceElement;
    const isTargetPlace = 'radius' in targetElement;
    const isTargetTrans = 'width' in targetElement;

    if (arcType === 'INHIBITOR') {
      return isSourcePlace && isTargetTrans;
    }
    else {
      return (
        (isSourcePlace && isTargetTrans) ||
        (isSourceTrans && isTargetPlace)
      );
    }
  }, []);

  // =========================================================================================
  // ELEMENT SELECTION
  // =========================================================================================
  
  const handleSelectElement = useCallback((elementId: string, event?: React.MouseEvent | KeyboardEvent) => {
    if (!activePageId || !activePageData) return;

    const isShift = event?.shiftKey;
    
    setPages(prevPages => {
      const currentPage = prevPages[activePageId!]; 
      if (!currentPage) return prevPages; 

      let nextSelected: string[];
      const currentSelected = currentPage.selectedElements;

      if (elementId === '') { 
        nextSelected = [];
      } else if (isShift) {
        if (currentSelected.includes(elementId)) {
          nextSelected = currentSelected.filter(elId => elId !== elementId);
        } else {
          nextSelected = [...currentSelected, elementId];
        }
      } else {
        if (currentSelected.length === 1 && currentSelected[0] === elementId) {
          nextSelected = currentSelected;
        } else {
          nextSelected = [elementId];
        }
      }

      return {
        ...prevPages,
        [activePageId!]: {
          ...currentPage,
          selectedElements: nextSelected
        }
      };
    });

    if (!isShift && elementId !== '') {
       setSelectedTool('NONE'); 
    }
  }, [activePageId, activePageData, setPages, setSelectedTool]);

  const clearActivePageSelection = useCallback(() => {
    if (!activePageId || !activePageData) return;

    setPages(prevPages => {
      const currentPage = prevPages[activePageId!];
      if (!currentPage) return prevPages;

      if (currentPage.selectedElements.length === 0) {
        return prevPages;
      }

      return {
        ...prevPages,
        [activePageId!]: {
          ...currentPage,
          selectedElements: []
        }
      };
    });
  }, [activePageId, activePageData, setPages]);

  const handleMultiSelectElement = useCallback((ids: string[]) => {
    if (!activePageId || !activePageData) return;

    setPages(prevPages => {
      const currentPage = prevPages[activePageId!];
      if (!currentPage) return prevPages;

      return {
        ...prevPages,
        [activePageId!]: {
          ...currentPage,
          selectedElements: ids 
        }
      };
    });
  }, [activePageId, activePageData, setPages]);

  // =========================================================================================
  // CANVAS INTERACTIONS
  // =========================================================================================
  
  const handleCanvasClick = useCallback((x: number, y: number) => {
    if (selectedTool === 'NONE') {
      clearActivePageSelection();
      return;
    }
    if (!activePageId || !activePageData) return;

    if (selectedTool === 'PLACE') {
      const newPlace: UIPlace = {
        name: '',
        id: `place_${Date.now()}_${activePageId}`,
        tokens: 0, x, y, radius: 46, bounded: false, capacity: null
      };
      // Save to history before adding new place
      if (activePageData) {
        saveToHistory(activePageData);
      }
      
      setPages(prevPages => {
        const currentPage = prevPages[activePageId!];
        if (!currentPage) return prevPages;
        
        return {
          ...prevPages,
          [activePageId!]: {
            ...currentPage,
            places: [...currentPage.places, newPlace]
          }
        };
      });
      setSelectedTool('NONE');
      setProjectHasUnsavedChanges(true);

    } else if (selectedTool === 'TRANSITION') {
      const newTransition: UITransition = {
        name: '', id: `trans_${Date.now()}_${activePageId}`,
        enabled: false, arcIds: [], x, y, width: 120, height: 54
      };
      // Save to history before adding new transition
      if (activePageData) {
        saveToHistory(activePageData);
      }
      
      setPages(prevPages => {
        const currentPage = prevPages[activePageId!];
        if (!currentPage) return prevPages;
        
        return {
          ...prevPages,
          [activePageId!]: {
            ...currentPage,
            transitions: [...currentPage.transitions, newTransition]
          }
        };
      });
      setSelectedTool('NONE');
      setProjectHasUnsavedChanges(true);

    } else if (selectedTool === 'ARC') {
      handleArcCreation(x, y);
      setSelectedTool('NONE');
    } else if (selectedTool === 'TEXTBOX') {
      const newTextBox: UITextBox = {
        id: `textbox_${Date.now()}_${activePageId}`,
        text: 'Text',
        x, y,
        width: 200,
        height: 100,
        fontSize: 16,
        fontFamily: 'sans-serif',
        color: '#ffffff',
        backgroundColor: 'transparent',
        borderColor: 'transparent',
        borderWidth: 2
      };
      
      // Save to history before adding new textbox
      if (activePageData) {
        saveToHistory(activePageData);
      }
      
      setPages(prevPages => {
        const currentPage = prevPages[activePageId!];
        if (!currentPage) return prevPages;
        
        return {
          ...prevPages,
          [activePageId!]: {
            ...currentPage,
            textBoxes: [...(currentPage.textBoxes || []), newTextBox]
          }
        };
      });
      setSelectedTool('NONE');
      setProjectHasUnsavedChanges(true);
    }
  }, [selectedTool, activePageId, activePageData, setPages, saveToHistory, setSelectedTool, setProjectHasUnsavedChanges, clearActivePageSelection]);

  const handleArcCreation = useCallback((x: number, y: number) => {
    if (!activePageId || !activePageData) return;
    const clickedElement = findClickedElement(x, y, activePageData.places, activePageData.transitions);
    if (!clickedElement) {
      clearActivePageSelection();
      return;
    }
    const currentSelectedElements = activePageData.selectedElements;
    if (currentSelectedElements.length === 0) {
      // Select source
      setPages(prevPages => {
        const currentPage = prevPages[activePageId!];
        if (!currentPage) return prevPages;
        return {
          ...prevPages,
          [activePageId!]: { ...currentPage, selectedElements: [clickedElement.id] }
        };
      });
    } else {
      const sourceId = currentSelectedElements[0];
      const targetId = clickedElement.id;
      if (isValidArcConnection(sourceId, targetId, arcType, activePageData.places, activePageData.transitions)) {
        // Save to history before creating arc
        if (activePageData) {
          saveToHistory(activePageData);
        }
        
        // Create Arc
        setPages(prevPages => { 
          const currentPage = prevPages[activePageId!];
          if (!currentPage) return prevPages;

          const newArcId = `arc_${Date.now()}_${activePageId}`;
          const newArc: UIArc = { id: newArcId, type: arcType, incomingId: sourceId, outgoingId: targetId };
          const updatedArcs = [...currentPage.arcs, newArc];
          const updatedTransitions = currentPage.transitions.map(t => {
            const elementIsTransition = currentPage.transitions.some(trans => trans.id === t.id);
            if ((t.id === sourceId || t.id === targetId) && elementIsTransition) {
              if (!t.arcIds.includes(newArcId)) {
                return { ...t, arcIds: [...t.arcIds, newArcId] };
              }
            }
            return t;
          });

          return {
            ...prevPages,
            [activePageId!]: {
              ...currentPage,
              transitions: updatedTransitions,
              arcs: updatedArcs,
              selectedElements: [],
            }
          };
        });
        setProjectHasUnsavedChanges(true);
      } else {
        console.warn(`Invalid arc from ${sourceId} to ${targetId} (${arcType}).`);
        clearActivePageSelection(); 
      }
    }
  }, [activePageId, activePageData, findClickedElement, isValidArcConnection, arcType, setPages, saveToHistory, setProjectHasUnsavedChanges, clearActivePageSelection]);

  const handleArcPortClick = useCallback((clickedId: string) => {
    if (!activePageId || !activePageData) return;
    const currentSelectedElements = activePageData.selectedElements;
    if (currentSelectedElements.length === 0) {
      // Select source
      setPages(prevPages => {
        const currentPage = prevPages[activePageId!];
        if (!currentPage) return prevPages;
        return {
          ...prevPages,
          [activePageId!]: { ...currentPage, selectedElements: [clickedId] }
        };
      });
    } else {
      const sourceId = currentSelectedElements[0];
      const targetId = clickedId;
      if (isValidArcConnection(sourceId, targetId, arcType, activePageData.places, activePageData.transitions)) {
        // Save to history before creating arc
        if (activePageData) {
          saveToHistory(activePageData);
        }
        
        // Create Arc
        setPages(prevPages => { 
          const currentPage = prevPages[activePageId!];
          if (!currentPage) return prevPages;
          
          const newArcId = `arc_${Date.now()}_${activePageId}`;
          const newArc: UIArc = { id: newArcId, type: arcType, incomingId: sourceId, outgoingId: targetId };
          const updatedArcs = [...currentPage.arcs, newArc];
          const updatedTransitions = currentPage.transitions.map(t => {
            const elementIsTransition = currentPage.transitions.some(trans => trans.id === t.id);
            if ((t.id === sourceId || t.id === targetId) && elementIsTransition) {
              if (!t.arcIds.includes(newArcId)) {
                return { ...t, arcIds: [...t.arcIds, newArcId] };
              }
            }
            return t;
          });

          return {
            ...prevPages,
            [activePageId!]: {
              ...currentPage,
              transitions: updatedTransitions,
              arcs: updatedArcs,
              selectedElements: [],
            }
          };
        });
        setProjectHasUnsavedChanges(true);
      } else {
        console.warn('Invalid arc connection');
        clearActivePageSelection(); 
      }
    }
  }, [activePageId, activePageData, isValidArcConnection, arcType, setPages, saveToHistory, setProjectHasUnsavedChanges, clearActivePageSelection]);

  // =========================================================================================
  // ELEMENT UPDATES
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
  }, [activePageId, activePageData, setPages, setProjectHasUnsavedChanges]);

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
  }, [activePageId, activePageData, setPages, setProjectHasUnsavedChanges]);

  const handleUpdatePlaceCapacity = useCallback((id: string, newCapacity: number | null) => {
    if (!activePageId || !activePageData) return;
    setPages(prevPages => {
      const currentPage = prevPages[activePageId!];
      if (!currentPage) return prevPages;
      const updatedPlaces = currentPage.places.map(place =>
        place.id === id ? { ...place, capacity: newCapacity } : place
      );
      if (updatedPlaces === currentPage.places) return prevPages;
      return {
        ...prevPages,
        [activePageId!]: { ...currentPage, places: updatedPlaces }
      };
    });
    setProjectHasUnsavedChanges(true);
  }, [activePageId, activePageData, setPages, setProjectHasUnsavedChanges]);

  // =========================================================================================
  // ELEMENT SIZING
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
  }, [activePageId, activePageData, saveToHistory, setPages, setProjectHasUnsavedChanges]);

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
  }, [activePageId, activePageData, saveToHistory, setPages, setProjectHasUnsavedChanges]);

  // =========================================================================================
  // ELEMENT POSITIONING
  // =========================================================================================
  
  const updateElementPosition = useCallback((id: string, newX: number, newY: number, dragState: 'start' | 'dragging' | 'end' = 'end') => {
    if (!activePageId || !activePageData) return;
    
    // --- Drag Start Logic ---
    if (dragState === 'start') {
      saveToHistory(activePageData); 
      const { places: placesAtDragStart, transitions: transitionsAtDragStart, selectedElements: currentSelectedElements } = activePageData; 
      dragStartPositionsRef.current.clear();
      const elementsToTrack = [...placesAtDragStart, ...transitionsAtDragStart];
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

           const placesChanged = JSON.stringify(currentPage.places) !== JSON.stringify(updatedPlaces);
           const transitionsChanged = JSON.stringify(currentPage.transitions) !== JSON.stringify(updatedTransitions);

           if (!placesChanged && !transitionsChanged) {
               return prevPages; 
           }

           return {
               ...prevPages,
               [activePageId!]: {
                   ...currentPage,
                   places: updatedPlaces,
                   transitions: updatedTransitions,
               }
           };
       });
    }

    // Clear ref only on end
    if (dragState === 'end') {
      dragStartPositionsRef.current.clear();
    }
  }, [activePageId, activePageData, saveToHistory, dragStartPositionsRef, setPages]);

  return {
    // Helper functions
    findClickedElement,
    isValidArcConnection,
    
    // Element selection
    handleSelectElement,
    clearActivePageSelection,
    handleMultiSelectElement,
    
    // Canvas interactions
    handleCanvasClick,
    handleArcCreation,
    handleArcPortClick,
    
    // Element updates
    handleTokenUpdate,
    handleNameUpdate,
    handleUpdatePlaceCapacity,
    
    // Element sizing
    updatePlaceSize,
    updateTransitionSize,
    
    // Element positioning
    updateElementPosition,
  };
}; 