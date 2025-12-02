## Store Responsibilities

Reference guide for the main Zustand stores. Use it as the first stop when adding new behaviors or wiring up UI features.

| Store | Purpose | Key Actions | Extension Tips |
| --- | --- | --- | --- |
| `projectStore` | Owns project metadata (id, name, pages, active page). Coordinates snapshot import/export with `elementsStore`. | `createProject`, `loadProject`, `saveProject`, `exportProject`, `importProject`, page CRUD. | Use `services/projectSnapshot` + `services/projectIO` for persistence concerns. Keep new actions limited to metadata; element mutations belong in `elementsStore`. |
| `elementsStore` | Source of truth for every Petri-net element keyed by page. Handles selection and element CRUD helpers. | `addElement`, `updateElement`, `selectElement(s)`, `createPlace/Transition/...`, `loadElements`. | When adding new element types, update registry defaults, extend creation helpers, and ensure history snapshots still serialize correctly. |
| `canvasStore` | Tracks canvas presentation state (zoom, pan, viewBox, selection box, grid tiles). | `setZoomLevel`, `setPanOffset`, `setActivePage`, `initializeGridTiles`, `setSelectionBox`, `setIsSelecting`. | Keep this store UI-focused; element data should not leak in. Use selectors (e.g., `useShallow`) when consuming to avoid rerender storms. |
| `toolbarStore` | Manages selected tool, tool options, arc drawing state, and drag preview metadata. | `setSelectedTool`, `setToolOption`, `setArcDrawingStartId`, `startDragFromToolbar`, `updateDragPreviewPosition`. | When adding tools, extend `defaultTools`, `defaultToolOptions`, and update toolbar components + interactions. |
| `gridStore` | User-configurable grid preferences (size, toggles). | `setGridSize`, `setMajorGridWidthMultiplier`, `toggleGrid`, `toggleSnapToGrid`. | Great place to add future UI toggles (e.g., grid themes). Avoid canvas-specific logic here. |
| `simulationStore` | Holds simulation runtime state plus animation bookkeeping. Business logic lives in `services/simulationState`. | `startSimulation`, `pauseSimulation`, `stopSimulation`, `stepSimulation`, `setSpeed`, `addAnimation`, etc. | If simulation rules grow, add helpers in `services/simulationState` (or new services) and call them here to keep the store declarative. |
| `historyStore` | Time-travel stack for element edits. Subscribes to `elementsStore` to record snapshots. | `undo`, `redo`, `beginBatch`, `endBatch`, `clear`. | When new stores need history support, prefer event-based syncing instead of direct cross-updates to avoid tight coupling. |
| `clipboardStore` | Implements copy/paste semantics for selected elements plus connected arcs. | `copyFromSelection`, `pasteToPage`. | Use this to centralize future transformations (offset strategies, format conversions) before elements get inserted. |

### Adding or Updating Stores

1. Document the new state shape here and describe how other modules should interact with it.
2. Export the store via `src/stores/index.ts` only if it must be globally available; otherwise prefer local imports to reduce re-rendering.
3. Keep any non-trivial business logic in `src/services` so stores remain focused on wiring state.

