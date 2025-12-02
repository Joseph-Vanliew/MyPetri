import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { useElementsStore } from './elementsStore.js';
import { useHistoryStore } from './historyStore.js';
import type { Element, Arc } from '../types/domain.js';

interface ClipboardState {
  lastCopied: Element[] | null;
  copyFromSelection: (pageId: string) => void;
  pasteToPage: (pageId: string, offset?: number) => void;
}

const PASTE_OFFSET_DEFAULT = 20;

export const useClipboardStore = create<ClipboardState>()(
  devtools(
    (set, get) => ({
      lastCopied: null,

      copyFromSelection: (pageId: string) => {
        const elementsStore = useElementsStore.getState();
        const selected = elementsStore.getSelectedElements(pageId);
        if (!selected || selected.length === 0) {
          set({ lastCopied: null });
          return;
        }
        // Include arcs that connect between selected nodes, even if the arc itself isn't selected
        const all = elementsStore.getElements(pageId);
        const selectedNodeIds = new Set(
          selected.filter((e) => e.type === 'place' || e.type === 'transition' || e.type === 'text' || e.type === 'shape').map((e) => e.id)
        );
        const arcsToInclude = all.filter(
          (e: any) => e.type === 'arc' && selectedNodeIds.has(e.sourceId) && selectedNodeIds.has(e.targetId)
        );
        const selectedIds = new Set(selected.map((e) => e.id));
        const selectedArcs = all.filter((e: any) => e.type === 'arc' && selectedIds.has(e.id));
        const uniqueArcs: Arc[] = Array.from(new Map([...arcsToInclude, ...selectedArcs].map(a => [a.id, a as Arc])).values());
        const result: Element[] = [...selected, ...uniqueArcs];
        // Deep copy
        const snapshot = JSON.parse(JSON.stringify(result)) as Element[];
        set({ lastCopied: snapshot });
      },

      pasteToPage: (pageId: string, offset: number = PASTE_OFFSET_DEFAULT) => {
        const { lastCopied } = get();
        if (!lastCopied || lastCopied.length === 0) return;
        const elementsStore = useElementsStore.getState();
        const { addElement, selectElements } = elementsStore;
        const historyStore = useHistoryStore.getState();

        // Build ID remap
        const idRemap = new Map<string, string>();
        const nodes = lastCopied.filter((e) => e.type !== 'arc');
        nodes.forEach((e) => idRemap.set(e.id, uuidv4()));
        // Paste nodes
        historyStore.beginBatch();
        const newIds: string[] = [];
        nodes.forEach((e: any) => {
          const newId = idRemap.get(e.id)!;
          const cloned: any = { ...e, id: newId, x: e.x + offset, y: e.y + offset, createdAt: Date.now(), updatedAt: Date.now(), isSelected: false };
          if (cloned.type === 'place' && typeof cloned.radius === 'number') {
            cloned.width = cloned.radius * 2;
            cloned.height = cloned.radius * 2;
          }
          addElement(pageId, cloned);
          newIds.push(newId);
        });
        // Paste arcs where both endpoints were copied
        lastCopied.filter((e) => e.type === 'arc').forEach((a: any) => {
          const srcNew = idRemap.get(a.sourceId);
          const tgtNew = idRemap.get(a.targetId);
          if (srcNew && tgtNew) {
            const newArc: any = {
              ...a,
              id: uuidv4(),
              sourceId: srcNew,
              targetId: tgtNew,
              createdAt: Date.now(),
              updatedAt: Date.now(),
              isSelected: false,
            };
            addElement(pageId, newArc);
            newIds.push(newArc.id);
          }
        });
        // Select the newly pasted elements
        selectElements(pageId, newIds);

        // Update clipboard to the newly pasted set so subsequent pastes offset from the last paste
        const pasted = elementsStore.getElements(pageId).filter((e: any) => newIds.includes(e.id));
        set({ lastCopied: JSON.parse(JSON.stringify(pasted)) });

        historyStore.endBatch();
      },
    }),
    { name: 'clipboard-store' }
  )
);

// Note: Global hotkeys have been moved to src/services/hotkeys.ts
// to reduce coupling between stores
