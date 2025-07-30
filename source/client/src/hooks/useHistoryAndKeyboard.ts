import { useCallback, useEffect } from 'react';
import { PetriNetPageData } from '../types';

interface UseHistoryAndKeyboardProps {
  activePageId: string | null;
  setPages: React.Dispatch<React.SetStateAction<Record<string, PetriNetPageData>>>;
  setProjectHasUnsavedChanges: (hasChanges: boolean) => void;
  setCurrentFiredTransitions: (transitions: string[]) => void;
  isTyping: boolean;
  handleCopy: () => void;
  handlePaste: () => void;
  setSelectedTool: (tool: 'NONE' | 'PLACE' | 'TRANSITION' | 'ARC') => void;
  clearActivePageSelection: () => void;
  activePageData: PetriNetPageData | null;
}

const MAX_HISTORY_LENGTH = 50;

export const useHistoryAndKeyboard = ({
  activePageId,
  setPages,
  setProjectHasUnsavedChanges,
  setCurrentFiredTransitions,
  isTyping,
  handleCopy,
  handlePaste,
  setSelectedTool,
  clearActivePageSelection,
  activePageData
}: UseHistoryAndKeyboardProps) => {
  
  // =========================================================================================
  // HISTORY MANAGEMENT
  // =========================================================================================
  
  const saveToHistory = useCallback((pageDataToSave: PetriNetPageData) => { 
    if (!activePageId) return; 

    const { places, transitions, arcs, textBoxes, title } = pageDataToSave; 
    
    // Get the current history from the pages state to ensure we have the latest
    setPages(prevPages => {
      const currentPage = prevPages[activePageId!];
      if (!currentPage) return prevPages;
      
      const currentHistory = currentPage.history || { places: [], transitions: [], arcs: [], textBoxes: [], title: [] };
    
    const currentPlacesState = JSON.parse(JSON.stringify(places));
    const currentTransitionsState = JSON.parse(JSON.stringify(transitions));
    const currentArcsState = JSON.parse(JSON.stringify(arcs));
    const currentTextBoxesState = JSON.parse(JSON.stringify(textBoxes));
    const currentTitleState = title;

    const nextPlacesHistory = [...currentHistory.places, currentPlacesState].slice(-MAX_HISTORY_LENGTH);
    const nextTransitionsHistory = [...currentHistory.transitions, currentTransitionsState].slice(-MAX_HISTORY_LENGTH);
    const nextArcsHistory = [...currentHistory.arcs, currentArcsState].slice(-MAX_HISTORY_LENGTH);
    const nextTextBoxesHistory = [...currentHistory.textBoxes, currentTextBoxesState].slice(-MAX_HISTORY_LENGTH);
    const nextTitleHistory = [...currentHistory.title, currentTitleState].slice(-MAX_HISTORY_LENGTH);

    console.log('Saving to history:', {
      placesCount: places.length,
      transitionsCount: transitions.length,
      arcsCount: arcs.length,
      historyLength: currentHistory.places.length,
      newHistoryLength: nextPlacesHistory.length,
      currentHistoryPlaces: currentHistory.places.length,
      currentHistoryTransitions: currentHistory.transitions.length,
      currentHistoryArcs: currentHistory.arcs.length,
      currentHistoryTitle: currentHistory.title.length
    });

    return {
      ...prevPages,
      [activePageId!]: {
        ...currentPage,
        history: {
          places: nextPlacesHistory,
          transitions: nextTransitionsHistory,
          arcs: nextArcsHistory,
          textBoxes: nextTextBoxesHistory,
          title: nextTitleHistory
        }
      }
    };
    });
  }, [activePageId, setPages]);
  
  const handleUndo = useCallback(() => {
    if (!activePageId || !activePageData) return; 
    const currentHistory = activePageData.history || { places: [], transitions: [], arcs: [], textBoxes: [], title: [] };
    if (currentHistory.places.length === 0) return; 
    const placesToRestore = currentHistory.places[currentHistory.places.length - 1];
    const transitionsToRestore = currentHistory.transitions[currentHistory.transitions.length - 1];
    const arcsToRestore = currentHistory.arcs[currentHistory.arcs.length - 1];
    const textBoxesToRestore = currentHistory.textBoxes[currentHistory.textBoxes.length - 1];
    const titleToRestore = currentHistory.title[currentHistory.title.length - 1];
    const nextPlacesHistory = currentHistory.places.slice(0, -1);
    const nextTransitionsHistory = currentHistory.transitions.slice(0, -1);
    const nextArcsHistory = currentHistory.arcs.slice(0, -1);
    const nextTextBoxesHistory = currentHistory.textBoxes.slice(0, -1);
    const nextTitleHistory = currentHistory.title.slice(0, -1);

    console.log('Undoing:', {
      currentPlacesCount: activePageData.places.length,
      currentTransitionsCount: activePageData.transitions.length,
      currentArcsCount: activePageData.arcs.length,
      historyLength: currentHistory.places.length,
      placesToRestoreCount: placesToRestore.length,
      transitionsToRestoreCount: transitionsToRestore.length,
      arcsToRestoreCount: arcsToRestore.length
    });
    setPages(prevPages => ({
      ...prevPages,
      [activePageId!]: {
        ...prevPages[activePageId!],
        title: titleToRestore ?? prevPages[activePageId!].title, 
        places: placesToRestore,
        transitions: transitionsToRestore,
        arcs: arcsToRestore,
        textBoxes: textBoxesToRestore,
        history: {
          places: nextPlacesHistory,
          transitions: nextTransitionsHistory,
          arcs: nextArcsHistory,
          textBoxes: nextTextBoxesHistory,
          title: nextTitleHistory
        },
        selectedElements: [], 
      }
    }));
    setCurrentFiredTransitions([]);
    setProjectHasUnsavedChanges(true);
  }, [activePageId, activePageData, setPages, setCurrentFiredTransitions, setProjectHasUnsavedChanges]);

  // =========================================================================================
  // KEYBOARD SHORTCUTS
  // =========================================================================================
  
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (isTyping) return;
      const isModifier = e.metaKey || e.ctrlKey; 

      if (isModifier && e.key === 'c') { 
        e.preventDefault();
        handleCopy(); 
        return;
      }
      if (isModifier && e.key === 'v') { 
        e.preventDefault();
        handlePaste(); 
        return;
      }
      if (isModifier && e.key === 'z') { 
        e.preventDefault();
        handleUndo();
        return;
      }

      if (e.key === 'Escape') {
        setSelectedTool('NONE');
        clearActivePageSelection();
        return;
      }
      
      const handleDeleteLocal = () => {
        if (!activePageId || !activePageData || activePageData.selectedElements.length === 0) return;

        setPages(prevPages => {
          const currentPage = prevPages[activePageId!];
          if (!currentPage) return prevPages;

          const { 
            places: currentPlaces, 
            transitions: currentTransitions, 
            arcs: currentArcs, 
            textBoxes: currentTextBoxes,
            selectedElements: currentSelectedElements
          } = currentPage;

          // Save to history before deletion
          saveToHistory(currentPage);

          // Filter out selected elements
          const selectedElementIds = new Set(currentSelectedElements);
          const updatedPlaces = currentPlaces.filter(p => !selectedElementIds.has(p.id));
          const updatedTransitions = currentTransitions.filter(t => !selectedElementIds.has(t.id));
          const updatedTextBoxes = currentTextBoxes.filter(tb => !selectedElementIds.has(tb.id));
          const updatedArcs = currentArcs.filter(a => {
            const isIncomingSelected = selectedElementIds.has(a.incomingId);
            const isOutgoingSelected = selectedElementIds.has(a.outgoingId);
            return !isIncomingSelected && !isOutgoingSelected;
          });

          // Update arcIds in transitions
          const updatedTransitionsWithArcIds = updatedTransitions.map(t => ({
            ...t,
            arcIds: t.arcIds.filter(arcId => 
              updatedArcs.some(arc => arc.id === arcId)
            )
          }));

          return {
            ...prevPages,
            [activePageId!]: {
              ...currentPage,
              places: updatedPlaces,
              transitions: updatedTransitionsWithArcIds,
              textBoxes: updatedTextBoxes,
              arcs: updatedArcs,
              selectedElements: [],
            }
          };
        });
        setProjectHasUnsavedChanges(true);
      };

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        handleDeleteLocal();
        return;
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [
    isTyping, 
    handleCopy, 
    handlePaste, 
    handleUndo, 
    setSelectedTool, 
    clearActivePageSelection,
    activePageId,
    activePageData,
    setPages,
    saveToHistory,
    setProjectHasUnsavedChanges
  ]);

  return {
    saveToHistory,
    handleUndo,
  };
}; 