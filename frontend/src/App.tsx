import React, {useState, useCallback, useEffect, useRef, useMemo} from 'react';
import { Canvas } from './components/Canvas';
import { Toolbar } from './components/Toolbar';
import {PetriNetDTO, UIPlace, UITransition, UIArc, GRID_CELL_SIZE, ValidationResult, PetriNetPageData, ProjectDTO, ValidatorPageConfig, PageSnapshot} from './types';
import { MenuBar } from './components/MenuBar';
import { EditableTitle, EditableTitleRef } from './components/Title.tsx';
import { API_ENDPOINTS } from './utils/api';
import { TabbedPanel } from './components/TabbedPanel';
import { useClipboard } from './hooks/useClipboard';
import { PagesComponent } from './components/PagesComponent';
import { loadAppState, saveAppState, PersistedAppState } from './hooks/appPersistence';
import { TokenAnimator } from './animations/TokenAnimator';
import './App.css';
import './components/styles/LeftSidebar.css';

const defaultValidatorConfigs: ValidatorPageConfig = {
    inputConfigs: [],
    outputConfigs: [],
    validationResult: null,
    emptyInputFields: {},
    emptyOutputFields: {}
};

export default function App() {
    // =========================================================================================
    // I. STATE MANAGEMENT
    // =========================================================================================

    const MAX_HISTORY_LENGTH = 50;

    const isNewWindow = window.name === 'new_project';
    const initialPersistedState = isNewWindow ? null : loadAppState();
    
    // ----- Core Application State (Persisted via localStorage) -----
    const [pages, setPages] = useState<Record<string, PetriNetPageData>>( // Holds all the pages of the current project, keyed by page ID.
        initialPersistedState?.pages || {}
    );
    const [activePageId, setActivePageId] = useState<string | null>( // ID of the currently visible/active page.
        initialPersistedState?.activePageId || null
    );
    const [pageOrder, setPageOrder] = useState<string[]>( // Array of page IDs defining the order of pages in the UI.
        initialPersistedState?.pageOrder || []
    );
    const [projectTitle, setProjectTitle] = useState<string>( 
        initialPersistedState?.projectTitle || "Untitled MyPetri Project"
    );
    const [projectHasUnsavedChanges, setProjectHasUnsavedChanges] = useState<boolean>( // Flag indicating if there are unsaved changes.
        initialPersistedState?.projectHasUnsavedChanges || false
    );
    // projectFileHandle is not persisted due to its nature.
    const [projectFileHandle, setProjectFileHandle] = useState<FileSystemFileHandle | null>(null); // File system handle for the project file (if using File System Access API).
    const [originalFileNameFromInput, setOriginalFileNameFromInput] = useState<string | null>(null); // Stores the original filename when a project is opened via a traditional file input.

    // ----- Transient UI & Interaction State (Not Persisted) -----
    const [currentFiredTransitions, setCurrentFiredTransitions] = useState<string[]>([]); // IDs of transitions that are currently visually "fired" in the simulation.
    const [selectedTool, setSelectedTool] = useState<'NONE' |'PLACE' | 'TRANSITION' | 'ARC'>('NONE'); // The currently active tool selected from the toolbar (e.g., Place, Transition, Arc).
    const [arcType, setArcType] = useState<UIArc['type']>('REGULAR'); // The type of arc to be created (e.g., Regular, Inhibitor).
    const [isTyping, setIsTyping] = useState(false); // Tracks if user is typing in an input field to prevent shortcut collisions
    const [autoScrollEnabled, setAutoScrollEnabled] = useState(true); // Controls whether the properties panel automatically scrolls to selected elements.
    const [currentMode, setCurrentMode] = useState('select'); // Represents the current interaction mode of the canvas (e.g., select, place, arc).
    const [showCapacityEditorMode, setShowCapacityEditorMode] = useState(false); // Toggles the visibility of the place capacity editor.
    const [animationMessage, setAnimationMessage] = useState<string | null>(null); // Message about animation status
    const [showSavedIndicator, setShowSavedIndicator] = useState(false); // Temporary indicator showing snapshot was saved
    
    // ----- Refs for Direct DOM Access or Persistent Mutable Values -----
    const dragStartPositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map()); // Stores the initial {x, y} positions of elements at the beginning of a drag operation.
    const titleRef = useRef<EditableTitleRef>(null); // Ref for the main project title editor

    // token animator instance
    const tokenAnimator = useMemo(() => new TokenAnimator(), []);

    // =========================================================================================
    // II. INITIALIZATION & PERSISTENCE EFFECTS
    // =========================================================================================

    // Effect for creating an initial page if no state was loaded from localStorage
    useEffect(() => {
        if (Object.keys(pages).length === 0 && pageOrder.length === 0 && !initialPersistedState) {
            const initialPageId = `page_${Date.now()}`;
            const newPage: PetriNetPageData = {
                id: initialPageId,
                title: "Page 1",
                places: [],
                transitions: [],
                arcs: [],
                deterministicMode: false,
                conflictResolutionMode: false,
                conflictingTransitions: [],
                selectedElements: [],
                history: { places: [], transitions: [], arcs: [], title: [] },
                zoomLevel: .85,
                panOffset: { x: -880, y: -400 },
                validatorConfigs: { ...defaultValidatorConfigs } // Initialize
            };
            setPages({ [initialPageId]: newPage });
            setPageOrder([initialPageId]);
            setActivePageId(initialPageId);
            setProjectHasUnsavedChanges(false);
            setProjectFileHandle(null);
            setOriginalFileNameFromInput(null);
        }
    }, [initialPersistedState]); // Removed 'pages' and 'pageOrder' from deps as they are set inside

    useEffect(() => {
        const stateToSave: PersistedAppState = {
            pages,
            activePageId,
            pageOrder,
            projectTitle,
            projectHasUnsavedChanges,
        };
        saveAppState(stateToSave);
    }, [pages, activePageId, pageOrder, projectTitle, projectHasUnsavedChanges]);

    // =========================================================================================
    // III. DERIVED STATE & MEMOIZED VALUES
    // =========================================================================================
    // Memoized data for the currently active page
    const activePageData = useMemo(() => activePageId ? pages[activePageId] : null, [pages, activePageId]);
    
    // Memoized DTO for the active Petri net (e.g., for simulation, validation, export)
    const petriNetDTO: PetriNetDTO | null = useMemo(() => {
        if (!activePageData) return null;
            return {
            title: activePageData.title,
            deterministicMode: activePageData.deterministicMode,
            places: activePageData.places.map((p) => ({
                id: p.id,
                tokens: p.tokens,
                name: p.name,
                x: p.x,
                y: p.y,
                radius: p.radius,
                bounded: p.bounded,
                capacity: p.capacity
            })),
            transitions: activePageData.transitions.map((t) => ({
            id: t.id,
            enabled: t.enabled,
            arcIds: t.arcIds,
            name: t.name,
            x: t.x,
            y: t.y,
            width: t.width,
            height: t.height
        })),
            arcs: activePageData.arcs.map((a) => ({
            id: a.id,
            type: a.type,
            incomingId: a.incomingId,
            outgoingId: a.outgoingId,
        })),
    };
    }, [activePageData]);

    const currentProjectDTO: ProjectDTO | null = useMemo(() => {

        if (Object.keys(pages).length === 0 && !projectTitle) return null;

        return {
            projectTitle,
            pages,
            pageOrder,
            activePageId,
            version: '1.0.0' 
        };
    }, [projectTitle, pages, pageOrder, activePageId]);

    // =========================================================================================
    // IV. HISTORY MANAGEMENT (Undo & State Snapshots)
    // =========================================================================================
    
    // Callback to save the current state of a page to its history stack
    // Primarily used before operations that modify elements directly (drag, resize) or for explicit history points.
    const saveToHistory = useCallback((pageDataToSave: PetriNetPageData) => { 
        if (!activePageId) return; 

        const { places, transitions, arcs, history, title } = pageDataToSave; 
        const currentHistory = history || { places: [], transitions: [], arcs: [], title: [] };
        
        const currentPlacesState = JSON.parse(JSON.stringify(places));
        const currentTransitionsState = JSON.parse(JSON.stringify(transitions));
        const currentArcsState = JSON.parse(JSON.stringify(arcs));
        const currentTitleState = title;

        const nextPlacesHistory = [...currentHistory.places, currentPlacesState].slice(-MAX_HISTORY_LENGTH);
        const nextTransitionsHistory = [...currentHistory.transitions, currentTransitionsState].slice(-MAX_HISTORY_LENGTH);
        const nextArcsHistory = [...currentHistory.arcs, currentArcsState].slice(-MAX_HISTORY_LENGTH);
        const nextTitleHistory = [...currentHistory.title, currentTitleState].slice(-MAX_HISTORY_LENGTH);

        setPages(prevPages => {
            if (!prevPages[activePageId!]) return prevPages;
            return {
                ...prevPages,
                [activePageId!]: {
                    ...prevPages[activePageId!],
                    history: {
                        places: nextPlacesHistory,
                        transitions: nextTransitionsHistory,
                        arcs: nextArcsHistory,
                        title: nextTitleHistory
                    }
                }
            };
        });
        // setProjectHasUnsavedChanges(true); // Individual actions triggering history save will set this
    }, [activePageId, setPages]);
    
    // Handler for the Undo action
    const handleUndo = useCallback(() => {
        if (!activePageId || !activePageData) return; 
        const currentHistory = activePageData.history || { places: [], transitions: [], arcs: [], title: [] };
        if (currentHistory.places.length === 0) return; 
        const placesToRestore = currentHistory.places[currentHistory.places.length - 1];
        const transitionsToRestore = currentHistory.transitions[currentHistory.transitions.length - 1];
        const arcsToRestore = currentHistory.arcs[currentHistory.arcs.length - 1];
        const titleToRestore = currentHistory.title[currentHistory.title.length - 1];
        const nextPlacesHistory = currentHistory.places.slice(0, -1);
        const nextTransitionsHistory = currentHistory.transitions.slice(0, -1);
        const nextArcsHistory = currentHistory.arcs.slice(0, -1);
        const nextTitleHistory = currentHistory.title.slice(0, -1);
        setPages(prevPages => ({
            ...prevPages,
            [activePageId!]: {
                ...prevPages[activePageId!],
                title: titleToRestore ?? prevPages[activePageId!].title, 
                places: placesToRestore,
                transitions: transitionsToRestore,
                arcs: arcsToRestore,
                history: {
                    places: nextPlacesHistory,
                    transitions: nextTransitionsHistory,
                    arcs: nextArcsHistory,
                    title: nextTitleHistory
                },
                selectedElements: [], 
            }
        }));
        setCurrentFiredTransitions([]);
        setProjectHasUnsavedChanges(true);
    }, [activePageId, activePageData, setPages]);

    // =========================================================================================
    // V. CLIPBOARD FUNCTIONALITY (Copy, Paste)
    // =========================================================================================
    const { handleCopy, handlePaste, clearClipboard } = useClipboard({
        places: activePageData?.places || [],
        transitions: activePageData?.transitions || [],
        arcs: activePageData?.arcs || [],
        selectedElements: activePageData?.selectedElements || [],
        setPlaces: (updater) => {
            if (!activePageId) return;
            setPages(prev => {
                if (!prev[activePageId!]) return prev;
                const currentPlaces = prev[activePageId!].places;
                const newPlaces = typeof updater === 'function' ? updater(currentPlaces) : updater;
                return { ...prev, [activePageId!]: { ...prev[activePageId!], places: newPlaces } };
            });
            setProjectHasUnsavedChanges(true);
        },
        setTransitions: (updater) => {
            if (!activePageId) return;
            setPages(prev => {
                if (!prev[activePageId!]) return prev;
                const currentTransitions = prev[activePageId!].transitions;
                const newTransitions = typeof updater === 'function' ? updater(currentTransitions) : updater;
                return { ...prev, [activePageId!]: { ...prev[activePageId!], transitions: newTransitions } };
            });
            setProjectHasUnsavedChanges(true);
        },
        setArcs: (updater) => {
            if (!activePageId) return;
            setPages(prev => {
                if (!prev[activePageId!]) return prev;
                const currentArcs = prev[activePageId!].arcs;
                const newArcs = typeof updater === 'function' ? updater(currentArcs) : updater;
                return { ...prev, [activePageId!]: { ...prev[activePageId!], arcs: newArcs } };
            });
            setProjectHasUnsavedChanges(true);
        },
        setSelectedElements: (updater) => {
            if (!activePageId) return;
            setPages(prev => {
                if (!prev[activePageId!]) return prev;
                const currentSelected = prev[activePageId!].selectedElements;
                const newSelected = typeof updater === 'function' ? updater(currentSelected) : updater;
                return { ...prev, [activePageId!]: { ...prev[activePageId!], selectedElements: newSelected } };
            });
        },
        saveToHistory: () => {
            if (activePageData) {
                 saveToHistory(activePageData);
                 setProjectHasUnsavedChanges(true);
            }
        }, 
    });

    // =========================================================================================
    // VI. GENERAL UI HANDLERS
    // =========================================================================================
    

    const handleTypingChange = (typing: boolean) => {
        setIsTyping(typing);
    };

    const handleNewProject = useCallback(() => {
        if (projectHasUnsavedChanges) {
            const confirmNew = window.confirm('You have unsaved changes in the current project. Do you want to proceed with creating a new project?');
            if (!confirmNew) {
                return;
            }
        }

        const baseUrl = window.location.origin + window.location.pathname;
        const newWindow = window.open(baseUrl, '_blank');
        
        if (newWindow) {
            newWindow.localStorage.removeItem('patsAppState_v1');
        }
    }, [projectHasUnsavedChanges]);

    // =========================================================================================
    // VII. KEYBOARD SHORTCUTS & GLOBAL EVENT LISTENERS
    // =========================================================================================
    useEffect(() => {
        function handleKeyDown(e: KeyboardEvent) {
            if (isTyping) return;
            const isModifier = e.metaKey || e.ctrlKey; 

            if (isModifier && e.key === 'c') { 
                e.preventDefault();
                handleCopy(); 
                return;
            }
            if (isModifier && e.key === 'v') { 
                e.preventDefault();
                handlePaste(); 
                return;
            }
            // Use App handler
            if (isModifier && e.key === 'z') { 
                e.preventDefault();
                handleUndo();
                return;
            }

            if (e.key === 'Escape') {
                setSelectedTool('NONE');
                clearActivePageSelection();
                return;
            }
            
            const handleDeleteLocal = () => {
                if (!activePageId || !activePageData || activePageData.selectedElements.length === 0) return;

                setPages(prevPages => {
                    const currentPage = prevPages[activePageId!];
                    if (!currentPage) return prevPages;

                    const { 
                        places: currentPlaces, 
                        transitions: currentTransitions, 
                        arcs: currentArcs, 
                        selectedElements: currentSelectedElements,
                        history: currentHistoryData,
                        title: currentTitle
                    } = currentPage;

                    // --- Integrate History Save --- 
                    const currentHistory = currentHistoryData || { places: [], transitions: [], arcs: [], title: [] };
                    const currentPlacesState = JSON.parse(JSON.stringify(currentPlaces));
                    const currentTransitionsState = JSON.parse(JSON.stringify(currentTransitions));
                    const currentArcsState = JSON.parse(JSON.stringify(currentArcs));
                    const currentTitleState = currentTitle;
                    const nextPlacesHistory = [...currentHistory.places, currentPlacesState].slice(-MAX_HISTORY_LENGTH);
                    const nextTransitionsHistory = [...currentHistory.transitions, currentTransitionsState].slice(-MAX_HISTORY_LENGTH);
                    const nextArcsHistory = [...currentHistory.arcs, currentArcsState].slice(-MAX_HISTORY_LENGTH);
                    const nextTitleHistory = [...currentHistory.title, currentTitleState].slice(-MAX_HISTORY_LENGTH);
                    const nextHistory = { places: nextPlacesHistory, transitions: nextTransitionsHistory, arcs: nextArcsHistory, title: nextTitleHistory };
                    // --- End History Save ---
                    
                    const selectedSet = new Set(currentSelectedElements);

                    const arcsToDelete = currentArcs.filter(arc =>
                        selectedSet.has(arc.id) || 
                        selectedSet.has(arc.incomingId) || 
                        selectedSet.has(arc.outgoingId)   
                    ).map(arc => arc.id);
                    const arcsToDeleteSet = new Set(arcsToDelete);

                    const updatedArcs = currentArcs.filter(arc => !arcsToDeleteSet.has(arc.id));

                    const updatedTransitions = currentTransitions
                        .filter(t => !selectedSet.has(t.id)) 
                        .map(t => ({ 
                         ...t,
                            arcIds: t.arcIds.filter(arcId => !arcsToDeleteSet.has(arcId)),
                        }));

                    const updatedPlaces = currentPlaces.filter(p => !selectedSet.has(p.id));

                    // Construct the full updated page state
                    const updatedPageData: PetriNetPageData = {
                        ...currentPage,
                        places: updatedPlaces,
                        transitions: updatedTransitions,
                        arcs: updatedArcs,
                        selectedElements: [],
                        history: nextHistory  
                    };

                    return {
                        ...prevPages,
                        [activePageId!]: updatedPageData
                    };
                });
                setProjectHasUnsavedChanges(true);
            };

            if (e.key === 'Delete' || e.key === 'Backspace') {
                if (selectedTool === 'ARC' && activePageData && activePageData.selectedElements.length === 1) {
                    clearActivePageSelection();
                    return; 
                }
                handleDeleteLocal(); 
            }
        }

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [
        isTyping, 
        selectedTool, 
        activePageData,
        pages,
        setSelectedTool,
    ]);

    useEffect(() => {
        if (selectedTool === 'ARC') {
            setCurrentMode('arc');
        } else if (selectedTool === 'PLACE') {
            setCurrentMode('place');
        } else if (selectedTool === 'TRANSITION') {
            setCurrentMode('transition');
        } else {
            setCurrentMode('select');
        }
    }, [selectedTool]);

    // =========================================================================================
    // VIII. ARC MANAGEMENT
    // =========================================================================================
    const handleArcPortClick = (clickedId: string) => {
        if (!activePageId || !activePageData) return;
        const currentSelectedElements = activePageData.selectedElements;
        if (currentSelectedElements.length === 0) {
            // Select source
            setPages(prevPages => {
                // ... logic to select source element ...
                 const currentPage = prevPages[activePageId!];
                 if (!currentPage) return prevPages;
                 return {
                     ...prevPages,
                     [activePageId!]: { ...currentPage, selectedElements: [clickedId] }
                 };
            });
        } else {
            const sourceId = currentSelectedElements[0];
            const targetId = clickedId;
            if (isValidArcConnection(sourceId, targetId, arcType, activePageData.places, activePageData.transitions)) {
                // Create Arc and Update History Atomically
                setPages(prevPages => { 
                    const currentPage = prevPages[activePageId!];
                    if (!currentPage) return prevPages;
                    // --- History Save Logic --- 
                    const currentHistory = currentPage.history || { places: [], transitions: [], arcs: [], title: [] };
                    const currentPlacesState = JSON.parse(JSON.stringify(currentPage.places));
                    const currentTransitionsState = JSON.parse(JSON.stringify(currentPage.transitions));
                    const currentArcsState = JSON.parse(JSON.stringify(currentPage.arcs));
                    const currentTitleState = currentPage.title;
                    const nextPlacesHistory = [...currentHistory.places, currentPlacesState].slice(-MAX_HISTORY_LENGTH);
                    const nextTransitionsHistory = [...currentHistory.transitions, currentTransitionsState].slice(-MAX_HISTORY_LENGTH);
                    const nextArcsHistory = [...currentHistory.arcs, currentArcsState].slice(-MAX_HISTORY_LENGTH);
                    const nextTitleHistory = [...currentHistory.title, currentTitleState].slice(-MAX_HISTORY_LENGTH);
                    const nextHistory = { places: nextPlacesHistory, transitions: nextTransitionsHistory, arcs: nextArcsHistory, title: nextTitleHistory };
                    // --- End History Logic ---
                    
                    const newArcId = `arc_${Date.now()}_${activePageId}`;
                    const newArc: UIArc = { id: newArcId, type: arcType, incomingId: sourceId, outgoingId: targetId };
                    const updatedArcs = [...currentPage.arcs, newArc];
                    const updatedTransitions = currentPage.transitions.map(t => {
                        const elementIsTransition = currentPage.transitions.some(trans => trans.id === t.id);
                        if ((t.id === sourceId || t.id === targetId) && elementIsTransition) {
                            if (!t.arcIds.includes(newArcId)) {
                                return { ...t, arcIds: [...t.arcIds, newArcId] };
                            }
                        }
                        return t;
                    });

                    // Return explicitly constructed new page state
                    return {
                        ...prevPages,
                        [activePageId!]: {
                            ...currentPage,
                            transitions: updatedTransitions,
                            arcs: updatedArcs,
                            selectedElements: [],
                            history: nextHistory,
                        }
                    };
                });
                setProjectHasUnsavedChanges(true);
            } else {
                console.warn('Invalid arc connection');
                clearActivePageSelection(); 
            }
        }
    };

    const handleArcCreation = (x: number, y: number) => {
        if (!activePageId || !activePageData) return;
        const clickedElement = findClickedElement(x, y, activePageData.places, activePageData.transitions);
        if (!clickedElement) {
            clearActivePageSelection();
            return;
        }
        const currentSelectedElements = activePageData.selectedElements;
        if (currentSelectedElements.length === 0) {
            // Select source
            setPages(prevPages => {
                // ... logic to select source element ...
                 const currentPage = prevPages[activePageId!];
                 if (!currentPage) return prevPages;
                 return {
                     ...prevPages,
                     [activePageId!]: { ...currentPage, selectedElements: [clickedElement.id] }
                 };
             });
        } else {
            const sourceId = currentSelectedElements[0];
            const targetId = clickedElement.id;
            if (isValidArcConnection(sourceId, targetId, arcType, activePageData.places, activePageData.transitions)) {
                 // Create Arc and Update History Atomically
                 setPages(prevPages => { 
                    const currentPage = prevPages[activePageId!];
                    if (!currentPage) return prevPages;
                    // --- History Save Logic --- 
                    const currentHistory = currentPage.history || { places: [], transitions: [], arcs: [], title: [] };
                    const currentPlacesState = JSON.parse(JSON.stringify(currentPage.places));
                    const currentTransitionsState = JSON.parse(JSON.stringify(currentPage.transitions));
                    const currentArcsState = JSON.parse(JSON.stringify(currentPage.arcs));
                    const currentTitleState = currentPage.title;
                    const nextPlacesHistory = [...currentHistory.places, currentPlacesState].slice(-MAX_HISTORY_LENGTH);
                    const nextTransitionsHistory = [...currentHistory.transitions, currentTransitionsState].slice(-MAX_HISTORY_LENGTH);
                    const nextArcsHistory = [...currentHistory.arcs, currentArcsState].slice(-MAX_HISTORY_LENGTH);
                    const nextTitleHistory = [...currentHistory.title, currentTitleState].slice(-MAX_HISTORY_LENGTH);
                    const nextHistory = { places: nextPlacesHistory, transitions: nextTransitionsHistory, arcs: nextArcsHistory, title: nextTitleHistory };
                    // --- End History Logic ---

                    const newArcId = `arc_${Date.now()}_${activePageId}`;
                    const newArc: UIArc = { id: newArcId, type: arcType, incomingId: sourceId, outgoingId: targetId };
                    const updatedArcs = [...currentPage.arcs, newArc];
                    const updatedTransitions = currentPage.transitions.map(t => {
                         const elementIsTransition = currentPage.transitions.some(trans => trans.id === t.id);
                         if ((t.id === sourceId || t.id === targetId) && elementIsTransition) {
                            if (!t.arcIds.includes(newArcId)) {
                                return { ...t, arcIds: [...t.arcIds, newArcId] };
                            }
                         }
                         return t;
                    });

                    // Return explicitly constructed new page state
                    return {
                        ...prevPages,
                        [activePageId!]: {
                            ...currentPage, // Spread all existing properties first
                            transitions: updatedTransitions, // Then overwrite the ones that changed
                            arcs: updatedArcs,
                            selectedElements: [], // Clear selection
                            history: nextHistory, // Set updated history
                            // No need to list id, title, places, deterministicMode, validatorConfigs etc.
                            // if they didn't change, as ...currentPage already brought them.
                        }
                    };
                 });
                 setProjectHasUnsavedChanges(true);
            } else {
                console.warn(`Invalid arc from ${sourceId} to ${targetId} (${arcType}).`);
                clearActivePageSelection(); 
            }
        }
    };

    const handleCanvasClick = useCallback((x: number, y: number) => {
        if (selectedTool === 'NONE') {
            clearActivePageSelection();
            return;
        }
        if (!activePageId) return;

        if (selectedTool === 'PLACE') {
            const newPlace: UIPlace = {
                name: '',
                id: `place_${Date.now()}_${activePageId}`,
                tokens: 0, x, y, radius: 46, bounded: false, capacity: null
            };
            setPages(prevPages => {
                const currentPage = prevPages[activePageId!];
                if (!currentPage) return prevPages;
                const currentHistory = currentPage.history || { places: [], transitions: [], arcs: [], title: [] };
                const currentPlacesState = JSON.parse(JSON.stringify(currentPage.places));
                const currentTransitionsState = JSON.parse(JSON.stringify(currentPage.transitions));
                const currentArcsState = JSON.parse(JSON.stringify(currentPage.arcs));
                const currentTitleState = currentPage.title;
                const nextPlacesHistory = [...currentHistory.places, currentPlacesState].slice(-MAX_HISTORY_LENGTH);
                const nextTransitionsHistory = [...currentHistory.transitions, currentTransitionsState].slice(-MAX_HISTORY_LENGTH);
                const nextArcsHistory = [...currentHistory.arcs, currentArcsState].slice(-MAX_HISTORY_LENGTH);
                const nextTitleHistory = [...currentHistory.title, currentTitleState].slice(-MAX_HISTORY_LENGTH);

                return {
                    ...prevPages,
                    [activePageId!]: {
                        ...currentPage,
                        places: [...currentPage.places, newPlace], 
                        history: {
                            places: nextPlacesHistory,
                            transitions: nextTransitionsHistory,
                            arcs: nextArcsHistory,
                            title: nextTitleHistory
                        } 
                    }
                };
            });
            setSelectedTool('NONE');
            setProjectHasUnsavedChanges(true);

        } else if (selectedTool === 'TRANSITION') {
            const newTransition: UITransition = {
                name: '', id: `trans_${Date.now()}_${activePageId}`,
                enabled: false, arcIds: [], x, y, width: 120, height: 54
            };
             setPages(prevPages => {
                const currentPage = prevPages[activePageId!];
                if (!currentPage) return prevPages;
                const currentHistory = currentPage.history || { places: [], transitions: [], arcs: [], title: [] };
                const currentPlacesState = JSON.parse(JSON.stringify(currentPage.places)); 
                const currentTransitionsState = JSON.parse(JSON.stringify(currentPage.transitions));
                const currentArcsState = JSON.parse(JSON.stringify(currentPage.arcs));
                const currentTitleState = currentPage.title;
                const nextPlacesHistory = [...currentHistory.places, currentPlacesState].slice(-MAX_HISTORY_LENGTH);
                const nextTransitionsHistory = [...currentHistory.transitions, currentTransitionsState].slice(-MAX_HISTORY_LENGTH);
                const nextArcsHistory = [...currentHistory.arcs, currentArcsState].slice(-MAX_HISTORY_LENGTH);
                const nextTitleHistory = [...currentHistory.title, currentTitleState].slice(-MAX_HISTORY_LENGTH);
                return {
                    ...prevPages,
                    [activePageId!]: {
                        ...currentPage,
                        transitions: [...currentPage.transitions, newTransition],
                        history: {
                            places: nextPlacesHistory,
                            transitions: nextTransitionsHistory,
                            arcs: nextArcsHistory,
                            title: nextTitleHistory
                        } 
                    }
                };
            });
            setSelectedTool('NONE');
            setProjectHasUnsavedChanges(true);

        } else if (selectedTool === 'ARC') {
            handleArcCreation(x, y);
            setSelectedTool('NONE');
        }
    }, [selectedTool, activePageId, pages, setSelectedTool, handleArcCreation]); 

    const handleSelectElement = (elementId: string, event?: React.MouseEvent | KeyboardEvent) => {
        if (!activePageId || !pages[activePageId]) return;

        const isShift = event?.shiftKey;
        
        setPages(prevPages => {
            const currentPage = prevPages[activePageId!]; 
            if (!currentPage) return prevPages; 

            let nextSelected: string[];
            const currentSelected = currentPage.selectedElements;

            if (elementId === '') { 
                nextSelected = [];
            } else if (isShift) {
                if (currentSelected.includes(elementId)) {
                    nextSelected = currentSelected.filter(elId => elId !== elementId);
                } else {
                    nextSelected = [...currentSelected, elementId];
                }
            } else {
                if (currentSelected.length === 1 && currentSelected[0] === elementId) {
                    nextSelected = currentSelected;
                } else {
                    nextSelected = [elementId];
                }
            }

            return {
                ...prevPages,
                [activePageId!]: {
                    ...currentPage,
                    selectedElements: nextSelected
                }
            };
        });

        if (!isShift && elementId !== '') {
             setSelectedTool('NONE'); 
        }
    };
    
    const clearActivePageSelection = () => {
        if (!activePageId || !pages[activePageId]) return;

        setPages(prevPages => {
            const currentPage = prevPages[activePageId!];
            if (!currentPage) return prevPages;

            if (currentPage.selectedElements.length === 0) {
                return prevPages;
                }

            return {
                ...prevPages,
                [activePageId!]: {
                    ...currentPage,
                    selectedElements: []
                }
            };
        });
    };

    const handleMultiSelectElement = (ids: string[]) => {
        if (!activePageId || !pages[activePageId]) return;

        setPages(prevPages => {
            const currentPage = prevPages[activePageId!];
            if (!currentPage) return prevPages;

            return {
                ...prevPages,
                [activePageId!]: {
                    ...currentPage,
                    selectedElements: ids 
                }
            };
        });
    };

    // =========================================================================================
    // IX. HELPER FUNCTIONS
    // =========================================================================================
    const findClickedElement = (x: number, y: number, currentPlaces: UIPlace[], currentTransitions: UITransition[]) => {
        const gridX = Math.round(x / GRID_CELL_SIZE) * GRID_CELL_SIZE;
        const gridY = Math.round(y / GRID_CELL_SIZE) * GRID_CELL_SIZE;

        const place = currentPlaces.find(p =>
            p.x === gridX && p.y === gridY
        );
        if (place) return place;

        const transition = currentTransitions.find(t =>
            t.x === gridX && t.y === gridY
        );
        if (transition) return transition;

        return null;
    };

    function isValidArcConnection(
        sourceId: string,
        targetId: string,
        arcType: UIArc['type'],
        allPlaces: UIPlace[],
        allTransitions: UITransition[]
    ): boolean {
        if (sourceId === targetId) {
            return false;
        }

        const sourceElement = allPlaces.find(p => p.id === sourceId) || allTransitions.find(t => t.id === sourceId);
        const targetElement = allPlaces.find(p => p.id === targetId) || allTransitions.find(t => t.id === targetId);

        if (!sourceElement || !targetElement) {
            console.error("Could not find source or target element for arc validation.");
            return false; 
        }

        const isSourcePlace = 'radius' in sourceElement;
        const isSourceTrans = 'width' in sourceElement;
        const isTargetPlace = 'radius' in targetElement;
        const isTargetTrans = 'width' in targetElement;

        if (arcType === 'INHIBITOR') {
            return isSourcePlace && isTargetTrans;
        }
        else {
            return (
                (isSourcePlace && isTargetTrans) ||
                (isSourceTrans && isTargetPlace)
            );
        }
    }

    // =========================================================================================
    // X. SIMULATION CONTROLS
    // =========================================================================================
    const handleSimulate = async () => {
        if (!activePageId || !activePageData) {
            console.log("No active page to simulate.");
            return;
        }
        
        // Check if animations are already running and prevent starting new ones
        if (tokenAnimator.hasActiveAnimations()) {
            console.log("Animation in progress. Please wait for it to complete.");
            setAnimationMessage("Animation in progress. Please wait.");
            // Clear the message after a delay
            setTimeout(() => setAnimationMessage(null), 2000);
            return;
        }
        
        setAnimationMessage(null);
        setCurrentFiredTransitions([]); 
        
        // Small delay to ensure the animation class is removed before adding it again
        await new Promise(resolve => setTimeout(resolve, 10));
        
        // --- Prepare the Petri Net DTO for the simulation API ---
        const requestBody: PetriNetDTO = {
            places: activePageData.places.map(p => ({ 
                id: p.id, tokens: p.tokens, name: p.name, x: p.x, y: p.y, 
                radius: p.radius, bounded: p.bounded, capacity: p.capacity
            })),
            transitions: activePageData.transitions.map(t => ({
                id: t.id, enabled: t.enabled, arcIds: t.arcIds, name: t.name, 
                x: t.x, y: t.y, width: t.width, height: t.height
            })),
            arcs: activePageData.arcs.map(a => ({
                id: a.id, type: a.type, incomingId: a.incomingId, outgoingId: a.outgoingId,
            })),
            deterministicMode: activePageData.deterministicMode,
            title: activePageData.title 
        };

        try {
            // --- Simulate the Petri Net next state ---
            const apiUrl = `${API_ENDPOINTS.PROCESS}/page/${activePageId}/process`;

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorBody = await response.text();
                console.error('Simulation API error:', response.status, errorBody);
                return;
            }

            const responseData: PetriNetDTO = await response.json();

            // Find which transitions fired and animate tokens
            const firedTransitions = responseData.transitions?.filter(t => t.enabled).map(t => ({
                ...t,
                name: t.name || '',  // Ensure name is never undefined
                x: t.x || 0,        // Provide defaults for required properties
                y: t.y || 0,
                width: t.width || 120,
                height: t.height || 54
            })) || [];
            
            // Update the active page's state
            setPages(prevPages => {
                const pageToUpdate = prevPages[activePageId!];
                if (!pageToUpdate) return prevPages;

                // Start animations for each fired transition
                const responseEnabledTransitions = responseData.transitions?.filter(t => t.enabled).map(t => t.id) || [];
                let newConflictResolutionMode = false;
                let newConflictingTransitions: string[] = [];
                
                // Track bidirectional places that need immediate token decrement
                const bidirectionalPlacesToDecrement = new Set<string>();

                // Check for conflicts first
                if (pageToUpdate.deterministicMode && responseEnabledTransitions.length > 1) {
                    newConflictResolutionMode = true;
                    newConflictingTransitions = responseEnabledTransitions;
                    // Don't start animations if there's a conflict
                    tokenAnimator.clear(); // Clear any ongoing animations
                } else {
                    // Only start animations if there's no conflict
                    firedTransitions.forEach(firedTransition => {
                        // Find the transition object from the page data
                        const transitionObj = pageToUpdate.transitions.find(t => t.id === firedTransition.id);
                        if (!transitionObj) return;

                        // Separate arcs by type for proper handling
                        const regularInputArcs = pageToUpdate.arcs.filter(a => 
                            a.outgoingId === firedTransition.id && a.type === 'REGULAR'
                        );
                        const regularOutputArcs = pageToUpdate.arcs.filter(a => 
                            a.incomingId === firedTransition.id && a.type === 'REGULAR'
                        );
                        const bidirectionalArcs = pageToUpdate.arcs.filter(a =>
                            (a.incomingId === firedTransition.id || a.outgoingId === firedTransition.id) && a.type === 'BIDIRECTIONAL'
                        );

                        // Handle regular input arcs (consumption only)
                        regularInputArcs.forEach(inputArc => {
                            const sourcePlace = pageToUpdate.places.find(p => p.id === inputArc.incomingId);
                            if (sourcePlace) {
                                tokenAnimator.startAnimation(
                                    sourcePlace,
                                    transitionObj,
                                    transitionObj,
                                    pageToUpdate.arcs,
                                    () => {} // No callback needed for consumption
                                );
                            }
                        });

                        // Handle regular output arcs (production only)
                        regularOutputArcs.forEach(outputArc => {
                            const targetPlace = pageToUpdate.places.find(p => p.id === outputArc.outgoingId);
                            if (targetPlace) {
                                // Capture the final token value from responseData
                                const finalTokens = responseData.places.find(rp => rp.id === targetPlace.id)?.tokens ?? targetPlace.tokens;
                                
                                tokenAnimator.startAnimation(
                                    transitionObj,
                                    targetPlace,
                                    transitionObj,
                                    pageToUpdate.arcs,
                                    () => {
                                        // Update target place tokens after animation completes
                                        setPages(prevPages => {
                                            const currentPage = prevPages[activePageId!];
                                            if (!currentPage) return prevPages;

                                            const updatedPlaces = currentPage.places.map(p => {
                                                if (p.id === targetPlace.id) {
                                                    return { ...p, tokens: finalTokens };
                                                }
                                                return p;
                                            });

                                            return {
                                                ...prevPages,
                                                [activePageId!]: {
                                                    ...currentPage,
                                                    places: updatedPlaces
                                                }
                                            };
                                        });
                                    }
                                );
                            }
                        });

                        // Handle bidirectional arcs (consumption THEN production)
                        bidirectionalArcs.forEach(bidirectionalArc => {
                            const place = pageToUpdate.places.find(p => 
                                p.id === bidirectionalArc.incomingId || p.id === bidirectionalArc.outgoingId
                            );
                            if (place) {
                                const finalTokens = responseData.places.find(rp => rp.id === place.id)?.tokens ?? place.tokens;
                                
                                // Track this place for immediate token decrement
                                bidirectionalPlacesToDecrement.add(place.id);
                                
                                tokenAnimator.startBidirectionalAnimation(
                                    place,
                                    transitionObj,
                                    pageToUpdate.arcs,
                                    () => {},
                                    () => {
                                        // Complete: restore final count
                                        setPages(prevPages => {
                                            const currentPage = prevPages[activePageId!];
                                            if (!currentPage) return prevPages;
                                            const updatedPlaces = currentPage.places.map(p => {
                                                if (p.id === place.id) {
                                                    return { ...p, tokens: finalTokens };
                                                }
                                                return p;
                                            });
                                            return {
                                                ...prevPages,
                                                [activePageId!]: { ...currentPage, places: updatedPlaces }
                                            };
                                        });
                                    }
                                );
                            }
                        });
                    });
                }

                const updatedPagePlaces = pageToUpdate.places.map(p_ui => {
                    const updatedPlaceData = responseData.places.find(rp => rp.id === p_ui.id);
                    
                    // Only update tokens immediately for places being consumed from via REGULAR arcs
                    const isRegularSourcePlace = pageToUpdate.arcs.some(arc => 
                        arc.incomingId === p_ui.id && 
                        arc.type === 'REGULAR' && 
                        responseEnabledTransitions.some(transitionId => transitionId === arc.outgoingId)
                    );
                    
                    // Check if this place should be decremented for bidirectional arc consumption
                    const shouldDecrementForBidirectional = bidirectionalPlacesToDecrement.has(p_ui.id);
                    
                    if (updatedPlaceData && isRegularSourcePlace) {
                        // Regular consumption - use backend result
                        return { ...p_ui, tokens: updatedPlaceData.tokens };
                    } else if (shouldDecrementForBidirectional) {
                        // Bidirectional consumption - decrement immediately, animation will restore final count
                        return { ...p_ui, tokens: Math.max(0, p_ui.tokens - 1) };
                    }
                    
                    // No changes for this place
                    return p_ui;
                });

                // Map response DTO transitions to UITransition
                const updatedPageTransitions = pageToUpdate.transitions.map(t_ui => {
                    const updatedTransitionData = responseData.transitions?.find(rt => rt.id === t_ui.id);
                    return updatedTransitionData ? { 
                        ...t_ui,
                        enabled: updatedTransitionData.enabled
                    } : { ...t_ui, enabled: false };
                });
                
                // Update transient animation state based on the outcome for the *active* page
                if (!newConflictResolutionMode && responseEnabledTransitions.length > 0) {
                     setCurrentFiredTransitions(responseEnabledTransitions);
                } else {
                     setCurrentFiredTransitions([]); // Clear if conflict or no newly enabled transitions to fire
                }

                return {
                    ...prevPages,
                    [activePageId!]: {
                        ...pageToUpdate,
                        places: updatedPagePlaces,
                        transitions: updatedPageTransitions,
                        conflictResolutionMode: newConflictResolutionMode,
                        conflictingTransitions: newConflictingTransitions,
                    }
                };
            });
            setProjectHasUnsavedChanges(true);

        } catch (error) {
            console.error('Simulation error:', error);
        }
    };

    const continueSimulation = async (selectedTransitionId: string) => {
        if (!activePageId || !activePageData) {
            console.log("No active page for conflict resolution.");
            return;
        }

        // Check if animations are already running and prevent starting new ones
        if (tokenAnimator.hasActiveAnimations()) {
            console.log("Animation in progress. Please wait for it to complete.");
            setAnimationMessage("Animation in progress. Please wait.");
            // Clear the message after a delay
            setTimeout(() => setAnimationMessage(null), 2000);
            return;
        }

        setAnimationMessage(null);
        setCurrentFiredTransitions([]); 
        await new Promise(resolve => setTimeout(resolve, 10));
        
        const tempUpdatedTransitions = activePageData.transitions.map(t => ({
            ...t,
            enabled: t.id === selectedTransitionId
        }));
        setPages(prev => ({ ...prev, [activePageId!]: { ...prev[activePageId!], transitions: tempUpdatedTransitions } }));
        
        // Set animation state for the selected transition
        setCurrentFiredTransitions([selectedTransitionId]);
        
        const requestBody = {
            // Construct DTO from activePageData
            places: activePageData.places.map(p => ({ 
                 id: p.id, tokens: p.tokens, name: p.name, x: p.x, y: p.y,
                 radius: p.radius, bounded: p.bounded, capacity: p.capacity
            })),
            transitions: activePageData.transitions.map(t => ({ // Send the original enabled state before temp update
                 id: t.id, enabled: t.enabled, arcIds: t.arcIds, name: t.name, 
                 x: t.x, y: t.y, width: t.width, height: t.height
            })),
            arcs: activePageData.arcs.map(a => ({
                id: a.id, type: a.type, incomingId: a.incomingId, outgoingId: a.outgoingId,
            })),
            selectedTransitionId, // Add the selected ID for the backend
            deterministicMode: activePageData.deterministicMode,
            title: activePageData.title
        };
        
        try {
            const apiUrl = `${API_ENDPOINTS.RESOLVE}/page/${activePageId}/resolve`; 
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });
            
            if (!response.ok) {
                 const errorBody = await response.text();
                 console.error('Conflict resolution API error:', response.status, errorBody);
                 // Revert temporary UI update? Or show error? Reverting for now.
                 setPages(prev => ({ ...prev, [activePageId!]: { ...prev[activePageId!], transitions: activePageData.transitions, conflictResolutionMode: false } })); // Revert transitions and exit conflict mode on error
                 setCurrentFiredTransitions([]);
                 return;
            }
            
            const responseData = await response.json() as PetriNetDTO;
            
            // Get the transition details
            const transitionObj = activePageData.transitions.find(t => t.id === selectedTransitionId);
            if (transitionObj) {
                // Set animation state for the transition
                setCurrentFiredTransitions([selectedTransitionId]);
                
                // Find input and output arcs for this transition
                const inputArcs = activePageData.arcs.filter(a => 
                    a.outgoingId === selectedTransitionId && a.type !== 'INHIBITOR'
                );
                const outputArcs = activePageData.arcs.filter(a => 
                    a.incomingId === selectedTransitionId
                );
                const bidirectionalArcs = activePageData.arcs.filter(a =>
                    (a.incomingId === selectedTransitionId || a.outgoingId === selectedTransitionId) && a.type === 'BIDIRECTIONAL'
                );

                // Handle input arcs (consumption)
                inputArcs.forEach(inputArc => {
                    const sourcePlace = activePageData.places.find(p => p.id === inputArc.incomingId);
                    if (sourcePlace) {
                        tokenAnimator.startAnimation(
                            sourcePlace,
                            transitionObj,
                            transitionObj,
                            activePageData.arcs,
                            () => {} // No callback needed for consumption
                        );
                    }
                });
                
                // Track if this is the last animation to complete
                let outputArcCount = outputArcs.length;
                let completedAnimations = 0;

                // Handle output arcs (production) separately
                outputArcs.forEach(outputArc => {
                    const targetPlace = activePageData.places.find(p => p.id === outputArc.outgoingId);
                    if (targetPlace) {
                        // Capture the final token value from responseData
                        const finalTokens = responseData.places.find(rp => rp.id === targetPlace.id)?.tokens ?? targetPlace.tokens;
                        
                        tokenAnimator.startAnimation(
                            transitionObj,
                            targetPlace,
                            transitionObj,
                            activePageData.arcs,
                            () => {
                                // Update target place tokens after animation completes
                                setPages(prevPages => {
                                    const currentPage = prevPages[activePageId!];
                                    if (!currentPage) return prevPages;

                                    const updatedPlaces = currentPage.places.map(p => {
                                        if (p.id === targetPlace.id) {
                                            return { ...p, tokens: finalTokens };
                                        }
                                        return p;
                                    });

                                    return {
                                        ...prevPages,
                                        [activePageId!]: {
                                            ...currentPage,
                                            places: updatedPlaces
                                        }
                                    };
                                });
                                
                                // Check if all animations are complete
                                completedAnimations++;
                                if (completedAnimations === outputArcCount) {
                                    // Check for conflicts after all animations are done
                                    setPages(prevPages => {
                                        const currentPage = prevPages[activePageId!];
                                        if (!currentPage) return prevPages;
                                        
                                        // If we have new conflicts, update the conflict state
                                        if (currentPage.conflictResolutionMode) {
                                            setCurrentFiredTransitions([]);
                                        }
                                        
                                        return prevPages; // No changes needed, just checking state
                                    });
                                }
                            }
                        );
                    }
                });
                
                // Handle bidirectional arcs (consumption THEN production)
                bidirectionalArcs.forEach(bidirectionalArc => {
                    const place = activePageData.places.find(p => 
                        p.id === bidirectionalArc.incomingId || p.id === bidirectionalArc.outgoingId
                    );
                    if (place) {
                        const finalTokens = responseData.places.find(rp => rp.id === place.id)?.tokens ?? place.tokens;
                        
                        tokenAnimator.startBidirectionalAnimation(
                            place,
                            transitionObj,
                            activePageData.arcs,
                            () => {},
                            () => {
                                // Complete: restore final count
                                setPages(prevPages => {
                                    const currentPage = prevPages[activePageId!];
                                    if (!currentPage) return prevPages;
                                    const updatedPlaces = currentPage.places.map(p => {
                                        if (p.id === place.id) {
                                            return { ...p, tokens: finalTokens };
                                        }
                                        return p;
                                    });
                                    return {
                                        ...prevPages,
                                        [activePageId!]: { ...currentPage, places: updatedPlaces }
                                    };
                                });
                            }
                        );
                    }
                });
                
                // If there are no output arcs, clear fired transitions immediately
                if (outputArcCount === 0) {
                    setCurrentFiredTransitions([]);
                }
            }
            
            // Update page state based on response
            setPages(prevPages => {
                const pageToUpdate = prevPages[activePageId!];
                if (!pageToUpdate) return prevPages;

                const updatedPagePlaces = pageToUpdate.places.map(p_ui => {
                    const updatedPlaceData = responseData.places.find(rp => rp.id === p_ui.id);
                    
                    const isRegularSourcePlace = pageToUpdate.arcs.some(arc => 
                        arc.incomingId === p_ui.id && 
                        arc.type === 'REGULAR' && 
                        arc.outgoingId === selectedTransitionId
                    );
                    
                    const isBidirectionalPlace = pageToUpdate.arcs.some(arc => 
                        (arc.incomingId === p_ui.id || arc.outgoingId === p_ui.id) &&
                        arc.type === 'BIDIRECTIONAL' && 
                        (arc.incomingId === selectedTransitionId || arc.outgoingId === selectedTransitionId)
                    );
                    
                    if (updatedPlaceData && isRegularSourcePlace) {
                        return { ...p_ui, tokens: updatedPlaceData.tokens };
                    } else if (isBidirectionalPlace) {
                        // Decrement for bidirectional - this is the ONLY place it happens
                        return { ...p_ui, tokens: Math.max(0, p_ui.tokens - 1) };
                    }
                    
                    return p_ui;
                });

                const updatedPageTransitions = pageToUpdate.transitions.map(t_ui => {
                    const updatedTransitionData = responseData.transitions?.find(rt => rt.id === t_ui.id);
                    return updatedTransitionData ? { ...t_ui, enabled: updatedTransitionData.enabled } : { ...t_ui, enabled: false };
                });

                const responseEnabledTransitions = responseData.transitions?.filter(t => t.enabled).map(t => t.id) || [];
                let newConflictResolutionMode = false;
                let newConflictingTransitions: string[] = [];

                // Check if *still* in conflict after resolution (possible if the fired transition enables others)
                if (pageToUpdate.deterministicMode && responseEnabledTransitions.length > 1) {
                     newConflictResolutionMode = true;
                     newConflictingTransitions = responseEnabledTransitions;
                     // Conflict state will be handled after animations complete
                } else {
                     // No new conflicts
                }

                return {
                    ...prevPages,
                    [activePageId!]: {
                        ...pageToUpdate,
                        places: updatedPagePlaces,
                        transitions: updatedPageTransitions,
                        conflictResolutionMode: newConflictResolutionMode,
                        conflictingTransitions: newConflictingTransitions,
                    }
                };
            });
            setProjectHasUnsavedChanges(true); // Simulation/resolution changes data

        } catch (error) {
            console.error('Error resolving conflict:', error);
            // Revert UI state and exit conflict mode on unexpected error
            if (activePageId && pages[activePageId]) { // Check existence before accessing
                 setPages(prev => ({ ...prev, [activePageId!]: { ...prev[activePageId!], transitions: pages[activePageId!].transitions, conflictResolutionMode: false } }));
            }
            setCurrentFiredTransitions([]);
        }
    };

    const handleCompleteAnimations = () => {
        tokenAnimator.completeCurrentAnimations();
        setAnimationMessage(null);
    };

    const handleReset = async () => {
        if (!activePageId || !pages[activePageId]) {
            console.log("No active page to reset.");
            return;
        }
        const pageToReset = pages[activePageId]; // Get page data before potential undo modifies it if undo is added back
        if (pageToReset.places.length > 0 || pageToReset.transitions.length > 0 || pageToReset.arcs.length > 0) {
            handleUndo(); // Save current state to history if not empty, then undo to "previous"
        }

        const defaultPageData: PetriNetPageData = {
            id: pageToReset.id, 
            title: pageToReset.title, 
            places: [],
            transitions: [],
            arcs: [],
            deterministicMode: false, 
            conflictResolutionMode: false, 
            conflictingTransitions: [], 
            selectedElements: [], 
            history: { places: [], transitions: [], arcs: [], title: [] }, 
            zoomLevel: 1, 
            panOffset: { x: 0, y: 0 } 
        };
        setPages(prevPages => ({
            ...prevPages,
            [activePageId!]: defaultPageData
        }));
        setCurrentFiredTransitions([]);
        clearClipboard(); 
        setProjectHasUnsavedChanges(true); // Resetting implies a change from the saved state
    };

    const updatePlaceSize = (id: string, newRadius: number, resizeState: 'start' | 'resizing' | 'end') => {
        if (!activePageId) return;
        
        if (resizeState === 'start') {
            // Save history only at the start of the resize, if the page data exists
            if (pages[activePageId!]) {
                saveToHistory(pages[activePageId!]);
            }
        }

        setPages(prev => {
            if (!prev[activePageId!]) return prev;
            const currentPageData = prev[activePageId!];

            const updatedPlaces = currentPageData.places.map(p => 
                p.id === id ? { ...p, radius: newRadius } : p
            );

            if (JSON.stringify(currentPageData.places) === JSON.stringify(updatedPlaces)) return prev;
            
            if (resizeState === 'end') {
                setProjectHasUnsavedChanges(true);
            }

            return {
                ...prev,
                [activePageId!]: { 
                    ...currentPageData, 
                    places: updatedPlaces,
                }
            };
        });
    };

    const updateTransitionSize = (id: string, newWidth: number, newHeight: number, resizeState: 'start' | 'resizing' | 'end') => {
        if (!activePageId) return;

        if (resizeState === 'start') {
            if (pages[activePageId!]) {
                saveToHistory(pages[activePageId!]);
            }
        }

        setPages(prev => {
            if (!prev[activePageId!]) return prev;
            const currentPageData = prev[activePageId!];

            const updatedTransitions = currentPageData.transitions.map(t => 
                 t.id === id ? { ...t, width: newWidth, height: newHeight } : t
            );

             if (JSON.stringify(currentPageData.transitions) === JSON.stringify(updatedTransitions)) return prev;
             
            if (resizeState === 'end') {
                setProjectHasUnsavedChanges(true);
            }

            return {
                ...prev,
                [activePageId!]: { 
                    ...currentPageData, 
                    transitions: updatedTransitions, 
                }
            };
        });
    };

    const updateElementPosition = (id: string, newX: number, newY: number, dragState: 'start' | 'dragging' | 'end' = 'end') => {
        if (!activePageId || !activePageData) return;
        
        // --- Drag Start Logic ---
        if (dragState === 'start') {
            saveToHistory(activePageData); 
            const { places: placesAtDragStart, transitions: transitionsAtDragStart, selectedElements: currentSelectedElements } = activePageData; 
            dragStartPositionsRef.current.clear();
            const elementsToTrack = [...placesAtDragStart, ...transitionsAtDragStart];
            currentSelectedElements.forEach(selectedId => {
                const element = elementsToTrack.find(el => el.id === selectedId); 
                if (element) {
                    dragStartPositionsRef.current.set(selectedId, { x: element.x, y: element.y });
                }
            });
            if (!currentSelectedElements.includes(id)) {
                const mainElement = elementsToTrack.find(el => el.id === id);
                if (mainElement) {
                    dragStartPositionsRef.current.set(id, { x: mainElement.x, y: mainElement.y });
                 }
            }
            return; 
        }

        // --- Dragging or End Logic ---
        const startPos = dragStartPositionsRef.current.get(id);
        if (!startPos) { 
             if (dragState === 'end') dragStartPositionsRef.current.clear();
             console.warn("Drag update/end called without valid start position for element:", id);
             return; 
         }

        const deltaX = newX - startPos.x;
        const deltaY = newY - startPos.y;

        // Update state if dragging OR ending
        if (dragState === 'dragging' || dragState === 'end') {
             setPages(prevPages => {
                 const currentPage = prevPages[activePageId!];
                 if (!currentPage) return prevPages;
                 
                 const currentSelectedElements = currentPage.selectedElements; 
                 const isMultiSelect = currentSelectedElements.length > 1 && currentSelectedElements.includes(id);

                 const updatedPlaces = currentPage.places.map(p => {
                     const originalStartPos = dragStartPositionsRef.current.get(p.id);
                     const shouldMove = p.id === id || (isMultiSelect && currentSelectedElements.includes(p.id));
                     if (shouldMove && originalStartPos) { 
                         return { ...p, x: originalStartPos.x + deltaX, y: originalStartPos.y + deltaY };
                }
                return p;
                 });

                 const updatedTransitions = currentPage.transitions.map(t => {
                     const originalStartPos = dragStartPositionsRef.current.get(t.id);
                     const shouldMove = t.id === id || (isMultiSelect && currentSelectedElements.includes(t.id));
                     if (shouldMove && originalStartPos) {
                         return { ...t, x: originalStartPos.x + deltaX, y: originalStartPos.y + deltaY };
                }
                return t;
                 });

                 const placesChanged = JSON.stringify(currentPage.places) !== JSON.stringify(updatedPlaces);
                 const transitionsChanged = JSON.stringify(currentPage.transitions) !== JSON.stringify(updatedTransitions);

                 if (!placesChanged && !transitionsChanged) {
                     return prevPages; 
                 }

                 return {
                     ...prevPages,
                     [activePageId!]: {
                         ...currentPage,
                         places: updatedPlaces,
                         transitions: updatedTransitions,
                     }
                 };
             });
        }

        // Clear ref only on end
        if (dragState === 'end') {
            dragStartPositionsRef.current.clear();
        }
    };

    const handleTokenUpdate = (placeId: string, newTokens: number) => {
        if (!activePageId || !pages[activePageId]) return;
        setPages(prevPages => {
            const currentPage = prevPages[activePageId!];
            if (!currentPage) return prevPages;
            const updatedPlaces = currentPage.places.map(place =>
                place.id === placeId ? { ...place, tokens: newTokens } : place
            );
            if (updatedPlaces === currentPage.places) return prevPages;
            return {
                ...prevPages,
                [activePageId!]: { ...currentPage, places: updatedPlaces }
            };
        });
        setProjectHasUnsavedChanges(true);
    };

    const handleNameUpdate = (id: string, newName: string) => {
         if (!activePageId || !pages[activePageId]) return;
        setPages(prevPages => {
            const currentPage = prevPages[activePageId!];
            if (!currentPage) return prevPages;

            let changed = false;
            const updatedPlaces = currentPage.places.map(place => {
                if (place.id === id) {
                    changed = true;
                    return { ...place, name: newName };
                }
                return place;
            });
            const updatedTransitions = currentPage.transitions.map(transition => {
                if (transition.id === id) {
                    changed = true;
                    return { ...transition, name: newName };
                }
                return transition;
            });

            if (!changed) return prevPages;

            return {
                ...prevPages,
                [activePageId!]: {
                     ...currentPage, 
                     places: updatedPlaces, 
                     transitions: updatedTransitions 
                }
            };
        });
        setProjectHasUnsavedChanges(true);
    };

    // =========================================================================================
    // XI. SNAPSHOT HANDLERS
    // =========================================================================================
    const handleSaveSnapshot = () => {
        if (!activePageId || !activePageData) {
            console.log("No active page to snapshot.");
            return;
        }

        setPages(prevPages => {
            const currentPage = prevPages[activePageId!];
            if (!currentPage) return prevPages;

            // Create snapshot of current simulation state
            const snapshot: PageSnapshot = {
                places: JSON.parse(JSON.stringify(currentPage.places)),
                transitions: JSON.parse(JSON.stringify(currentPage.transitions)),
                arcs: JSON.parse(JSON.stringify(currentPage.arcs)),
                timestamp: Date.now(),
                description: `Snapshot taken at ${new Date().toLocaleString()}`
            };

            return {
                ...prevPages,
                [activePageId!]: {
                    ...currentPage,
                    snapshot
                }
            };
        });
        
        // Show the saved indicator temporarily
        setShowSavedIndicator(true);
        setTimeout(() => {
            setShowSavedIndicator(false);
        }, 5000); // Hide after 5 seconds
        
        console.log("Snapshot saved for page:", activePageData.title);
    };

    const handleRestoreSnapshot = () => {
        if (!activePageId || !activePageData || !activePageData.snapshot) {
            console.log("No snapshot available to restore.");
            return;
        }

        // Save current state to history before restoring snapshot
        saveToHistory(activePageData);

        setPages(prevPages => {
            const currentPage = prevPages[activePageId!];
            if (!currentPage || !currentPage.snapshot) return prevPages;

            return {
                ...prevPages,
                [activePageId!]: {
                    ...currentPage,
                    places: JSON.parse(JSON.stringify(currentPage.snapshot.places)),
                    transitions: JSON.parse(JSON.stringify(currentPage.snapshot.transitions)),
                    arcs: JSON.parse(JSON.stringify(currentPage.snapshot.arcs)),
                    selectedElements: [], // Clear selection when restoring
                    conflictResolutionMode: false,
                    conflictingTransitions: []
                }
            };
        });

        // Clear any ongoing animations and fired transitions
        setCurrentFiredTransitions([]);
        tokenAnimator.clear();
        setProjectHasUnsavedChanges(true);
        
        console.log("Snapshot restored for page:", activePageData.title);
    };

    // =========================================================================================
    // XII. MENU HANDLERS
    // =========================================================================================
    const processLoadedData = (pageToLoad: Partial<PetriNetPageData>, sourceTitle?: string) => {
        const newPageId = pageToLoad.id || `page_${Date.now()}`;
        // Ensure all fields of PetriNetPageData are present, using defaults where necessary
        const loadedPlaces: UIPlace[] = (pageToLoad.places || []).map(place => ({ 
            id: place.id || `place_${Date.now()}_${newPageId}`, 
            name: place.name || '',
            tokens: place.tokens || 0,
            x: place.x ?? Math.random() * 500 + 100, 
            y: place.y ?? Math.random() * 300 + 100,
            radius: place.radius ?? 46,
            bounded: place.bounded ?? false,
            capacity: place.capacity ?? null
        }));
        const loadedTransitions: UITransition[] = (pageToLoad.transitions || []).map(transition => ({ 
             id: transition.id || `trans_${Date.now()}_${newPageId}`, 
            name: transition.name || '',
             enabled: transition.enabled ?? false,
             arcIds: transition.arcIds || [], 
             x: transition.x ?? Math.random() * 500 + 200,
             y: transition.y ?? Math.random() * 300 + 200, 
            width: transition.width ?? 120,
            height: transition.height ?? 54
        }));
        const loadedArcs: UIArc[] = (pageToLoad.arcs || []).map(arc => ({ 
             id: arc.id || `arc_${Date.now()}_${newPageId}`, 
             type: arc.type ?? 'REGULAR', 
            incomingId: arc.incomingId,
             outgoingId: arc.outgoingId
        }));

        const newPageData: PetriNetPageData = {
            id: newPageId,
            title: pageToLoad.title || sourceTitle || `Page ${pageOrder.length + 1}`, 
            places: loadedPlaces,
            transitions: loadedTransitions,
            arcs: loadedArcs,
            deterministicMode: pageToLoad.deterministicMode ?? false, 
            conflictResolutionMode: pageToLoad.conflictResolutionMode ?? false, 
            conflictingTransitions: pageToLoad.conflictingTransitions || [], 
            selectedElements: pageToLoad.selectedElements || [], 
            history: pageToLoad.history || { places: [], transitions: [], arcs: [], title: [] }, 
            zoomLevel: pageToLoad.zoomLevel ?? 1, 
            panOffset: pageToLoad.panOffset ?? { x: -750, y: -421.875 },
            validatorConfigs: pageToLoad.validatorConfigs ? { ...pageToLoad.validatorConfigs } : { ...defaultValidatorConfigs }
        };
        
        setPages(prevPages => ({
            ...prevPages,
            [newPageId]: newPageData
        })); 
        // Only add to pageOrder and set active if it's a truly new page (not part of project load)
        if (!Object.keys(pages).includes(newPageId)) {
             setPageOrder(prevOrder => [...prevOrder, newPageId]); 
        }
        setActivePageId(newPageId);
        setCurrentFiredTransitions([]);
        setProjectHasUnsavedChanges(true); // Loading data or importing is an unsaved change until saved as project
    };

    // This function is kept for the legacy import in MenuBar for now.
    const handleLegacyImport = (importedData: PetriNetDTO) => {
        const partialPageData: Partial<PetriNetPageData> = {
            title: importedData.title,
            places: importedData.places.map(p => ({
                ...p, 
                name: p.name || '',
                x: p.x ?? Math.random() * 500 + 100, 
                y: p.y ?? Math.random() * 300 + 100,
                radius: p.radius ?? 46,
                bounded: p.bounded ?? false,
                capacity: p.capacity ?? null
            })), 
            transitions: importedData.transitions.map(t => ({
                ...t, 
                name: t.name || '',
                x: t.x ?? Math.random() * 500 + 200, 
                y: t.y ?? Math.random() * 300 + 200,
                width: t.width ?? 120,
                height: t.height ?? 54
            })), 
            arcs: importedData.arcs.map(a => ({
                id: a.id,
                type: a.type ?? 'REGULAR',
                incomingId: a.incomingId,
                outgoingId: a.outgoingId 
            })),
            deterministicMode: importedData.deterministicMode,
            zoomLevel: importedData.zoomLevel ?? 1,
            panOffset: importedData.panOffset ?? { x: -750, y: -421.875 }
        };
        processLoadedData(partialPageData, "Imported Page");
    };

    // --- Updated Open Project using FSA API with fallback --- 
    const handleOpenProject = async (event?: React.ChangeEvent<HTMLInputElement>) => {
        // Fallback Branch: Executed if an event is provided (meaning called from input element)
        if (event && event.target && event.target.files && event.target.files[0]) {
            setProjectFileHandle(null); // Cannot get a persistent handle via input
            const file = event.target.files[0];
            try {
                const contents = await file.text();
                const projectData = JSON.parse(contents) as ProjectDTO;
                
                if (!projectData || typeof projectData.projectTitle !== 'string' || !projectData.pages || !projectData.pageOrder) {
                  throw new Error('Invalid project file format.');
                }

                setProjectTitle(projectData.projectTitle || file.name.replace(/\.[^/.]+$/, ""));
                setPages(projectData.pages || {});
                setPageOrder(projectData.pageOrder || []);
                setActivePageId(projectData.activePageId || (projectData.pageOrder?.[0] ?? null));
                setCurrentFiredTransitions([]);
                clearClipboard(); 
                setProjectHasUnsavedChanges(false); // Freshly opened project is considered saved
                setOriginalFileNameFromInput(file.name); // Store the original file name

            } catch (error: any) {
                console.error("Error opening project from input:", error);
                alert(`Failed to open project file: ${error.message}`);
                setProjectFileHandle(null); 
                setOriginalFileNameFromInput(null);
            }
            // Reset file input value
            if (event.target) event.target.value = '';
        }
        // FSA API Branch: Executed if no event is provided AND API is available
        else if ('showOpenFilePicker' in window) {
            try {
                const [handle] = await window.showOpenFilePicker({
                    types: [
                        {
                            description: 'Petri Net Projects',
                            accept: {
                                'application/json': ['.petri', '.pats', '.json']
                            }
                        },
                    ],
                    excludeAcceptAllOption: true,
                    multiple: false,
                });

                setProjectFileHandle(handle); // Store the handle
                const file = await handle.getFile();
                const contents = await file.text();
                const projectData = JSON.parse(contents) as ProjectDTO;

                if (!projectData || typeof projectData.projectTitle !== 'string' || !projectData.pages || !projectData.pageOrder) {
                  throw new Error('Invalid project file format.');
                }

                setProjectTitle(projectData.projectTitle || file.name.replace(/\.[^/.]+$/, ""));
                setPages(projectData.pages || {});
                setPageOrder(projectData.pageOrder || []);
                setActivePageId(projectData.activePageId || (projectData.pageOrder?.[0] ?? null));
                setCurrentFiredTransitions([]);
                clearClipboard(); 
                setProjectHasUnsavedChanges(false); // Freshly opened project is considered saved
                setOriginalFileNameFromInput(null); // Clear any original file name from input

            } catch (error: any) {
                 if (error.name !== 'AbortError') {
                     console.error("Error opening file with FSA API:", error);
                     alert(`Failed to open project file: ${error.message}`);
                 }
                 setProjectFileHandle(null); // Clear handle on any FSA error/cancel
                 setOriginalFileNameFromInput(null); // Clear original file name on any FSA error/cancel
            }
        } 
        // Error Case: No event, and FSA API not supported.
        // This shouldn't be reached if MenuBar logic is correct.
        else {
            console.error("handleOpenProject: FSA not available and no input event provided. This indicates an issue in the calling logic (e.g., MenuBar).");
            alert("File open functionality is not available. Your browser might be outdated or not support this feature.");
        }
    };

    const handleImportPages = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;
        let changesMade = false;
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            try {
                const pageData = await readJSONFile(file) as PetriNetPageData;
                // Basic validation for a page file
                if (!pageData || !pageData.id || !pageData.title) { // Check for essential fields
                    console.warn(`Skipping file ${file.name}: Invalid page file format.`);
                    continue;
                }
                // Ensure imported page ID is unique if it clashes with an existing one
                let newPageId = pageData.id;
                let counter = 1;
                while (pages[newPageId]) {
                    newPageId = `${pageData.id}_imported_${counter++}`;
                }
                const pageDataWithNewGuid = {...pageData, id: newPageId};

                processLoadedData(pageDataWithNewGuid, file.name.replace(/\.page\.json$|\.json$/, ''));
                changesMade = true;
            } catch (error) {
                console.error(`Error importing page ${file.name}:`, error);
                alert(`Failed to import page ${file.name}.`);
            }
        }
        event.target.value = '';
        if (changesMade) {
            setProjectHasUnsavedChanges(true); // Importing pages marks project as having unsaved changes
        }
    };

    // =========================================================================================
    // XIII. VALIDATION HANDLERS
    // =========================================================================================
    const handleValidationResult = (result: ValidationResult) => {
        console.log('Validation result:', result);
    };

    const handleUpdatePlaceCapacity = (id: string, newCapacity: number | null) => {
         if (!activePageId || !pages[activePageId]) return;
        setPages(prevPages => {
            const currentPage = prevPages[activePageId!];
            if (!currentPage) return prevPages;

            let changed = false;
            const updatedPlaces = currentPage.places.map(place => {
                if (place.id === id) {
                    const newBounded = newCapacity !== null;
                    let validCapacity = newCapacity;
                    if (newBounded && (validCapacity === null || validCapacity < 0)) {
                         validCapacity = 0;
                    }
                    let newTokens = place.tokens;
                    if (newBounded && validCapacity !== null && newTokens > validCapacity) {
                        newTokens = validCapacity;
                    }
                    if (place.bounded !== newBounded || place.capacity !== validCapacity || place.tokens !== newTokens) {
                        changed = true;
                    return { ...place, bounded: newBounded, capacity: validCapacity, tokens: newTokens };
                    }
                }
                return place;
            });

            if (!changed) return prevPages;

            return {
                ...prevPages,
                [activePageId!]: { ...currentPage, places: updatedPlaces }
            };
        });
        setProjectHasUnsavedChanges(true);
    };

    const handleSetDeterministicMode = (newValue: boolean) => {
        if (!activePageId || !pages[activePageId]) return;

        setPages(prevPages => {
            const currentPage = prevPages[activePageId!];
            let updatedConflictMode = currentPage.conflictResolutionMode;
            let updatedConflictingTransitions = currentPage.conflictingTransitions;

            if (!newValue && currentPage.conflictResolutionMode) {
                updatedConflictMode = false;
                updatedConflictingTransitions = [];
            }

            return {
                ...prevPages,
                [activePageId!]: { 
                    ...currentPage, 
                    deterministicMode: newValue,
                    conflictResolutionMode: updatedConflictMode,
                    conflictingTransitions: updatedConflictingTransitions
                }
            };
        });
        setProjectHasUnsavedChanges(true);
    };

    const handleUpdateValidatorConfigs = useCallback((pageId: string, newConfigs: Partial<ValidatorPageConfig>) => {
        setPages(prevPages => {
            if (!prevPages[pageId]) {
                console.warn(`Attempted to update validator configs for non-existent page: ${pageId}`);
                return prevPages;
            }
            const currentPageData = prevPages[pageId];
            const currentValidatorConfigs = currentPageData.validatorConfigs || { ...defaultValidatorConfigs };
            
            const updatedConfigs: ValidatorPageConfig = { 
                ...currentValidatorConfigs, 
                ...newConfigs 
            };
    
            if (JSON.stringify(currentValidatorConfigs) === JSON.stringify(updatedConfigs)) {
                return prevPages;
            }
    
            return {
                ...prevPages,
                [pageId]: {
                    ...currentPageData,
                    validatorConfigs: updatedConfigs
                }
            };
        });
        setProjectHasUnsavedChanges(true);
    }, [setPages]);

    const onValidatorConfigsChangeCallback = useCallback((updatedConfigParts: Partial<ValidatorPageConfig>) => {
        if (activePageId) {
            handleUpdateValidatorConfigs(activePageId, updatedConfigParts);
        }
    }, [activePageId, handleUpdateValidatorConfigs]);

    // =========================================================================================
    // XIV. PAGE HANDLERS
    // =========================================================================================
    const handleCreatePage = () => {
        const newPageId = `page_${Date.now()}`;
        const pageCount = pageOrder.length;
        const newPage: PetriNetPageData = {
            id: newPageId,
            title: `Page ${pageCount + 1}`,
            places: [],
            transitions: [],
            arcs: [],
            deterministicMode: false,
            conflictResolutionMode: false,
            conflictingTransitions: [],
            selectedElements: [],
            history: { places: [], transitions: [], arcs: [], title: [] },
            zoomLevel: 1,
            panOffset: { x: -750, y: -421.875 },
            validatorConfigs: { ...defaultValidatorConfigs } // Initialize
        };
        setPages(prevPages => ({
            ...prevPages,
            [newPageId]: newPage
        }));
        setPageOrder(prevOrder => [...prevOrder, newPageId]);
        setActivePageId(newPageId);
        setProjectHasUnsavedChanges(true);
    };

    const handleCreatePageWithData = (pageData: PetriNetPageData) => {
        setPages(prevPages => ({
            ...prevPages,
            [pageData.id]: pageData
        }));
        setPageOrder(prevOrder => [...prevOrder, pageData.id]);
        setActivePageId(pageData.id);
        setProjectHasUnsavedChanges(true);
    };

    const handleRenamePage = (pageId: string, newTitle: string) => {
        // This is now primarily handled by EditableTitle calling handlePageTitleSave
        // Kept for other potential direct calls.
        if (!pageId || !newTitle.trim() || !pages[pageId] || pages[pageId].title === newTitle.trim()) return;

        setPages(prevPages => {
            const pageToUpdate = prevPages[pageId];
            if (!pageToUpdate || pageToUpdate.title === newTitle.trim()) return prevPages;
            
            saveToHistory(pageToUpdate); // Save state BEFORE renaming for undo

            return {
                ...prevPages,
                [pageId]: {
                    ...pageToUpdate,
                    title: newTitle.trim() 
                }
            };
        });
        setProjectHasUnsavedChanges(true); 
    };

    const handleDeletePage = (pageIdToDelete: string) => {
        const pageIds = pageOrder;
        if (pageIds.length <= 1) {
            console.warn("Cannot delete the last page.");
            return; 
        }

        let nextActivePageId: string | null = null;
        const currentIndex = pageIds.indexOf(pageIdToDelete);

        if (activePageId === pageIdToDelete) {
            if (currentIndex > 0) {
                nextActivePageId = pageIds[currentIndex - 1];
            } else { // Deleting the first page
                nextActivePageId = pageIds[1]; 
            }
        } else {
            nextActivePageId = activePageId; // Keep current active page
        }

        const updatedPages = { ...pages };
        delete updatedPages[pageIdToDelete];
        setPages(updatedPages);
        
        setPageOrder(prevOrder => prevOrder.filter(id => id !== pageIdToDelete));
        
        setActivePageId(nextActivePageId);
        setCurrentFiredTransitions([]);
        setProjectHasUnsavedChanges(true); // Deleting a page is an unsaved change
    };

    const handleReorderPages = (newPageOrder: string[]) => {
        // Compare old and new order to see if a change actually occurred
        if (JSON.stringify(pageOrder) !== JSON.stringify(newPageOrder)) {
            setPageOrder(newPageOrder);
            setProjectHasUnsavedChanges(true); // Reordering pages is an unsaved change
        }
    };

    // =========================================================================================
    // XIV. ZOOM/PAN HANDLER
    // =========================================================================================
    const handleViewChange = (view: { zoomLevel: number, panOffset: {x: number, y: number} }) => {
        if (!activePageId || !pages[activePageId]) return; 
        setPages(prev => {
            if (!prev[activePageId!]) return prev;
            // Check if update is necessary
            const currentPage = prev[activePageId!];
            if (currentPage.zoomLevel === view.zoomLevel && 
                currentPage.panOffset?.x === view.panOffset.x &&
                currentPage.panOffset?.y === view.panOffset.y) {
                return prev; 
            }
            return {
                ...prev,
                [activePageId!]: {
                    ...currentPage,
                    zoomLevel: view.zoomLevel,
                    panOffset: view.panOffset
                }
            };
        });
        // Zooming and panning DO NOT set projectHasUnsavedChanges
    };

    // New handler specifically for zoom level changes from MenuBar
    const handleZoomLevelChange = (newZoom: number) => {
        if (activePageId && pages[activePageId]) { // Check pages[activePageId] for robustness
            setPages(prev => {
                if (!prev[activePageId!]) return prev;
                const currentPage = prev[activePageId!];
                if (currentPage.zoomLevel === newZoom) return prev; // Avoid unnecessary updates
                return {
                    ...prev,
                    [activePageId!]: { ...currentPage, zoomLevel: newZoom }
                };
            });
            // Zooming does not set projectHasUnsavedChanges to true
        }
    };

    // =========================================================================================
    // XV. VIEW HANDLERS
    // =========================================================================================
    const handleCenterView = () => {
      if (!activePageId) return;

      // default centered view
      const defaultZoom = 1.0;
      const defaultPanOffset = { x: -750, y: -421.875 }; 

      setPages(prev => {
        if (!prev[activePageId!]) return prev;
        const currentPage = prev[activePageId!];

        if (currentPage.zoomLevel === defaultZoom && 
            currentPage.panOffset?.x === defaultPanOffset.x &&
            currentPage.panOffset?.y === defaultPanOffset.y) {
           return prev; 
        }
        
        return {
          ...prev,
          [activePageId!]: {
            ...currentPage,
            zoomLevel: defaultZoom,
            panOffset: defaultPanOffset
          }
        };
      });
      // Centering view DOES NOT set projectHasUnsavedChanges to true
    };

    // =========================================================================================
    // XVI. FILE UTILITY FUNCTIONS
    // =========================================================================================
    const downloadJSON = (data: object, filename: string) => {
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const href = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = href;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(href);
    };

    const readJSONFile = (file: File): Promise<any> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    if (event.target?.result) {
                        const parsed = JSON.parse(event.target.result as string);
                        resolve(parsed);
                    } else {
                        reject(new Error("File reading resulted in null."));
                    }
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = (error) => reject(error);
            reader.readAsText(file);
        });
    };

    // =========================================================================================
    // XVII. PROJECT/PAGE SAVE AND LOAD HANDLERS
    // =========================================================================================
    
    // --- Save Project As using FSA API with fallback ---
    const handleSaveProjectAs = async (suggestedFilename?: string) => {
        const filenameToSuggest = suggestedFilename || `${projectTitle.replace(/\s+/g, '_')}.petri`;

        const projectDataToSave: ProjectDTO = {
            projectTitle: projectTitle,
            pages: pages,
            pageOrder: pageOrder,
            activePageId: activePageId,
            version: '1.0.0' 
        };

        // FSA API Branch
        if ('showSaveFilePicker' in window) {
            try {
                const handle = await window.showSaveFilePicker({
                    suggestedName: filenameToSuggest,
                    types: [
                        {
                            description: 'Petri Net Project',
                            accept: {
                                'application/json': ['.petri'],
                            },
                        },
                    ],
                });
                
                setProjectFileHandle(handle); // Store the handle for future Saves
                const writable = await handle.createWritable();
                await writable.write(JSON.stringify(projectDataToSave, null, 2));
                await writable.close();
                
                // Update projectTitle state if user saved with a different name
                if (handle.name && handle.name !== filenameToSuggest && handle.name.endsWith('.petri')) {
                    const newTitle = handle.name.replace(/\.petri$/, '');
                    if (newTitle !== projectTitle) {
                        setProjectTitle(newTitle);
                    }
                }
                
                console.log("Project saved successfully as new file with File System Access API");
                setProjectHasUnsavedChanges(false); 
                setOriginalFileNameFromInput(null); 
                
            } catch (error: any) {
                if (error.name !== 'AbortError') {
                    console.error("Error saving file with FSA API:", error);
                    alert(`Failed to save project file: ${error.message}`);
                }
                
            }
        }
        // Fallback Branch (Download)
        else {
            console.warn("FSA API not supported, falling back to download.");
            setProjectFileHandle(null); 
            downloadJSON(projectDataToSave, filenameToSuggest);
            setProjectHasUnsavedChanges(false);
            setOriginalFileNameFromInput(null);
        }
    };
    
    // --- Updated Save Project using FSA API handle if available ---
    const handleSaveProject = async () => {
        const projectToSave: ProjectDTO = {
            projectTitle: projectTitle, 
            pages: pages,
            pageOrder: pageOrder,
            activePageId: activePageId,
            version: '1.0.0'
        };

        if (projectFileHandle) {
            try {
                // Check current permission status
                let permStatus = await projectFileHandle.queryPermission({ mode: 'readwrite' });

                if (permStatus === 'prompt') {
                    // Request permission.
                    permStatus = await projectFileHandle.requestPermission({ mode: 'readwrite' });
                }

                if (permStatus === 'granted') {
                    const projectJsonString = JSON.stringify(projectToSave, null, 2);
                    const writable = await projectFileHandle.createWritable();
                    await writable.write(projectJsonString);
                    await writable.close();
                    console.log("Project saved successfully with File System Access API");
                    setProjectHasUnsavedChanges(false);
                    setOriginalFileNameFromInput(null); 
                } else {
                    console.warn("Write permission not granted. Falling back to Save As.");
                    alert("Could not save directly. Please choose a location to save the project.");
                    await handleSaveProjectAs(projectFileHandle.name);
                }
            } catch (error: any) { 
                console.error("Error saving project with File System Access API:", error);
                alert(`Failed to save project: ${error.message}. Trying Save As...`);
                await handleSaveProjectAs(projectFileHandle.name);
            }
        }
        else if (originalFileNameFromInput) { 
            await handleSaveProjectAs(originalFileNameFromInput);
        }
        else {
            await handleSaveProjectAs(); 
        }
    };

    const handleExportActivePage = (suggestedFilename?: string) => {
        if (!activePageData) {
            alert("No active page to export.");
            return;
        }
        const filename = suggestedFilename || activePageData.title.replace(/[^a-z0-9_\-\s]/gi, '_').replace(/\s+/g, '-') + '.page.json' || 'page.page.json';
        downloadJSON(activePageData, filename); // Exporting the full PetriNetPageData
    };

    // =========================================================================================
    // XVIII. RENDER
    // =========================================================================================
    return (
        <div className="app">
            <EditableTitle 
                ref={titleRef}
                title={projectTitle} 
                onTitleChange={(newTitle) => {
                    if (newTitle !== projectTitle) {
                        setProjectTitle(newTitle);
                        setProjectHasUnsavedChanges(true);
                    }
                }}
            />
            
            <MenuBar
                projectData={currentProjectDTO}
                onNewProject={handleNewProject}
                onImport={handleLegacyImport}
                onOpenProject={handleOpenProject}
                onSaveProject={handleSaveProject}
                onSaveProjectAs={handleSaveProjectAs}
                onImportPages={handleImportPages}
                onExportActivePage={handleExportActivePage}
                onExportProject={() => { 
                    const projectToExport: ProjectDTO = { 
                        projectTitle: projectTitle,
                        pages: pages,
                        pageOrder: pageOrder,
                        activePageId: activePageId,
                        version: '1.0.0'
                    };
                    downloadJSON(projectToExport, `${projectTitle.replace(/\s+/g, '_')}_project.pats`);
                }}
                currentZoom={activePageData?.zoomLevel || 1}
                onZoomChange={handleZoomLevelChange} 
                onCreatePage={handleCreatePage}
                projectFileHandle={projectFileHandle}
                projectHasUnsavedChanges={projectHasUnsavedChanges}
                onRenameProjectTitle={(newTitle: string) => {
                    if (newTitle !== projectTitle) {
                        setProjectTitle(newTitle);
                        setProjectHasUnsavedChanges(true);
                    }
                }}
                onSaveSnapshot={handleSaveSnapshot}
                onRestoreSnapshot={handleRestoreSnapshot}
                hasSnapshot={!!activePageData?.snapshot}
                activePageTitle={activePageData?.title || 'No Page'}
                showSavedIndicator={showSavedIndicator}
            />

            <div className="main-content">
                <div className="left-sidebar">
                    <div className="toolbar-container">
                        <Toolbar
                            selectedTool={selectedTool}
                            setSelectedTool={(tool) => {
                                if (tool === 'ARC') {
                                    clearActivePageSelection();
                                }
                                setSelectedTool(tool);
                            }}
                            arcType={arcType}
                            setArcType={setArcType}
                            showCapacityEditorMode={showCapacityEditorMode}
                            onToggleCapacityEditorMode={setShowCapacityEditorMode}
                        />
                    </div>

                    <div className="controls-section">
                        {/* Deterministic Mode Switch */}
                        <div className="control-item">
                            <span className="control-label">Deterministic Mode</span>
                            <label className="switch-container" htmlFor="deterministic-mode">
                            <input
                                type="checkbox"
                                id="deterministic-mode"
                                checked={activePageData?.deterministicMode ?? false}
                                    onChange={(e) => handleSetDeterministicMode(e.target.checked)}
                                    style={{ opacity: 0, width: 0, height: 0 }}
                                />
                                <span className="switch-slider round"></span>
                            </label>
                        </div>

                        {/* Show Capacity Switch */}
                        <div className="control-item">
                            <span className="control-label">Show Capacity</span>
                            <label className="switch-container" htmlFor="capacity-mode-toggle">
                                <input
                                    type="checkbox"
                                    id="capacity-mode-toggle"
                                    checked={showCapacityEditorMode}
                                    onChange={(e) => setShowCapacityEditorMode(e.target.checked)}
                                    style={{ opacity: 0, width: 0, height: 0 }}
                                />
                                <span className="switch-slider round"></span>
                            </label>
                        </div>
                        
                        <button 
                            onClick={handleSimulate} 
                            className="next-state-button"
                            title="Advance the Petri net to the next state"
                        >
                            Next State
                        </button>
                        
                        {animationMessage && (
                            <div className="animation-message">
                                {animationMessage}
                                <button 
                                    onClick={handleCompleteAnimations}
                                    className="animation-skip-button"
                                >
                                    Skip
                                </button>
                            </div>
                        )}
                        
                        {activePageData?.conflictResolutionMode && (
                            <div className="conflict-resolution-message">
                                Select one transition to fire
                            </div>
                        )}
                    </div>
                    
                    <div className="sidebar-spacer"></div>
                    
                    <div className="reset-section">
                        <button 
                            onClick={handleReset} 
                            className="reset-canvas-button"
                            title="Clear all elements from the canvas"
                        >
                            Reset Canvas
                        </button>
                    </div>
                </div>

                <div className="center-area">
                    <div className="canvas-container-main">
                        <Canvas
                            places={activePageData?.places || []}
                            transitions={activePageData?.transitions || []}
                            arcs={activePageData?.arcs || []}
                            selectedElements={activePageData?.selectedElements || []}
                            onCanvasClick={handleCanvasClick}
                            onSelectElement={handleSelectElement}
                            onMultiSelectElement={handleMultiSelectElement}
                            onUpdatePlaceSize={updatePlaceSize}
                            onUpdateTransitionSize={updateTransitionSize}
                            onUpdateElementPosition={updateElementPosition}
                            onArcPortClick={handleArcPortClick}
                            selectedTool={selectedTool}
                            onSelectTool={setSelectedTool} 
                            arcType={arcType}
                            onUpdateToken={handleTokenUpdate}
                            onTypingChange={handleTypingChange}
                            onUpdateName={handleNameUpdate}
                            conflictResolutionMode={activePageData?.conflictResolutionMode ?? false}
                            conflictingTransitions={activePageData?.conflictingTransitions || []}
                            onConflictingTransitionSelect={continueSimulation}
                            firedTransitions={currentFiredTransitions} 
                            onUpdatePlaceCapacity={handleUpdatePlaceCapacity}
                            showCapacityEditorMode={showCapacityEditorMode}
                            zoomLevel={activePageData?.zoomLevel ?? 1}
                            panOffset={activePageData?.panOffset ?? {x: 0, y: 0}}
                            onViewChange={handleViewChange}
                            onCenterView={handleCenterView}
                            tokenAnimator={tokenAnimator}
                        />
                    </div>
                    
                    <PagesComponent 
                        pages={pages}
                        pageOrder={pageOrder}
                        activePageId={activePageId}
                        onSelectPage={setActivePageId}
                        onCreatePage={handleCreatePage}
                        onRenamePage={handleRenamePage}
                        onDeletePage={handleDeletePage}
                        onReorderPages={handleReorderPages}
                        onCreatePageWithData={handleCreatePageWithData}
                    />
                </div>

                <div className="right-panel">
                    {petriNetDTO && activePageData && (
                    <TabbedPanel
                        data={petriNetDTO}
                        onValidationResult={handleValidationResult}
                        selectedElements={activePageData?.selectedElements || []}
                        autoScrollEnabled={autoScrollEnabled}
                        onAutoScrollToggle={setAutoScrollEnabled}
                        currentMode={currentMode}
                        width="100%"
                        height="100%"
                        activePageId={activePageId}
                        validatorConfigs={activePageData.validatorConfigs || defaultValidatorConfigs}
                        onValidatorConfigsChange={onValidatorConfigsChangeCallback}
                    />
                    )}
                    {!petriNetDTO && (
                        <div className="no-active-page">
                            No active Petri net selected.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
// src/App.tsx
