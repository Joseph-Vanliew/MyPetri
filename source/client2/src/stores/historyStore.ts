import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { useElementsStore } from './elementsStore.js';

export interface HistorySnapshot {
  elementsByPage: ReturnType<typeof useElementsStore.getState>['elementsByPage'];
  selectedElementIds: ReturnType<typeof useElementsStore.getState>['selectedElementIds'];
}

interface HistoryState {
  past: HistorySnapshot[];
  future: HistorySnapshot[];
  push: (snapshot: HistorySnapshot) => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  undo: () => void;
  redo: () => void;
  clear: () => void;
}

export const useHistoryStore = create<HistoryState>()(
  devtools(
    (set, get) => ({
      past: [],
      future: [],

      push: (snapshot: HistorySnapshot) => {
        set({ past: [...get().past, snapshot], future: [] });
      },

      canUndo: () => get().past.length > 0,
      canRedo: () => get().future.length > 0,

      undo: () => {
        const { past, future } = get();
        if (past.length === 0) return;
        const prev = past[past.length - 1];
        const now = useElementsStore.getState();
        const currentSnapshot: HistorySnapshot = {
          elementsByPage: structuredClone(now.elementsByPage),
          selectedElementIds: structuredClone(now.selectedElementIds),
        };
        // Apply previous
        useElementsStore.setState({
          elementsByPage: structuredClone(prev.elementsByPage),
          selectedElementIds: structuredClone(prev.selectedElementIds),
        });
        set({ past: past.slice(0, -1), future: [currentSnapshot, ...future] });
      },

      redo: () => {
        const { past, future } = get();
        if (future.length === 0) return;
        const next = future[0];
        const now = useElementsStore.getState();
        const currentSnapshot: HistorySnapshot = {
          elementsByPage: structuredClone(now.elementsByPage),
          selectedElementIds: structuredClone(now.selectedElementIds),
        };
        // Apply next
        useElementsStore.setState({
          elementsByPage: structuredClone(next.elementsByPage),
          selectedElementIds: structuredClone(next.selectedElementIds),
        });
        set({ past: [...past, currentSnapshot], future: future.slice(1) });
      },

      clear: () => set({ past: [], future: [] }),
    }),
    { name: 'history-store' }
  )
);

// Global, centralized hotkey installation (idempotent)
let historyHotkeysInstalled = false;
let historyHotkeysCleanup: (() => void) | null = null;

export const ensureHistoryHotkeysInstalled = () => {
  if (historyHotkeysInstalled) return;
  if (typeof window === 'undefined') return;
  const handler = (e: KeyboardEvent) => {
    // Ignore when typing in inputs/textareas/contenteditable
    const target = e.target as HTMLElement | null;
    const isTyping = !!target && (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    );
    if (isTyping) return;
    const isMac = navigator.platform.toUpperCase().includes('MAC');
    const mod = isMac ? e.metaKey : e.ctrlKey;
    const key = (e.key || '').toLowerCase();
    const isZ = key === 'z' || e.code === 'KeyZ';
    const isY = key === 'y' || e.code === 'KeyY';
    const alt = e.altKey;
    // Primary: Cmd/Ctrl+Z (Undo), Cmd/Ctrl+Shift+Z (Redo)
    // Fallback: Cmd/Ctrl+Alt+Z (Undo), Cmd/Ctrl+Alt+Shift+Z (Redo) for browsers that reserve primary
    const undoCombo = (mod && isZ && !e.shiftKey) || (mod && isZ && alt && !e.shiftKey);
    const redoCombo = (mod && isZ && e.shiftKey) || (!isMac && mod && isY) || (mod && isZ && alt && e.shiftKey);
    if (undoCombo) {
      e.preventDefault();
      e.stopPropagation();
      // @ts-ignore
      if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
      // Debug: log that we captured undo hotkey
      // Remove or guard behind an env flag when shipping
      console.log('[History] Undo hotkey captured');
      useHistoryStore.getState().undo();
    } else if (redoCombo) {
      e.preventDefault();
      e.stopPropagation();
      // @ts-ignore
      if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
      console.log('[History] Redo hotkey captured');
      useHistoryStore.getState().redo();
    }
  };
  window.addEventListener('keydown', handler, true);
  document.addEventListener('keydown', handler, false);
  historyHotkeysCleanup = () => {
    window.removeEventListener('keydown', handler, true);
    document.removeEventListener('keydown', handler, false);
  };
  historyHotkeysInstalled = true;
};

export const removeHistoryHotkeys = () => {
  if (historyHotkeysCleanup) {
    historyHotkeysCleanup();
    historyHotkeysCleanup = null;
    historyHotkeysInstalled = false;
  }
};
