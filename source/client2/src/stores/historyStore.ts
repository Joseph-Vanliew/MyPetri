import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { useElementsStore } from './elementsStore';
import type { ElementsState } from './elementsStore';

export interface HistorySnapshot {
  elementsByPage: ElementsState['elementsByPage'];
  selectedElementIds: ElementsState['selectedElementIds'];
}

interface HistoryState {
  past: HistorySnapshot[];
  future: HistorySnapshot[];
  _isApplyingHistory: boolean; // Flag to prevent history recording during undo/redo
  _isBatching: boolean; // Flag to batch multiple changes into one history entry
  _batchedSnapshot: HistorySnapshot | null; // Snapshot at start of batch
  
  // Internal: push snapshot (called by history subscription)
  _pushSnapshot: (snapshot: HistorySnapshot) => void;
  
  // Batching API for operations that should be grouped (e.g., drag operations)
  beginBatch: () => void;
  endBatch: () => void;
  
  // Public API
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
      _isApplyingHistory: false,
      _isBatching: false,
      _batchedSnapshot: null,

      _pushSnapshot: (snapshot: HistorySnapshot) => {
        // Don't record history while applying history (undo/redo)
        if (get()._isApplyingHistory) return;
        
        // If batching, save the first snapshot but don't push yet
        if (get()._isBatching) {
          if (!get()._batchedSnapshot) {
            set({ _batchedSnapshot: snapshot });
          }
          return;
        }
        
        set({ past: [...get().past, snapshot], future: [] });
      },

      beginBatch: () => {
        const elementsStore = useElementsStore.getState();
        const snapshot: HistorySnapshot = {
          elementsByPage: structuredClone(elementsStore.elementsByPage),
          selectedElementIds: structuredClone(elementsStore.selectedElementIds),
        };
        set({ _isBatching: true, _batchedSnapshot: snapshot });
      },

      endBatch: () => {
        const { _batchedSnapshot, _isBatching } = get();
        if (_isBatching && _batchedSnapshot) {
          set({ past: [...get().past, _batchedSnapshot], future: [] });
        }
        set({ _isBatching: false, _batchedSnapshot: null });
      },

      canUndo: () => get().past.length > 0,
      canRedo: () => get().future.length > 0,

      undo: () => {
        const { past, future } = get();
        if (past.length === 0) return;
        
        const prev = past[past.length - 1];
        const elementsStore = useElementsStore.getState();
        
        // Get current state for redo
        const currentSnapshot: HistorySnapshot = {
          elementsByPage: structuredClone(elementsStore.elementsByPage),
          selectedElementIds: structuredClone(elementsStore.selectedElementIds),
        };
        
        // Set flag to prevent recording this change
        set({ _isApplyingHistory: true });
        
        // Apply previous state using elementsStore's update methods
        // We need to restore the entire state, so we'll use setState for this special case
        // but only during undo/redo operations
        useElementsStore.setState({
          elementsByPage: structuredClone(prev.elementsByPage),
          selectedElementIds: structuredClone(prev.selectedElementIds),
        });
        
        // Reset flag
        set({ 
          _isApplyingHistory: false,
          past: past.slice(0, -1), 
          future: [currentSnapshot, ...future] 
        });
      },

      redo: () => {
        const { past, future } = get();
        if (future.length === 0) return;
        
        const next = future[0];
        const elementsStore = useElementsStore.getState();
        
        // Get current state for undo
        const currentSnapshot: HistorySnapshot = {
          elementsByPage: structuredClone(elementsStore.elementsByPage),
          selectedElementIds: structuredClone(elementsStore.selectedElementIds),
        };
        
        // Set flag to prevent recording this change
        set({ _isApplyingHistory: true });
        
        // Apply next state
        useElementsStore.setState({
          elementsByPage: structuredClone(next.elementsByPage),
          selectedElementIds: structuredClone(next.selectedElementIds),
        });
        
        // Reset flag
        set({ 
          _isApplyingHistory: false,
          past: [...past, currentSnapshot], 
          future: future.slice(1) 
        });
      },

      clear: () => set({ past: [], future: [] }),
    }),
    { name: 'history-store' }
  )
);

// History subscription: automatically record changes to elementsStore
// This breaks the circular dependency by making historyStore observe elementsStore,
// rather than elementsStore calling historyStore
let historySubscriptionActive = false;

const getStructuralElementsSignature = (elementsByPage: ElementsState['elementsByPage']) => {
  const sanitized: Record<string, unknown> = {};
  Object.entries(elementsByPage).forEach(([pageId, elements]) => {
    sanitized[pageId] = elements.map((element: any) => {
      const { isSelected, ...rest } = element;
      return rest;
    });
  });
  return JSON.stringify(sanitized);
};

export const initializeHistorySubscription = () => {
  if (historySubscriptionActive || typeof window === 'undefined') return;
  
  let baselineSnapshot: HistorySnapshot | null = null;
  let baselineSignature: string | null = null;
  
  const unsubscribe = useElementsStore.subscribe(
    (state) => {
      const currentSnapshot: HistorySnapshot = {
        elementsByPage: state.elementsByPage,
        selectedElementIds: state.selectedElementIds,
      };
      const currentSignature = getStructuralElementsSignature(state.elementsByPage);
      
      // Only record if not applying history and state actually changed
      const historyStore = useHistoryStore.getState();
      if (historyStore._isBatching) {
        baselineSnapshot = structuredClone(currentSnapshot);
        baselineSignature = currentSignature;
        return;
      }
      if (historyStore._isApplyingHistory) {
        baselineSnapshot = structuredClone(currentSnapshot);
        baselineSignature = currentSignature;
        return;
      }
      
      if (baselineSnapshot === null || baselineSignature === null) {
        baselineSnapshot = structuredClone(currentSnapshot);
        baselineSignature = currentSignature;
        return;
      }
      
      if (baselineSignature !== currentSignature) {
        historyStore._pushSnapshot(baselineSnapshot);
        baselineSnapshot = structuredClone(currentSnapshot);
        baselineSignature = currentSignature;
      }
    }
  );
  
  historySubscriptionActive = true;
  
  // Return cleanup function
  return () => {
    unsubscribe();
    historySubscriptionActive = false;
    baselineSnapshot = null;
    baselineSignature = null;
  };
};
