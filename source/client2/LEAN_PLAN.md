## Lean Codebase Plan

Track the agreed-upon refactors so they survive window refreshes. Check items off as you complete them.

1. **Project snapshot refactor**
   - Merge `projectStore` metadata with `elementsStore.elementsByPage` when saving/loading/exporting.
   - Remove the unused `PageData.elements` array so element data has a single source of truth.
   - **Notes:** Introduce a serializer module that talks to stores via actions so we never mutate store internals mid-refactor. Add unit/integration tests around save/load to ensure history, undo, clipboard, and grid still behave.

2. **Tool types cleanup**
   - Consolidate `features/tools/types/index.ts` and `features/tools/types/ToolTypes.ts` into one module.
   - **Notes:** Update all imports in a single pass to avoid circular references. Run `tsc --noEmit` after the change to catch duplicate identifier/path issues.

3. **Dead code & globals**
   - Remove unused imports (e.g., `getElementBounds` in `useGridTileExtension`) and eliminate `window.__store__` leaks.

4. **Zustand selector pass**
   - Switch high-traffic components (Canvas, Place, Transition, Arc, DragPreview) to `useStore(selector, shallow)` and pass derived data via props.
   - **Notes:** After each component change, run the interaction checklist (place, drag, arc connect, selection box, copy/paste, undo). Watch for stale closures when lifting state out of components.

5. **Import normalization**
   - Drop `.js` extensions from TypeScript imports (use extensionless or `.ts/.tsx`) so tooling stays consistent.
   - **Notes:** Make the change repo-wide in one commit so Vite/Jest/Storybook stay aligned, and rerun `vite build` plus `tsc` to confirm resolution still works.

6. **Service extraction**
   - Move file I/O, serialization, and upcoming simulation helpers into `src/services/*` modules to keep stores/UI thin.
   - **Notes:** Extract pure helpers first so store APIs remain stable; once the layer exists, add integration tests for save/load/export to catch regressions.

7. **Micro-docs / extension points**
   - Add short READMEs or inline doc comments to each store/feature describing responsibilities and how to extend them.
   - **Notes:** Keep documentation concise to avoid drift. Consider updating the PR template/checklist to remind contributors to touch docs when store contracts change.

8. **Hook audit**
   - Flesh out or remove placeholder hooks/folders (e.g., empty `features/tools/hooks`) and fix hook signatures such as `usePlaceEditing`/`useTransitionEditing`.
   - **Notes:** Confirm no pending branches rely on placeholders before deleting them. When updating hook signatures, touch all consumers and manually test inline editing (labels/tokens) to ensure persistence still works.

