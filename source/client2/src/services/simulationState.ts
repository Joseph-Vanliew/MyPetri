export const clampSimulationSpeed = (speed: number) =>
  Math.max(0.1, Math.min(5, speed));

export const clampSimulationMaxSteps = (maxSteps: number) =>
  Math.max(1, Math.min(10000, maxSteps));

export const getNextSimulationStep = (currentStep: number, maxSteps: number) =>
  currentStep < maxSteps ? currentStep + 1 : currentStep;

export const getStoppedSimulationPatch = () => ({
  isRunning: false,
  isPaused: false,
  currentStep: 0,
  firedTransitions: [],
  conflictingTransitions: [],
  conflictResolutionMode: false,
});

export const resolveTransitionConflictState = (conflictingTransitions: string[], transitionId: string) => {
  const updated = conflictingTransitions.filter(id => id !== transitionId);
  return {
    conflictingTransitions: updated,
    conflictResolutionMode: updated.length > 1,
  };
};

export const clearTransitionConflictsState = () => ({
  conflictingTransitions: [],
  conflictResolutionMode: false,
});

