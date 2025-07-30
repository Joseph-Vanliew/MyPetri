// File manager store for managing file operations state

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface FileManagerStoreState {
  // File operation state
  isSaving: boolean;
  isLoading: boolean;
  isExporting: boolean;
  lastSaved: Date | null;
  
  // Actions
  setSaving: (isSaving: boolean) => void;
  setLoading: (isLoading: boolean) => void;
  setExporting: (isExporting: boolean) => void;
  setLastSaved: (date: Date) => void;
}

export const useFileManagerStore = create<FileManagerStoreState>()(
  devtools(
    (set) => ({
      isSaving: false,
      isLoading: false,
      isExporting: false,
      lastSaved: null,

      setSaving: (isSaving: boolean) => {
        set({ isSaving });
      },

      setLoading: (isLoading: boolean) => {
        set({ isLoading });
      },

      setExporting: (isExporting: boolean) => {
        set({ isExporting });
      },

      setLastSaved: (date: Date) => {
        set({ lastSaved: date });
      },
    }),
    {
      name: 'file-manager-store',
    }
  )
); 