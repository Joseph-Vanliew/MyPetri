import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface InteractionState {
  interactionVersion: number;
  bumpInteraction: () => void;
}

export const useInteractionStore = create<InteractionState>()(
  devtools(
    (set, get) => ({
      interactionVersion: 0,
      bumpInteraction: () => set({ interactionVersion: get().interactionVersion + 1 }),
    }),
    { name: 'interaction-store' }
  )
);
