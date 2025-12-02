## Feature Modules

Quick map of the primary feature directories and how to extend them safely.

| Feature | Location | Responsibilities | Extension Notes |
| --- | --- | --- | --- |
| Canvas | `features/canvas` | SVG rendering, pan/zoom, selection box, grid tiling, drag interactions and arc handlers. | Use selectors in components to avoid store thrash. Hooks such as `useElementDrag`, `useCanvasInteractions`, and `useGridTileExtension` should stay side-effect free and depend only on their inputs. |
| Elements | `features/elements` | Reusable element components, editing hooks, registry metadata (default sizes, behaviors). | When adding an element type, touch the registry (`ElementTypes`, `ElementBehaviors`), extend creation helpers in `elementsStore`, and update toolbar/tool handlers. |
| Tools | `features/tools` | Toolbar UI, drag preview, tool metadata/icons. | Keep drag/drop logic encapsulated in `DragPreview` and the toolbar store. When adding tool options, wire them into `toolbarStore.toolOptions` and the left sidebar. |
| Project Menus | `features/project` | File/Edit menu components, wiring into `projectStore`. | Use the IO helpers in `services/projectIO` rather than handling FileReaders directly. |
| Simulation | `simulation/*` | Placeholder components/hooks/services for runtime simulation. | Core state management is in `simulationStore` + `services/simulationState`. Renderers/hooks should react to store slices and never mutate store state directly. |

### Adding a New Feature Folder

1. Co-locate React components, hooks, and handlers inside the feature directory.
2. Place reusable logic in `src/services` or `src/utils` rather than new stores unless state truly needs to be global.
3. Update this document with a short entry so future contributors know where to plug in related work.

