// Analyzer store for managing analysis state

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { AnalysisConfig, AnalysisResult } from '../types/domain';

interface AnalyzerStoreState {
  // Analysis state
  isRunning: boolean;
  config: AnalysisConfig | null;
  result: AnalysisResult | null;
  
  // Actions
  setConfig: (config: AnalysisConfig) => void;
  startAnalysis: () => void;
  setResult: (result: AnalysisResult) => void;
  clearResult: () => void;
}

export const useAnalyzerStore = create<AnalyzerStoreState>()(
  devtools(
    (set) => ({
      isRunning: false,
      config: null,
      result: null,

      setConfig: (config: AnalysisConfig) => {
        set({ config });
      },

      startAnalysis: () => {
        set({ isRunning: true });
      },

      setResult: (result: AnalysisResult) => {
        set({ result, isRunning: false });
      },

      clearResult: () => {
        set({ result: null });
      },
    }),
    {
      name: 'analyzer-store',
    }
  )
); 