# Store Dependency Analysis

## Overview
This document analyzes the interdependencies between stores in `source/client2/src/stores/` and identifies potential confusion points.

## Store Dependency Graph

```
┌─────────────────┐
│  elementsStore  │◄──┐
└────────┬────────┘   │
         │            │ Circular Dependency!
         ▼            │
┌─────────────────┐   │
│  historyStore   │───┘
└─────────────────┘
         │
         │ (directly modifies elementsStore via setState)
         ▼

┌─────────────────┐
│ clipboardStore  │───► elementsStore
└────────┬────────┘
         │
         └───────────► projectStore
         │
         └───────────► (global hotkeys depend on projectStore)

┌─────────────────┐
│ Independent:    │
│ - canvasStore   │
│ - gridStore     │
│ - layoutStore   │
│ - toolbarStore  │
│ - projectStore  │
│ - fileManagerStore │
│ - analyzerStore │
│ - validatorStore │
│ - simulationStore │
│ - interactionStore │
└─────────────────┘
```

## Direct Store-to-Store Dependencies

### 1. elementsStore → historyStore
**Location:** `elementsStore.ts:6`
- **Type:** Import dependency
- **Usage:** Calls `useHistoryStore.getState().push()` to save history snapshots
- **Occurrences:** 5 places (lines 76, 94, 115, 142, 165)
- **Pattern:** Used within transaction management and element mutations

### 2. historyStore → elementsStore  
**Location:** `historyStore.ts:3`
- **Type:** Import dependency + Direct state manipulation
- **Usage:** 
  - Gets state: `useElementsStore.getState()`
  - **Directly sets state:** `useElementsStore.setState()` (lines 44, 61)
- **Pattern:** Undo/redo operations directly modify elementsStore state
- **⚠️ ISSUE:** This is a strong coupling - historyStore directly manipulates another store's state

### 3. clipboardStore → elementsStore + projectStore
**Location:** `clipboardStore.ts:4-5`
- **Type:** Import dependencies
- **Usage:**
  - Gets elements: `useElementsStore.getState()` (lines 22, 48)
  - Gets project: `useProjectStore.getState().project` (lines 121, 132)
- **Pattern:** Uses `.getState()` for read/write operations
- **Additional:** Global hotkeys in same file also depend on projectStore (lines 121, 132)

## Dependency Severity Analysis

### 🔴 HIGH COUPLING (Problematic)

#### Circular Dependency: elementsStore ↔ historyStore
- **Problem:** Bidirectional dependency creates tight coupling
- **Impact:** 
  - Makes it unclear which store "owns" history management
  - ElementsStore pushes snapshots to history, but historyStore directly modifies elementsStore
  - Could cause initialization order issues
- **Confusion Factor:** HIGH
  - Transaction management is in elementsStore but history operations are in historyStore
  - Unclear who controls the undo/redo flow

#### Direct State Manipulation: historyStore → elementsStore
- **Problem:** historyStore calls `useElementsStore.setState()` directly
- **Impact:**
  - Violates encapsulation - one store directly mutates another
  - Bypasses elementsStore's own update logic and validation
  - Makes testing harder (can't mock elementsStore easily)
- **Confusion Factor:** HIGH
  - When undoing, it's not immediately clear that elementsStore state changes come from historyStore

### 🟡 MODERATE COUPLING (Manageable but not ideal)

#### clipboardStore → elementsStore + projectStore
- **Pattern:** Uses `.getState()` for read operations and `.getState()` for action calls
- **Impact:** 
  - Coupling is through public API (getState), which is acceptable
  - However, clipboard operations depend on both stores working correctly
  - Global hotkeys add another layer of complexity
- **Confusion Factor:** MEDIUM
  - Hotkeys are defined in clipboardStore but depend on projectStore
  - Copy/paste logic needs to understand both element selection and active page

### 🟢 LOW COUPLING (Independent Stores)

The following stores have no direct dependencies on other stores:
- `canvasStore` - Canvas UI state only
- `gridStore` - Grid configuration only
- `layoutStore` - Layout state only
- `toolbarStore` - Tool selection only
- `projectStore` - Project/page data only
- `fileManagerStore` - File operation flags only
- `analyzerStore` - Analysis state only
- `validatorStore` - Validation state only
- `simulationStore` - Simulation state only
- `interactionStore` - Interaction version counter only

## Confusion Points

### 1. Mixed Access Patterns
- **Hooks:** Components typically use `useStore()` hooks
- **getState():** Stores call other stores using `.getState()` (e.g., clipboardStore, historyStore)
- **Direct setState:** historyStore calls `.setState()` on elementsStore
- **Issue:** Inconsistent patterns make it unclear how stores should interact

### 2. Transaction Management Split Between Stores
- **elementsStore** has `beginHistoryTransaction()` and `endHistoryTransaction()`
- But it calls **historyStore** to push snapshots
- **historyStore** manages the undo/redo stack
- **Confusion:** Why are transaction boundaries in elementsStore but undo/redo in historyStore?

### 3. Global Hotkeys in Store Files
- **clipboardStore** has global hotkey handlers that depend on projectStore
- **historyStore** has global hotkey handlers
- **Issue:** Stores are not just state management - they also have side effects and event handlers
- **Confusion:** Hard to test, and hotkeys are initialized globally, not per-component

### 4. Selection State Duplication
- **elementsStore** has `selectedElementIds` 
- **canvasStore** also has selection-related state (`selectionBox`, `isSelecting`)
- **Potential confusion:** Which store is the source of truth for selection?

### 5. Page Context Scattered
- **projectStore** manages active page
- **elementsStore** manages elements per page
- **clipboardStore** needs to know active page for hotkeys
- **Issue:** No single store owns "current page context" - it's spread across stores

## Recommendations

### Immediate Improvements

1. **Break Circular Dependency (elementsStore ↔ historyStore)**
   - Consider using an event/observer pattern
   - Or move transaction management entirely into historyStore
   - Or have elementsStore emit events that historyStore listens to

2. **Eliminate Direct State Manipulation**
   - historyStore should not call `setState` on elementsStore
   - Instead, historyStore should expose actions that elementsStore can call
   - Or use a middleware/plugin pattern for undo/redo

3. **Extract Global Hotkeys**
   - Move hotkey handlers out of store files
   - Create a dedicated hotkey service/hook
   - Keep stores focused on state management only

4. **Clarify Selection Ownership**
   - Decide whether elementsStore or canvasStore owns selection state
   - Or create a dedicated selectionStore

5. **Standardize Store Interactions**
   - Define guidelines: when to use hooks vs `.getState()`
   - Document when stores are allowed to call other stores
   - Consider a store registry pattern for complex interactions

### Architectural Improvements

1. **Separate Concerns**
   - Stores: State management only
   - Services: Business logic
   - Hooks: Component integration
   - Utilities: Cross-cutting concerns

2. **Event-Based Communication**
   - For stores that need to coordinate, use events
   - Reduces tight coupling
   - Makes dependencies more explicit

3. **Dependency Injection**
   - Pass store dependencies as parameters
   - Makes testing easier
   - Makes dependencies explicit in function signatures

## Summary

**Overall Assessment: MODERATE-HIGH CONFUSION**

The stores are **moderately to highly dependent** on each other, with:
- 1 circular dependency (elementsStore ↔ historyStore)
- 1 direct state manipulation (historyStore → elementsStore)
- Multiple stores reading from other stores via `.getState()`

**Main Confusion Points:**
1. Circular dependency makes ownership unclear
2. Direct state manipulation violates encapsulation
3. Mixed access patterns (hooks vs getState vs setState)
4. Global hotkeys mixed into store files
5. Selection state potentially duplicated
6. Transaction management split across stores

The codebase is **workable but could benefit from refactoring** to reduce coupling and clarify responsibilities.

