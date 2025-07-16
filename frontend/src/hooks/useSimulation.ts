import { useCallback } from 'react';
import { PetriNetDTO, ValidationResult, PetriNetPageData } from '../types';
import { API_ENDPOINTS } from '../utils/api';
import { TokenAnimator } from '../animations/TokenAnimator';

interface UseSimulationProps {
  activePageId: string | null;
  activePageData: PetriNetPageData | null;
  setPages: React.Dispatch<React.SetStateAction<Record<string, PetriNetPageData>>>;
  setCurrentFiredTransitions: (transitions: string[]) => void;
  setProjectHasUnsavedChanges: (hasChanges: boolean) => void;
  setAnimationMessage: (message: string | null) => void;
  tokenAnimator: TokenAnimator;
  handleUndo: () => void;
}

export const useSimulation = ({
  activePageId,
  activePageData,
  setPages,
  setCurrentFiredTransitions,
  setProjectHasUnsavedChanges,
  setAnimationMessage,
  tokenAnimator,
  handleUndo
}: UseSimulationProps) => {
  
  // =========================================================================================
  // SIMULATION CONTROL
  // =========================================================================================
  
  const handleSimulate = useCallback(async () => {
    if (!activePageId || !activePageData) {
      console.log("No active page to simulate.");
      return;
    }
    
    // Check if animations are already running and prevent starting new ones
    if (tokenAnimator.hasActiveAnimations()) {
      console.log("Animation in progress. Please wait for it to complete.");
      setAnimationMessage("Animation in progress. Please wait.");
      // Clear the message after a delay
      setTimeout(() => setAnimationMessage(null), 2000);
      return;
    }
    
    setAnimationMessage(null);
    setCurrentFiredTransitions([]); 
    
    // Small delay to ensure the animation class is removed before adding it again
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // --- Prepare the Petri Net DTO for the simulation API ---
    const requestBody: PetriNetDTO = {
      places: activePageData.places.map(p => ({ 
        id: p.id, tokens: p.tokens, name: p.name, x: p.x, y: p.y, 
        radius: p.radius, bounded: p.bounded, capacity: p.capacity
      })),
      transitions: activePageData.transitions.map(t => ({
        id: t.id, enabled: t.enabled, arcIds: t.arcIds, name: t.name, 
        x: t.x, y: t.y, width: t.width, height: t.height
      })),
      arcs: activePageData.arcs.map(a => ({
        id: a.id, type: a.type, incomingId: a.incomingId, outgoingId: a.outgoingId,
      })),
      deterministicMode: activePageData.deterministicMode,
      title: activePageData.title 
    };

    try {
      // --- Simulate the Petri Net next state ---
      const apiUrl = `${API_ENDPOINTS.PROCESS}/page/${activePageId}/process`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error('Simulation API error:', response.status, errorBody);
        return;
      }

      const responseData: PetriNetDTO = await response.json();

      // Find which transitions fired and animate tokens
      const firedTransitions = responseData.transitions?.filter(t => t.enabled).map(t => ({
        ...t,
        name: t.name || '',  // Ensure name is never undefined
        x: t.x || 0,        // Provide defaults for required properties
        y: t.y || 0,
        width: t.width || 120,
        height: t.height || 54
      })) || [];
      
      // Update the active page's state
      setPages(prevPages => {
        const pageToUpdate = prevPages[activePageId!];
        if (!pageToUpdate) return prevPages;

        // Start animations for each fired transition
        const responseEnabledTransitions = responseData.transitions?.filter(t => t.enabled).map(t => t.id) || [];
        let newConflictResolutionMode = false;
        let newConflictingTransitions: string[] = [];
        
        // Track bidirectional places that need immediate token decrement
        const bidirectionalPlacesToDecrement = new Set<string>();

        // Check for conflicts first
        if (pageToUpdate.deterministicMode && responseEnabledTransitions.length > 1) {
          newConflictResolutionMode = true;
          newConflictingTransitions = responseEnabledTransitions;
          // Don't start animations if there's a conflict
          tokenAnimator.clear(); // Clear any ongoing animations
        } else {
          // Only start animations if there's no conflict
          firedTransitions.forEach(firedTransition => {
            // Find the transition object from the page data
            const transitionObj = pageToUpdate.transitions.find(t => t.id === firedTransition.id);
            if (!transitionObj) return;

            // Separate arcs by type for proper handling
            const regularInputArcs = pageToUpdate.arcs.filter(a => 
              a.outgoingId === firedTransition.id && a.type === 'REGULAR'
            );
            const regularOutputArcs = pageToUpdate.arcs.filter(a => 
              a.incomingId === firedTransition.id && a.type === 'REGULAR'
            );
            const bidirectionalArcs = pageToUpdate.arcs.filter(a =>
              (a.incomingId === firedTransition.id || a.outgoingId === firedTransition.id) && a.type === 'BIDIRECTIONAL'
            );

            // Handle regular input arcs (consumption only)
            regularInputArcs.forEach(inputArc => {
              const sourcePlace = pageToUpdate.places.find(p => p.id === inputArc.incomingId);
              if (sourcePlace) {
                tokenAnimator.startAnimation(
                  sourcePlace,
                  transitionObj,
                  transitionObj,
                  pageToUpdate.arcs,
                  () => {} // No callback needed for consumption
                );
              }
            });

            // Handle regular output arcs (production only)
            regularOutputArcs.forEach(outputArc => {
              const targetPlace = pageToUpdate.places.find(p => p.id === outputArc.outgoingId);
              if (targetPlace) {
                // Capture the final token value from responseData
                const finalTokens = responseData.places.find(rp => rp.id === targetPlace.id)?.tokens ?? targetPlace.tokens;
                
                tokenAnimator.startAnimation(
                  transitionObj,
                  targetPlace,
                  transitionObj,
                  pageToUpdate.arcs,
                  () => {
                    // Update target place tokens after animation completes
                    setPages(prevPages => {
                      const currentPage = prevPages[activePageId!];
                      if (!currentPage) return prevPages;

                      const updatedPlaces = currentPage.places.map(p => {
                        if (p.id === targetPlace.id) {
                          return { ...p, tokens: finalTokens };
                        }
                        return p;
                      });

                      return {
                        ...prevPages,
                        [activePageId!]: {
                          ...currentPage,
                          places: updatedPlaces
                        }
                      };
                    });
                  }
                );
              }
            });

            // Handle bidirectional arcs (consumption THEN production)
            bidirectionalArcs.forEach(bidirectionalArc => {
              const place = pageToUpdate.places.find(p => 
                p.id === bidirectionalArc.incomingId || p.id === bidirectionalArc.outgoingId
              );
              if (place) {
                const finalTokens = responseData.places.find(rp => rp.id === place.id)?.tokens ?? place.tokens;
                
                // Track this place for immediate token decrement
                bidirectionalPlacesToDecrement.add(place.id);
                
                tokenAnimator.startBidirectionalAnimation(
                  place,
                  transitionObj,
                  pageToUpdate.arcs,
                  () => {},
                  () => {
                    // Complete: restore final count
                    setPages(prevPages => {
                      const currentPage = prevPages[activePageId!];
                      if (!currentPage) return prevPages;
                      const updatedPlaces = currentPage.places.map(p => {
                        if (p.id === place.id) {
                          return { ...p, tokens: finalTokens };
                        }
                        return p;
                      });
                      return {
                        ...prevPages,
                        [activePageId!]: { ...currentPage, places: updatedPlaces }
                      };
                    });
                  }
                );
              }
            });
          });
        }

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
        if (!newConflictResolutionMode && responseEnabledTransitions.length > 0) {
           setCurrentFiredTransitions(responseEnabledTransitions);
        } else {
           setCurrentFiredTransitions([]); // Clear if conflict or no newly enabled transitions to fire
        }

        return {
          ...prevPages,
          [activePageId!]: {
            ...pageToUpdate,
            places: updatedPagePlaces,
            transitions: updatedPageTransitions,
            conflictResolutionMode: newConflictResolutionMode,
            conflictingTransitions: newConflictingTransitions,
          }
        };
      });
      setProjectHasUnsavedChanges(true);

    } catch (error) {
      console.error('Simulation error:', error);
    }
  }, [activePageId, activePageData, setPages, setCurrentFiredTransitions, setProjectHasUnsavedChanges, setAnimationMessage, tokenAnimator]);

  const continueSimulation = useCallback(async (selectedTransitionId: string) => {
    if (!activePageId || !activePageData) {
      console.log("No active page for conflict resolution.");
      return;
    }

    // Check if animations are already running and prevent starting new ones
    if (tokenAnimator.hasActiveAnimations()) {
      console.log("Animation in progress. Please wait for it to complete.");
      setAnimationMessage("Animation in progress. Please wait.");
      // Clear the message after a delay
      setTimeout(() => setAnimationMessage(null), 2000);
      return;
    }

    setAnimationMessage(null);
    setCurrentFiredTransitions([]); 
    await new Promise(resolve => setTimeout(resolve, 10));
    
    const tempUpdatedTransitions = activePageData.transitions.map(t => ({
      ...t,
      enabled: t.id === selectedTransitionId
    }));
    setPages(prev => ({ ...prev, [activePageId!]: { ...prev[activePageId!], transitions: tempUpdatedTransitions } }));
    
    // Set animation state for the selected transition
    setCurrentFiredTransitions([selectedTransitionId]);
    
    const requestBody = {
      // Construct DTO from activePageData
      places: activePageData.places.map(p => ({ 
         id: p.id, tokens: p.tokens, name: p.name, x: p.x, y: p.y,
         radius: p.radius, bounded: p.bounded, capacity: p.capacity
      })),
      transitions: activePageData.transitions.map(t => ({ // Send the original enabled state before temp update
         id: t.id, enabled: t.enabled, arcIds: t.arcIds, name: t.name, 
         x: t.x, y: t.y, width: t.width, height: t.height
      })),
      arcs: activePageData.arcs.map(a => ({
        id: a.id, type: a.type, incomingId: a.incomingId, outgoingId: a.outgoingId,
      })),
      selectedTransitionId, // Add the selected ID for the backend
      deterministicMode: activePageData.deterministicMode,
      title: activePageData.title
    };
    
    try {
      const apiUrl = `${API_ENDPOINTS.RESOLVE}/page/${activePageId}/resolve`; 
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
         const errorBody = await response.text();
         console.error('Conflict resolution API error:', response.status, errorBody);
         // Revert temporary UI update? Or show error? Reverting for now.
         setPages(prev => ({ ...prev, [activePageId!]: { ...prev[activePageId!], transitions: activePageData.transitions, conflictResolutionMode: false } })); // Revert transitions and exit conflict mode on error
         setCurrentFiredTransitions([]);
         return;
      }
      
      const responseData = await response.json() as PetriNetDTO;
      
      // Get the transition details
      const transitionObj = activePageData.transitions.find(t => t.id === selectedTransitionId);
      if (transitionObj) {
        // Set animation state for the transition
        setCurrentFiredTransitions([selectedTransitionId]);
        
        // Find input and output arcs for this transition
        const inputArcs = activePageData.arcs.filter(a => 
          a.outgoingId === selectedTransitionId && a.type !== 'INHIBITOR'
        );
        const outputArcs = activePageData.arcs.filter(a => 
          a.incomingId === selectedTransitionId
        );
        const bidirectionalArcs = activePageData.arcs.filter(a =>
          (a.incomingId === selectedTransitionId || a.outgoingId === selectedTransitionId) && a.type === 'BIDIRECTIONAL'
        );

        // Handle input arcs (consumption)
        inputArcs.forEach(inputArc => {
          const sourcePlace = activePageData.places.find(p => p.id === inputArc.incomingId);
          if (sourcePlace) {
            tokenAnimator.startAnimation(
              sourcePlace,
              transitionObj,
              transitionObj,
              activePageData.arcs,
              () => {} // No callback needed for consumption
            );
          }
        });
        
        // Track if this is the last animation to complete
        let outputArcCount = outputArcs.length;
        let completedAnimations = 0;

        // Handle output arcs (production) separately
        outputArcs.forEach(outputArc => {
          const targetPlace = activePageData.places.find(p => p.id === outputArc.outgoingId);
          if (targetPlace) {
            // Capture the final token value from responseData
            const finalTokens = responseData.places.find(rp => rp.id === targetPlace.id)?.tokens ?? targetPlace.tokens;
            
            tokenAnimator.startAnimation(
              transitionObj,
              targetPlace,
              transitionObj,
              activePageData.arcs,
              () => {
                // Update target place tokens after animation completes
                setPages(prevPages => {
                  const currentPage = prevPages[activePageId!];
                  if (!currentPage) return prevPages;

                  const updatedPlaces = currentPage.places.map(p => {
                    if (p.id === targetPlace.id) {
                      return { ...p, tokens: finalTokens };
                    }
                    return p;
                  });

                  return {
                    ...prevPages,
                    [activePageId!]: {
                      ...currentPage,
                      places: updatedPlaces
                    }
                  };
                });
                
                // Check if all animations are complete
                completedAnimations++;
                if (completedAnimations === outputArcCount) {
                  // Check for conflicts after all animations are done
                  setPages(prevPages => {
                    const currentPage = prevPages[activePageId!];
                    if (!currentPage) return prevPages;
                    
                    // If we have new conflicts, update the conflict state
                    if (currentPage.conflictResolutionMode) {
                      setCurrentFiredTransitions([]);
                    }
                    
                    return prevPages; // No changes needed, just checking state
                  });
                }
              }
            );
          }
        });
        
        // Handle bidirectional arcs (consumption THEN production)
        bidirectionalArcs.forEach(bidirectionalArc => {
          const place = activePageData.places.find(p => 
            p.id === bidirectionalArc.incomingId || p.id === bidirectionalArc.outgoingId
          );
          if (place) {
            const finalTokens = responseData.places.find(rp => rp.id === place.id)?.tokens ?? place.tokens;
            
            tokenAnimator.startBidirectionalAnimation(
              place,
              transitionObj,
              activePageData.arcs,
              () => {},
              () => {
                // Complete: restore final count
                setPages(prevPages => {
                  const currentPage = prevPages[activePageId!];
                  if (!currentPage) return prevPages;
                  const updatedPlaces = currentPage.places.map(p => {
                    if (p.id === place.id) {
                      return { ...p, tokens: finalTokens };
                    }
                    return p;
                  });
                  return {
                    ...prevPages,
                    [activePageId!]: { ...currentPage, places: updatedPlaces }
                  };
                });
              }
            );
          }
        });
        
        // If there are no output arcs, clear fired transitions immediately
        if (outputArcCount === 0) {
          setCurrentFiredTransitions([]);
        }
      }
      
      // Update page state based on response
      setPages(prevPages => {
        const pageToUpdate = prevPages[activePageId!];
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

        const responseEnabledTransitions = responseData.transitions?.filter(t => t.enabled).map(t => t.id) || [];
        let newConflictResolutionMode = false;
        let newConflictingTransitions: string[] = [];

        // Check if *still* in conflict after resolution (possible if the fired transition enables others)
        if (pageToUpdate.deterministicMode && responseEnabledTransitions.length > 1) {
           newConflictResolutionMode = true;
           newConflictingTransitions = responseEnabledTransitions;
           // Conflict state will be handled after animations complete
        } else {
           // No new conflicts
        }

        return {
          ...prevPages,
          [activePageId!]: {
            ...pageToUpdate,
            places: updatedPagePlaces,
            transitions: updatedPageTransitions,
            conflictResolutionMode: newConflictResolutionMode,
            conflictingTransitions: newConflictingTransitions,
          }
        };
      });
      setProjectHasUnsavedChanges(true); // Simulation/resolution changes data

    } catch (error) {
      console.error('Error resolving conflict:', error);
      // Revert UI state and exit conflict mode on unexpected error
      if (activePageId && activePageData) { // Check existence before accessing
         setPages(prev => ({ ...prev, [activePageId!]: { ...prev[activePageId!], transitions: activePageData.transitions, conflictResolutionMode: false } }));
      }
      setCurrentFiredTransitions([]);
    }
  }, [activePageId, activePageData, setPages, setCurrentFiredTransitions, setProjectHasUnsavedChanges, setAnimationMessage, tokenAnimator]);

  const handleCompleteAnimations = useCallback(() => {
    tokenAnimator.completeCurrentAnimations();
    setAnimationMessage(null);
  }, [tokenAnimator, setAnimationMessage]);

  const handleReset = useCallback(async () => {
    if (!activePageId || !activePageData) {
      console.log("No active page to reset.");
      return;
    }
    const pageToReset = activePageData; // Get page data before potential undo modifies it if undo is added back
    if (pageToReset.places.length > 0 || pageToReset.transitions.length > 0 || pageToReset.arcs.length > 0) {
      handleUndo(); // Save current state to history if not empty, then undo to "previous"
    }

    const defaultPageData: PetriNetPageData = {
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
    };

    setPages(prevPages => ({
      ...prevPages,
      [activePageId!]: defaultPageData
    }));
    setCurrentFiredTransitions([]);
    setProjectHasUnsavedChanges(true); // Resetting implies a change from the saved state
  }, [activePageId, activePageData, setPages, setCurrentFiredTransitions, setProjectHasUnsavedChanges, handleUndo]);

  // =========================================================================================
  // VALIDATION
  // =========================================================================================
  
  const handleValidationResult = useCallback((result: ValidationResult) => {
    // This function is called by the validation tool to handle validation results
    // The actual validation logic is handled in the validation tool itself
    console.log('Validation result received:', result);
  }, []);

  return {
    // Simulation control
    handleSimulate,
    continueSimulation,
    handleCompleteAnimations,
    handleReset,
    
    // Validation
    handleValidationResult,
  };
}; 