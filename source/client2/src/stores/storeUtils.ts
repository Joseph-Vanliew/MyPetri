// Store utility functions for common store operations

import { create } from 'zustand';
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware';

// Type for store creation with common middleware
export type StoreCreator<T> = (
  set: (partial: T | Partial<T> | ((state: T) => T | Partial<T>)) => void,
  get: () => T
) => T;

// Helper to create a store with common middleware
export function createStore<T>(
  name: string,
  _initialState: T,
  actions: StoreCreator<T>
) {
  return create<T>()(
    devtools(
      persist(
        subscribeWithSelector(actions),
        {
          name,
          partialize: (state) => state, // Persist entire state
        }
      ),
      {
        name,
      }
    )
  );
}

// Helper to create a store without persistence
export function createEphemeralStore<T>(
  name: string,
  _initialState: T,
  actions: StoreCreator<T>
) {
  return create<T>()(
    devtools(
      subscribeWithSelector(actions),
      {
        name,
      }
    )
  );
}

// Helper to create a store with custom persistence
export function createPersistedStore<T>(
  name: string,
  _initialState: T,
  actions: StoreCreator<T>,
  persistConfig?: {
    partialize?: (state: T) => Partial<T>;
    version?: number;
  }
) {
  return create<T>()(
    devtools(
      persist(
        subscribeWithSelector(actions),
        {
          name,
          partialize: persistConfig?.partialize || ((state) => state),
          version: persistConfig?.version || 1,
        }
      ),
      {
        name,
      }
    )
  );
}

// Utility to get store state without subscription
export function getStoreState<T>(store: any): T {
  return store.getState();
}

// Utility to set store state
export function setStoreState<T>(
  store: any,
  partial: Partial<T> | ((state: T) => Partial<T>)
): void {
  store.setState(partial);
}

// Utility to subscribe to store changes
export function subscribeToStore<T>(
  store: any,
  selector: (state: T) => any,
  listener: (value: any, previousValue: any) => void
): () => void {
  return store.subscribe(selector, listener);
} 