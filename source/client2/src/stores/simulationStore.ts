// Simulation store for managing simulation state

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { SimulationState, TokenAnimation } from '../types/domain';

interface SimulationStoreState extends SimulationState {
  // Actions
  startSimulation: () => void;
  pauseSimulation: () => void;
  stopSimulation: () => void;
  stepSimulation: () => void;
  setSpeed: (speed: number) => void;
  setMaxSteps: (maxSteps: number) => void;
  
  // Animation management
  animations: TokenAnimation[];
  addAnimation: (animation: TokenAnimation) => void;
  removeAnimation: (animationId: string) => void;
  clearAnimations: () => void;
  
  // Conflict resolution
  resolveConflict: (transitionId: string) => void;
  clearConflicts: () => void;
}

export const useSimulationStore = create<SimulationStoreState>()(
  devtools(
    (set, get) => ({
      isRunning: false,
      isPaused: false,
      currentStep: 0,
      maxSteps: 1000,
      speed: 1,
      firedTransitions: [],
      conflictingTransitions: [],
      conflictResolutionMode: false,
      animations: [],

      startSimulation: () => {
        set({ isRunning: true, isPaused: false });
      },

      pauseSimulation: () => {
        set({ isPaused: true });
      },

      stopSimulation: () => {
        set({ 
          isRunning: false, 
          isPaused: false, 
          currentStep: 0,
          firedTransitions: [],
          conflictingTransitions: [],
          conflictResolutionMode: false
        });
      },

      stepSimulation: () => {
        const { currentStep, maxSteps } = get();
        if (currentStep < maxSteps) {
          set({ currentStep: currentStep + 1 });
        }
      },

      setSpeed: (speed: number) => {
        set({ speed: Math.max(0.1, Math.min(5, speed)) });
      },

      setMaxSteps: (maxSteps: number) => {
        set({ maxSteps: Math.max(1, Math.min(10000, maxSteps)) });
      },

      addAnimation: (animation: TokenAnimation) => {
        const { animations } = get();
        set({ animations: [...animations, animation] });
      },

      removeAnimation: (animationId: string) => {
        const { animations } = get();
        set({ animations: animations.filter(a => a.id !== animationId) });
      },

      clearAnimations: () => {
        set({ animations: [] });
      },

      resolveConflict: (transitionId: string) => {
        const { conflictingTransitions } = get();
        set({ 
          conflictingTransitions: conflictingTransitions.filter(id => id !== transitionId),
          conflictResolutionMode: conflictingTransitions.length > 1
        });
      },

      clearConflicts: () => {
        set({ 
          conflictingTransitions: [],
          conflictResolutionMode: false
        });
      },
    }),
    {
      name: 'simulation-store',
    }
  )
); 