# Store Refactoring Summary

## Overview
This document summarizes the refactoring changes made to reduce coupling between stores.

## Changes Made

### 1. Extracted Global Hotkeys to Service Layer
**File Created:** `src/services/hotkeys.ts`
- Moved all global hotkey handlers from store files to a dedicated service
- Separates concerns: stores manage state, services handle side effects
- Makes hotkey handling easier to test and maintain

**Before:** Hotkeys were mixed into `historyStore.ts` and `clipboardStore.ts`  
**After:** All hotkeys centralized in `services/hotkeys.ts`

### 2. Broke Circular Dependency: elementsStore ↔ historyStore

#### elementsStore.ts
**Changes:**
- ✅ Removed import of `historyStore`
- ✅ Removed `beginHistoryTransaction()` and `endHistoryTransaction()` methods
- ✅ Removed all `useHistoryStore.getState().push()` calls
- ✅ Removed internal transaction tracking (`_historyTxnDepth`, `_historySnapshot`)
- ✅ Exported `ElementsState` interface for use by historyStore

**Result:** elementsStore is now **completely independent** - no dependencies on other stores

#### historyStore.ts
**Changes:**
- ✅ Now subscribes to `elementsStore` changes instead of being called by it
- ✅ Added `initializeHistorySubscription()` function to set up automatic history recording
- ✅ Added batching API (`beginBatch()`, `endBatch()`) for operations that should be grouped
- ✅ Added `_isApplyingHistory` flag to prevent recording changes during undo/redo
- ✅ Still uses `setState()` on elementsStore for undo/redo (necessary for restoring state)

**Result:** One-way dependency - historyStore depends on elementsStore, but not vice versa

### 3. Updated Component Usage

#### useElementDrag.ts
**Changes:**
- ✅ Replaced `useElementsStore.getState().beginHistoryTransaction()` with `useHistoryStore.getState().beginBatch()`
- ✅ Replaced `useElementsStore.getState().endHistoryTransaction()` with `useHistoryStore.getState().endBatch()`

#### clipboardStore.ts
**Changes:**
- ✅ Added import of `useHistoryStore`
- ✅ Replaced transaction methods with `beginBatch()` / `endBatch()` for paste operations
- ✅ Removed global hotkey code (moved to service)

#### EditMenu.tsx
**Changes:**
- ✅ Connected undo/redo buttons to `useHistoryStore`
- ✅ Properly disabled buttons based on `canUndo()` and `canRedo()`

#### App.tsx
**Changes:**
- ✅ Added initialization of history subscription
- ✅ Added initialization of global hotkeys
- ✅ Both happen once on app mount

## Dependency Graph (After Refactoring)

```
elementsStore (INDEPENDENT - no store dependencies)
    ↑
    │ (subscription)
    │
historyStore
    ↑
    │ (calls setState during undo/redo - necessary)
    │
    └─── (uses beginBatch/endBatch)
         │
         └─── useElementDrag.ts
         └─── clipboardStore.ts

clipboardStore
    ├─── elementsStore (reads/writes elements)
    ├─── projectStore (reads active page)
    └─── historyStore (batching for paste)

Independent Stores (no dependencies):
- canvasStore
- gridStore
- layoutStore
- toolbarStore
- projectStore
- fileManagerStore
- analyzerStore
- validatorStore
- simulationStore
- interactionStore
```

## Key Improvements

### ✅ Reduced Coupling
- **Before:** Circular dependency between elementsStore ↔ historyStore
- **After:** One-way dependency (historyStore → elementsStore via subscription)

### ✅ Clearer Responsibilities
- **elementsStore:** Manages element state only
- **historyStore:** Observes elementsStore and manages undo/redo
- **hotkeys service:** Handles keyboard shortcuts

### ✅ Better Separation of Concerns
- State management (stores)
- Business logic (services)
- UI components

### ✅ Improved Testability
- Stores can be tested independently
- Hotkeys can be tested separately
- No circular imports

## Migration Notes

### For Future Development

1. **History Recording**
   - History is now **automatic** - no need to manually call push()
   - For operations that should be batched (like drag), use:
     ```typescript
     useHistoryStore.getState().beginBatch();
     // ... multiple element updates ...
     useHistoryStore.getState().endBatch();
     ```

2. **Hotkeys**
   - Global hotkeys are initialized automatically in App.tsx
   - No need to call `ensureHistoryHotkeysInstalled()` or similar
   - If adding new hotkeys, add them to `services/hotkeys.ts`

3. **Adding New Stores**
   - Keep stores independent when possible
   - Use subscriptions for observation patterns
   - Avoid circular dependencies

## Potential Future Improvements

1. **Command Pattern for Undo/Redo**
   - Could replace direct setState with command objects
   - Would make undo/redo more flexible and testable

2. **Event System**
   - Could use events instead of direct subscriptions
   - Would allow for more decoupled communication

3. **History Middleware**
   - Could use Zustand middleware for automatic history
   - Would be cleaner than subscription pattern

## Testing Checklist

- [ ] Undo/redo works correctly
- [ ] Drag operations create single history entry
- [ ] Paste operations create single history entry  
- [ ] Global hotkeys work (Ctrl/Cmd+Z, Ctrl/Cmd+V, etc.)
- [ ] History buttons in UI are properly enabled/disabled
- [ ] No circular dependency errors in build

