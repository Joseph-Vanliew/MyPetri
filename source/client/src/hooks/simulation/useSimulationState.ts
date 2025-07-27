import { useCallback } from 'react';
import { PetriNetPageData, PetriNetDTO } from '../../types';

type SetPagesFunction = React.Dispatch<React.SetStateAction<Record<string, PetriNetPageData>>>;
type SetFiredTransitionsFunction = (transitions: string[]) => void;

export const useSimulationState = (
  setPages: SetPagesFunction,
  setCurrentFiredTransitions: SetFiredTransitionsFunction
) => {
  const updatePageAfterSimulation = useCallback((
    activePageId: string,
    responseData: PetriNetDTO,
    conflictInfo: { hasConflicts: boolean; conflictingTransitions: string[] },
    bidirectionalPlacesToDecrement: Set<string> = new Set()
  ) => {
    setPages(prevPages => {
      const pageToUpdate = prevPages[activePageId];
      if (!pageToUpdate) return prevPages;

      const responseEnabledTransitions = responseData.transitions?.filter(t => t.enabled).map(t => t.id) || [];

      const updatedPagePlaces = pageToUpdate.places.map(p_ui => {
        const updatedPlaceData = responseData.places.find(rp => rp.id === p_ui.id);
        
        // Only update tokens immediately for places being consumed from via REGULAR arcs
        const isRegularSourcePlace = pageToUpdate.arcs.some(arc => 
          arc.incomingId === p_ui.id && 
          arc.type === 'REGULAR' && 
          responseEnabledTransitions.some(transitionId => transitionId === arc.outgoingId)
        );
        
        // Check if this place should be decremented for bidirectional arc consumption
        const shouldDecrementForBidirectional = bidirectionalPlacesToDecrement.has(p_ui.id);
        
        if (updatedPlaceData && isRegularSourcePlace) {
          // Regular consumption - use backend result
          return { ...p_ui, tokens: updatedPlaceData.tokens };
        } else if (shouldDecrementForBidirectional) {
          // Bidirectional consumption - decrement immediately, animation will restore final count
          return { ...p_ui, tokens: Math.max(0, p_ui.tokens - 1) };
        }
        
        // No changes for this place
        return p_ui;
      });

      // Map response DTO transitions to UITransition
      const updatedPageTransitions = pageToUpdate.transitions.map(t_ui => {
        const updatedTransitionData = responseData.transitions?.find(rt => rt.id === t_ui.id);
        return updatedTransitionData ? { 
          ...t_ui,
          enabled: updatedTransitionData.enabled
        } : { ...t_ui, enabled: false };
      });
      
      // Update transient animation state based on the outcome for the *active* page
      if (!conflictInfo.hasConflicts && responseEnabledTransitions.length > 0) {
         setCurrentFiredTransitions(responseEnabledTransitions);
      } else {
         setCurrentFiredTransitions([]); // Clear if conflict or no newly enabled transitions to fire
      }

      return {
        ...prevPages,
        [activePageId]: {
          ...pageToUpdate,
          places: updatedPagePlaces,
          transitions: updatedPageTransitions,
          conflictResolutionMode: conflictInfo.hasConflicts,
          conflictingTransitions: conflictInfo.conflictingTransitions,
        }
      };
    });
  }, [setPages, setCurrentFiredTransitions]);

  const updatePageAfterConflictResolution = useCallback((
    activePageId: string,
    responseData: PetriNetDTO,
    selectedTransitionId: string,
    conflictInfo: { hasConflicts: boolean; conflictingTransitions: string[] }
  ) => {
    setPages(prevPages => {
      const pageToUpdate = prevPages[activePageId];
      if (!pageToUpdate) return prevPages;

      const updatedPagePlaces = pageToUpdate.places.map(p_ui => {
        const updatedPlaceData = responseData.places.find(rp => rp.id === p_ui.id);
        
        const isRegularSourcePlace = pageToUpdate.arcs.some(arc => 
          arc.incomingId === p_ui.id && 
          arc.type === 'REGULAR' && 
          arc.outgoingId === selectedTransitionId
        );
        
        const isBidirectionalPlace = pageToUpdate.arcs.some(arc => 
          (arc.incomingId === p_ui.id || arc.outgoingId === p_ui.id) &&
          arc.type === 'BIDIRECTIONAL' && 
          (arc.incomingId === selectedTransitionId || arc.outgoingId === selectedTransitionId)
        );
        
        if (updatedPlaceData && isRegularSourcePlace) {
          return { ...p_ui, tokens: updatedPlaceData.tokens };
        } else if (isBidirectionalPlace) {
          // Decrement for bidirectional - this is the ONLY place it happens
          return { ...p_ui, tokens: Math.max(0, p_ui.tokens - 1) };
        }
        
        return p_ui;
      });

      const updatedPageTransitions = pageToUpdate.transitions.map(t_ui => {
        const updatedTransitionData = responseData.transitions?.find(rt => rt.id === t_ui.id);
        return updatedTransitionData ? { ...t_ui, enabled: updatedTransitionData.enabled } : { ...t_ui, enabled: false };
      });

      return {
        ...prevPages,
        [activePageId]: {
          ...pageToUpdate,
          places: updatedPagePlaces,
          transitions: updatedPageTransitions,
          conflictResolutionMode: conflictInfo.hasConflicts,
          conflictingTransitions: conflictInfo.conflictingTransitions,
        }
      };
    });
  }, [setPages]);

  const resetPage = useCallback((
    activePageId: string,
    pageToReset: PetriNetPageData
  ) => {
    setPages(prevPages => ({
      ...prevPages,
      [activePageId]: {
        id: pageToReset.id,
        title: pageToReset.title,
        places: [],
        transitions: [],
        arcs: [],
        deterministicMode: false,
        conflictResolutionMode: false,
        conflictingTransitions: [],
        selectedElements: [],
        history: { places: [], transitions: [], arcs: [], title: [] },
        zoomLevel: 1,
        panOffset: { x: 0, y: 0 }
      }
    }));
    setCurrentFiredTransitions([]);
  }, [setPages, setCurrentFiredTransitions]);

  return { updatePageAfterSimulation, updatePageAfterConflictResolution, resetPage };
}; 