## Client2 Feature Parity Checklist

- [✅] Arc creation workflow
  - [✅] Start/complete arcs by clicking ports on places/transitions
  - [✅] Arc preview while drawing (hover), snapping to source/target, cancel with Esc
  - [✅] Support arc types: Regular, Inhibitor (circle), Bidirectional (double arrows)
  - [✅] Maintain transition `arcIds` and cascade deletes when nodes removed

- [✅] Canvas selection and alignment
  - [✅] Click-drag selection box with multi-select
  - [✅] Alignment guides during drag (snap to edges/centers)
  - [✅] Modifier-aware behavior (Shift for multi-select)

- [ ] Element editing
  - [ ] Resize place radius
  - [ ] Resize transition width/height
  - [ ] Text box creation by drag-to-size
  - [ ] Direct text editing on canvas
  - [ ] Rich text for annotations (react-quill or alternative)
  - [ ] Place capacity editor (bounded/capacity with validation)
  - [ ] Token count editing
  - [ ] Rename elements from canvas

- [✅] Drag-and-drop from toolbar
  - [✅] Drop handling onto canvas for all tools (with snap/alignment)
  - [✅] Visual preview for arc tools over canvas

- [✅] Arc rendering quality
  - [✅] Compute anchor points on shapes (not center-to-center)
  - [✅] Proper markers per arc type; weights/labels if applicable

- [ ] Zoom/pan and view controls
  - [ ] Center view button in UI
  - [✅] Persist zoom/pan per page

- [ ] Clipboard and history
  - [✅] Copy/paste of selected elements (with offset)
  - [✅] Undo (Ctrl/Cmd+Z) for move/resize/create/delete/text edits
  - [✅] Delete key removes selection; Esc clears selection/tool

- [ ] Simulation
  - [ ] Play/step/reset controls
  - [ ] Fired transition highlighting
  - [ ] Conflict resolution mode (pick one transition)
  - [ ] Token animations layer
  - [ ] Speed control UI and behavior

- [ ] Right-side analysis/validation panel
  - [ ] Tabbed panel scaffold
  - [ ] Validator configs per page and results display
  - [ ] Analyzer hooks and results display

- [ ] Project/file operations (Menu bar)
  - [ ] New/Open/Save/Save As (File System Access API + fallback)
  - [ ] Export Project / Export Active Page
  - [ ] Import Pages
  - [ ] Legacy Import (Petri JSON)
  - [ ] Unsaved-changes indicator
  - [ ] Snapshot save/restore for page

- [ ] Pages management UX
  - [ ] Reorder pages via drag-and-drop
  - [ ] Page tab context menu: rename, duplicate, delete
  - [ ] Duplicate page (deep copy with new IDs)

- [ ] Backend/API integration
  - [✅] API client utils and types
  - [✅] Dev proxy for `/api` configured
  - [ ] Wire simulation/validation API calls and error handling

- [ ] Persistence and IDs
  - [x] Stable UUIDs for elements
  - [ ] Persist tool/UI settings as needed

- [✅] Keyboard shortcuts
  - [ ] Copy/Paste/Undo/Delete/Esc, guarded when typing

- [ ] Testing
  - [ ] Unit tests for stores and canvas utilities
  - [ ] E2E smoke tests for core flows (create/edit/connect/save)

- [ ] Performance and polish
  - [ ] Hover affordances on ports and selectable elements
  - [ ] Selection/resize handles
  - [ ] Large-canvas performance checks with many elements
