import { useCallback } from 'react';
import { PetriNetDTO, ValidationResult, UseSimulationProps, createDefaultPageData } from '../../types';
import { useSimulationAPI } from './useSimulationAPI';
import { useAnimationManager } from './useAnimationManager';
import { useConflictResolution } from './useConflictResolution';
import { useSimulationState } from './useSimulationState';

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
  
  // Initialize specialized hooks
  const api = useSimulationAPI();
  const animations = useAnimationManager(tokenAnimator);
  const conflicts = useConflictResolution();
  const state = useSimulationState(setPages, setCurrentFiredTransitions);
  
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
      setTimeout(() => setAnimationMessage(null), 2000);
      return;
    }
    
    setAnimationMessage(null);
    setCurrentFiredTransitions([]); 
    
    // Small delay to ensure the animation class is removed before adding it again
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // Prepare the Petri Net DTO for the simulation API
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
      // Simulate the Petri Net next state
      const responseData = await api.simulatePetriNet(activePageId, requestBody);

      // Find which transitions fired and animate tokens
      const firedTransitions = responseData.transitions?.filter(t => t.enabled).map(t => ({
        ...t,
        name: t.name || '',
        x: t.x || 0,
        y: t.y || 0,
        width: t.width || 120,
        height: t.height || 54
      })) || [];
      
      // Check for conflicts
      const conflictInfo = conflicts.checkForNewConflicts(responseData, activePageData.deterministicMode);
      
      // Track bidirectional places that need immediate token decrement
      const bidirectionalPlacesToDecrement = new Set<string>();
      
      if (conflictInfo.hasConflicts) {
        // Don't start animations if there's a conflict
        tokenAnimator.clear();
      } else {
        // Start animations for each fired transition
        animations.startFiredTransitionAnimations(
          firedTransitions,
          activePageData,
          responseData,
          setPages,
          activePageId
        );
      }

      // Update page state
      state.updatePageAfterSimulation(activePageId, responseData, conflictInfo, bidirectionalPlacesToDecrement);
      setProjectHasUnsavedChanges(true);

    } catch (error) {
      console.error('Simulation error:', error);
    }
  }, [activePageId, activePageData, tokenAnimator, setAnimationMessage, setCurrentFiredTransitions, api, animations, conflicts, state, setProjectHasUnsavedChanges]);

  const continueSimulation = useCallback(async (selectedTransitionId: string) => {
    if (!activePageId || !activePageData) {
      console.log("No active page for conflict resolution.");
      return;
    }

    // Check if animations are already running and prevent starting new ones
    if (tokenAnimator.hasActiveAnimations()) {
      console.log("Animation in progress. Please wait for it to complete.");
      setAnimationMessage("Animation in progress. Please wait.");
      setTimeout(() => setAnimationMessage(null), 2000);
      return;
    }

    setAnimationMessage(null);
    setCurrentFiredTransitions([]); 
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // Set animation state for the selected transition
    setCurrentFiredTransitions([selectedTransitionId]);
    
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
      const responseData = await api.resolveConflict(activePageId, requestBody, selectedTransitionId);
      
      // Get the transition details
      const transitionObj = activePageData.transitions.find(t => t.id === selectedTransitionId);
      if (transitionObj) {
        // Start animations for the selected transition
        animations.startTransitionAnimations(
          transitionObj,
          activePageData.arcs,
          activePageData.places,
          () => {
            // Check for conflicts after all animations are done
            const newConflictInfo = conflicts.checkForNewConflicts(responseData, activePageData.deterministicMode);
            if (newConflictInfo.hasConflicts) {
              setCurrentFiredTransitions([]);
            }
          }
        );
      }
      
      // Check for new conflicts after resolution
      const conflictInfo = conflicts.checkForNewConflicts(responseData, activePageData.deterministicMode);
      
      // Update page state
      state.updatePageAfterConflictResolution(activePageId, responseData, selectedTransitionId, conflictInfo);
      setProjectHasUnsavedChanges(true);

    } catch (error) {
      console.error('Error resolving conflict:', error);
      // Revert UI state and exit conflict mode on unexpected error
      if (activePageId && activePageData) {
         setPages(prev => ({ 
           ...prev, 
           [activePageId]: { 
             ...prev[activePageId], 
             transitions: activePageData.transitions, 
             conflictResolutionMode: false 
           } 
         }));
      }
      setCurrentFiredTransitions([]);
    }
  }, [activePageId, activePageData, tokenAnimator, setAnimationMessage, setCurrentFiredTransitions, api, animations, conflicts, state, setProjectHasUnsavedChanges, setPages]);

  const handleCompleteAnimations = useCallback(() => {
    tokenAnimator.completeCurrentAnimations();
    setAnimationMessage(null);
  }, [tokenAnimator, setAnimationMessage]);

  const handleReset = useCallback(async () => {
    if (!activePageId || !activePageData) {
      console.log("No active page to reset.");
      return;
    }
    
    const pageToReset = activePageData;
    if (pageToReset.places.length > 0 || pageToReset.transitions.length > 0 || pageToReset.arcs.length > 0) {
      handleUndo(); // Save current state to history if not empty, then undo to "previous"
    }

    const defaultPageData = createDefaultPageData(pageToReset.id, pageToReset.title);
    state.resetPage(activePageId, defaultPageData);
    setProjectHasUnsavedChanges(true);
  }, [activePageId, activePageData, handleUndo, state, setProjectHasUnsavedChanges]);

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