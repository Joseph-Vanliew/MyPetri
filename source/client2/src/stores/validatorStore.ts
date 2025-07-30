// Validator store for managing validation state

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { ValidationConfig, ValidationResult } from '../types/domain';

interface ValidatorStoreState {
  // Validation state
  isRunning: boolean;
  config: ValidationConfig | null;
  result: ValidationResult | null;
  
  // Actions
  setConfig: (config: ValidationConfig) => void;
  startValidation: () => void;
  setResult: (result: ValidationResult) => void;
  clearResult: () => void;
}

export const useValidatorStore = create<ValidatorStoreState>()(
  devtools(
    (set) => ({
      isRunning: false,
      config: null,
      result: null,

      setConfig: (config: ValidationConfig) => {
        set({ config });
      },

      startValidation: () => {
        set({ isRunning: true });
      },

      setResult: (result: ValidationResult) => {
        set({ result, isRunning: false });
      },

      clearResult: () => {
        set({ result: null });
      },
    }),
    {
      name: 'validator-store',
    }
  )
); 