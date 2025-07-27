import { useCallback } from 'react';
import { UITransition, PetriNetDTO } from '../../types';

export interface ConflictInfo {
  hasConflicts: boolean;
  conflictingTransitions: string[];
}

export const useConflictResolution = () => {
  const detectConflicts = useCallback((transitions: UITransition[], deterministicMode: boolean): ConflictInfo => {
    if (!deterministicMode) {
      return { hasConflicts: false, conflictingTransitions: [] };
    }

    const enabledTransitions = transitions.filter(t => t.enabled);
    
    if (enabledTransitions.length > 1) {
      return {
        hasConflicts: true,
        conflictingTransitions: enabledTransitions.map(t => t.id)
      };
    }

    return { hasConflicts: false, conflictingTransitions: [] };
  }, []);

  const checkForNewConflicts = useCallback((responseData: PetriNetDTO, deterministicMode: boolean): ConflictInfo => {
    if (!deterministicMode) {
      return { hasConflicts: false, conflictingTransitions: [] };
    }

    const responseEnabledTransitions = responseData.transitions?.filter(t => t.enabled).map(t => t.id) || [];
    
    if (responseEnabledTransitions.length > 1) {
      return {
        hasConflicts: true,
        conflictingTransitions: responseEnabledTransitions
      };
    }

    return { hasConflicts: false, conflictingTransitions: [] };
  }, []);

  return { detectConflicts, checkForNewConflicts };
}; 