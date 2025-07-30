import { PetriNetPageData } from '../types';

export const LOCAL_STORAGE_KEY = 'patsAppState_v1';

export interface PersistedAppState {
  pages: Record<string, PetriNetPageData>;
  activePageId: string | null;
  pageOrder: string[];
  projectTitle: string;
  projectHasUnsavedChanges: boolean;
}

export function loadAppState(): PersistedAppState | null {
  try {
    const serializedState = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (serializedState === null) {
      return null; 
    }
    const storedState = JSON.parse(serializedState) as Partial<PersistedAppState>;

   
    if (
      typeof storedState.pages !== 'object' ||
      storedState.activePageId === undefined ||
      !Array.isArray(storedState.pageOrder) ||
      typeof storedState.projectTitle !== 'string' ||
      typeof storedState.projectHasUnsavedChanges !== 'boolean'
    ) {
      console.warn('Persisted state is missing essential keys or has wrong types. Ignoring.');
      localStorage.removeItem(LOCAL_STORAGE_KEY); 
      return null;
    }
    
    const validatedPages: Record<string, PetriNetPageData> = {};
    if (storedState.pages) {
        for (const pageId in storedState.pages) {
            const page = storedState.pages[pageId];
            if (page && typeof page === 'object') { 
                validatedPages[pageId] = {
                    id: page.id || pageId,
                    title: page.title || 'Untitled Page',
                    places: Array.isArray(page.places) ? page.places : [],
                    transitions: Array.isArray(page.transitions) ? page.transitions : [],
                    arcs: Array.isArray(page.arcs) ? page.arcs : [],
                    textBoxes: Array.isArray(page.textBoxes) ? page.textBoxes : [],
                    deterministicMode: typeof page.deterministicMode === 'boolean' ? page.deterministicMode : false,
                    conflictResolutionMode: typeof page.conflictResolutionMode === 'boolean' ? page.conflictResolutionMode : false,
                    conflictingTransitions: Array.isArray(page.conflictingTransitions) ? page.conflictingTransitions : [],
                    selectedElements: Array.isArray(page.selectedElements) ? page.selectedElements : [],
                    history: (page.history && typeof page.history === 'object') 
                               ? {
                                   places: Array.isArray(page.history.places) ? page.history.places : [],
                                   transitions: Array.isArray(page.history.transitions) ? page.history.transitions : [],
                                   arcs: Array.isArray(page.history.arcs) ? page.history.arcs : [],
                                   textBoxes: Array.isArray(page.history.textBoxes) ? page.history.textBoxes : [],
                                   title: Array.isArray(page.history.title) ? page.history.title : [],
                                 }
                               : { places: [], transitions: [], arcs: [], textBoxes: [], title: [] },
                    zoomLevel: typeof page.zoomLevel === 'number' ? page.zoomLevel : 1,
                    panOffset: (page.panOffset && typeof page.panOffset.x === 'number' && typeof page.panOffset.y === 'number')
                                ? page.panOffset
                                : { x: 0, y: 0 },
                };
            }
        }
    }


    return {
      pages: validatedPages,
      activePageId: storedState.activePageId !== undefined ? storedState.activePageId : null,
      pageOrder: storedState.pageOrder || [],
      projectTitle: storedState.projectTitle || 'Untitled MyPetri Project',
      projectHasUnsavedChanges: storedState.projectHasUnsavedChanges || false,
    };

  } catch (error) {
    console.error('Error loading state from localStorage:', error);
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    return null;
  }
}

export function saveAppState(state: PersistedAppState): void {
  try {
    const serializedState = JSON.stringify(state);
    localStorage.setItem(LOCAL_STORAGE_KEY, serializedState);
  } catch (error) {
    console.error('Error saving state to localStorage:', error);

  }
} 