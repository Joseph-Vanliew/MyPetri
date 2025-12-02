// Global hotkey service for handling keyboard shortcuts
// Separated from stores to reduce coupling

import { useHistoryStore } from '../stores/historyStore.js';
import { useClipboardStore } from '../stores/clipboardStore.js';
import { useProjectStore } from '../stores/projectStore.js';

type HotkeyHandler = (e: KeyboardEvent) => void;
type HotkeyCleanup = () => void;

let historyHotkeysInstalled = false;
let clipboardHotkeysInstalled = false;
let historyHotkeysCleanup: HotkeyCleanup | null = null;
let clipboardHotkeysCleanup: HotkeyCleanup | null = null;

// History hotkeys (Undo/Redo)
export const ensureHistoryHotkeysInstalled = () => {
  if (historyHotkeysInstalled || typeof window === 'undefined') return;
  
  const handler: HotkeyHandler = (e: KeyboardEvent) => {
    // Ignore when typing in inputs/textareas/contenteditable
    const target = e.target as HTMLElement | null;
    const isTyping = !!target && (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    );
    if (isTyping) return;
    
    const isMac = navigator.platform.toUpperCase().includes('MAC');
    const mod = isMac ? e.metaKey : e.ctrlKey;
    const key = (e.key || '').toLowerCase();
    const isZ = key === 'z' || e.code === 'KeyZ';
    const isY = key === 'y' || e.code === 'KeyY';
    const alt = e.altKey;
    
    // Primary: Cmd/Ctrl+Z (Undo), Cmd/Ctrl+Shift+Z (Redo)
    // Fallback: Cmd/Ctrl+Alt+Z (Undo), Cmd/Ctrl+Alt+Shift+Z (Redo)
    const undoCombo = (mod && isZ && !e.shiftKey) || (mod && isZ && alt && !e.shiftKey);
    const redoCombo = (mod && isZ && e.shiftKey) || (!isMac && mod && isY) || (mod && isZ && alt && e.shiftKey);
    
    if (undoCombo) {
      e.preventDefault();
      e.stopPropagation();
      // @ts-ignore
      if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
      console.log('[Hotkeys] Undo');
      useHistoryStore.getState().undo();
    } else if (redoCombo) {
      e.preventDefault();
      e.stopPropagation();
      // @ts-ignore
      if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
      console.log('[Hotkeys] Redo');
      useHistoryStore.getState().redo();
    }
  };
  
  window.addEventListener('keydown', handler, true);
  document.addEventListener('keydown', handler, false);
  
  historyHotkeysCleanup = () => {
    window.removeEventListener('keydown', handler, true);
    document.removeEventListener('keydown', handler, false);
  };
  
  historyHotkeysInstalled = true;
};

export const removeHistoryHotkeys = () => {
  if (historyHotkeysCleanup) {
    historyHotkeysCleanup();
    historyHotkeysCleanup = null;
    historyHotkeysInstalled = false;
  }
};

// Clipboard hotkeys (Copy/Paste)
export const ensureClipboardHotkeysInstalled = () => {
  if (clipboardHotkeysInstalled || typeof window === 'undefined') return;
  
  let lastTs = 0;
  let lastActionAt = 0;
  
  const handler: HotkeyHandler = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement | null;
    const isTyping = !!target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
    const isMac = navigator.platform.toUpperCase().includes('MAC');
    const mod = isMac ? e.metaKey : e.ctrlKey;
    const key = (e.key || '').toLowerCase();
    
    if (e.repeat) return; // ignore OS key repeat
    if (e.timeStamp && e.timeStamp === lastTs) return; // dedupe same event
    const nowTs = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (nowTs - lastActionAt < 150) return; // throttle quick duplicates
    if (!mod) return;
    
    if (key === 'c') {
      // Copy current selection
      const project = useProjectStore.getState().project;
      if (!project?.activePageId || isTyping) return;
      e.preventDefault();
      e.stopPropagation();
      // @ts-ignore
      if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
      lastTs = e.timeStamp as number;
      lastActionAt = nowTs;
      useClipboardStore.getState().copyFromSelection(project.activePageId);
      console.log('[Hotkeys] Copy');
    } else if (key === 'v') {
      const project = useProjectStore.getState().project;
      if (!project?.activePageId || isTyping) return;
      e.preventDefault();
      e.stopPropagation();
      // @ts-ignore
      if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
      lastTs = e.timeStamp as number;
      lastActionAt = nowTs;
      useClipboardStore.getState().pasteToPage(project.activePageId);
      console.log('[Hotkeys] Paste');
    }
  };
  
  window.addEventListener('keydown', handler, true);
  
  clipboardHotkeysCleanup = () => {
    window.removeEventListener('keydown', handler, true);
    document.removeEventListener('keydown', handler, false);
  };
  
  clipboardHotkeysInstalled = true;
};

export const removeClipboardHotkeys = () => {
  if (clipboardHotkeysCleanup) {
    clipboardHotkeysCleanup();
    clipboardHotkeysCleanup = null;
    clipboardHotkeysInstalled = false;
  }
};

// Initialize all hotkeys
export const initializeAllHotkeys = () => {
  ensureHistoryHotkeysInstalled();
  ensureClipboardHotkeysInstalled();
};

// Remove all hotkeys
export const removeAllHotkeys = () => {
  removeHistoryHotkeys();
  removeClipboardHotkeys();
};

