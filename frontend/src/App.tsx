// src/App.tsx
import React, {useState, useCallback, useEffect, useRef, useMemo} from 'react';
import { Canvas } from './components/Canvas';
import { Toolbar } from './components/Toolbar';
import {PetriNetDTO, UIPlace, UITransition, UIArc, GRID_CELL_SIZE, ValidationResult, PetriNetPageData, ProjectDTO} from './types';
import { MenuBar } from './components/MenuBar';
import { EditableTitle, EditableTitleRef } from './components/Title.tsx';
import { API_ENDPOINTS } from './utils/api';
import { TabbedPanel } from './components/TabbedPanel';
import { useClipboard } from './hooks/useClipboard';
import { PagesComponent } from './components/PagesComponent';

// Define max history length
const MAX_HISTORY_LENGTH = 50; 

export default function App() {
    // ===== NEW MULTI-PAGE STATE MANAGEMENT =====
    const [pages, setPages] = useState<Record<string, PetriNetPageData>>({});
    const [activePageId, setActivePageId] = useState<string | null>(null);
    const [pageOrder, setPageOrder] = useState<string[]>([]);
    // Add state for the overall project title
    const [projectTitle, setProjectTitle] = useState<string>("Untitled MyPetri Project");

    // ===== TRANSIENT STATE (for active page's last interaction) =====
    const [currentFiredTransitions, setCurrentFiredTransitions] = useState<string[]>([]);
    // const [currentAnimatingTransitions, setCurrentAnimatingTransitions] = useState<Record<string, boolean>>({}); // Keep commented for now

    // ===== EXISTING GLOBAL/APP-LEVEL STATE (to be kept for now) =====
    const [selectedTool, setSelectedTool] = useState<'NONE' |'PLACE' | 'TRANSITION' | 'ARC'>('NONE');
    const [arcType, setArcType] = useState<UIArc['type']>('REGULAR');
    const [isTyping, setIsTyping] = useState(false);
    const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
    const [currentMode, setCurrentMode] = useState('select'); // Derived from selectedTool, might be removable later
    const [showCapacityEditorMode, setShowCapacityEditorMode] = useState(false);
    
    // Refs will likely remain global or need context if used by children extensively
    const dragStartPositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
    const titleRef = useRef<EditableTitleRef>(null); // This will interact with activePageData.title

    // ===== REMOVED SINGLE-NET STATE =====
    /*
    const [places, setPlaces] = useState<UIPlace[]>([]);
    const [transitions, setTransitions] = useState<UITransition[]>([]);
    const [arcs, setArcs] = useState<UIArc[]>([]);
    const [selectedElements, setSelectedElements] = useState<string[]>([]); // Now in PetriNetPageData
    const [deterministicMode, setDeterministicMode] = useState(false); // Now in PetriNetPageData
    const [conflictResolutionMode, setConflictResolutionMode] = useState(false); // Now in PetriNetPageData
    const [conflictingTransitions, setConflictingTransitions] = useState<string[]>([]); // Now in PetriNetPageData
    const [title, setTitle] = useState<string>("Untitled Petri Net"); // Now in PetriNetPageData
    const [firedTransitions, setFiredTransitions] = useState<string[]>([]); // Replaced by currentFiredTransitions
    const [animatingTransitions, setAnimatingTransitions] = useState<Record<string, boolean>>({}); // Replaced by currentAnimatingTransitions (if used)
    const [history, setHistory] = useState<{
        places: UIPlace[][],
        transitions: UITransition[][],
        arcs: UIArc[][]
    }>({
        places: [],
        transitions: [],
        arcs: []
    }); // Now in PetriNetPageData
    */

    // ===== INITIAL PAGE CREATION =====
    useEffect(() => {
        if (Object.keys(pages).length === 0 && pageOrder.length === 0) {
            const initialPageId = `page_${Date.now()}`;
            const newPage: PetriNetPageData = {
                id: initialPageId,
                title: "Page 1", // Default page title
                places: [],
                transitions: [],
                arcs: [],
                deterministicMode: false,
                conflictResolutionMode: false,
                conflictingTransitions: [],
                selectedElements: [],
                history: { places: [], transitions: [], arcs: [], title: [] },
                zoomLevel: .85,
                panOffset: { x: -880, y: -400 }
            };
            setPages({ [initialPageId]: newPage });
            setPageOrder([initialPageId]);
            setActivePageId(initialPageId);
        }
    }, [pages, pageOrder]); // Added pageOrder dependency for safety

    // ===== DERIVED STATE FOR ACTIVE PAGE ( Placeholder - Step III.1 ) =====
    const activePageData = useMemo(() => activePageId ? pages[activePageId] : null, [pages, activePageId]);

    // ===== HANDLERS AND EFFECTS =====
    
    const handleHighlightTitle = () => {
        if (titleRef.current) {
            titleRef.current.startEditing();
        }
    };
    
    // ===== HISTORY HANDLERS =====
    // Re-introducing saveToHistory specifically for drag start
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
    }, [activePageId, setPages]);
    
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
    }, [activePageId, activePageData, setPages]);

    
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
        },
        setTransitions: (updater) => {
            if (!activePageId) return;
            setPages(prev => {
                if (!prev[activePageId!]) return prev;
                const currentTransitions = prev[activePageId!].transitions;
                const newTransitions = typeof updater === 'function' ? updater(currentTransitions) : updater;
                return { ...prev, [activePageId!]: { ...prev[activePageId!], transitions: newTransitions } };
            });
        },
        setArcs: (updater) => {
            if (!activePageId) return;
            setPages(prev => {
                if (!prev[activePageId!]) return prev;
                const currentArcs = prev[activePageId!].arcs;
                const newArcs = typeof updater === 'function' ? updater(currentArcs) : updater;
                return { ...prev, [activePageId!]: { ...prev[activePageId!], arcs: newArcs } };
            });
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
                 saveToHistory(activePageData); // Call the re-introduced function
            }
        }, 
    });

    // ===== DERIVED STATE / CONSTANTS =====
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
        // Construct the full project DTO to pass to the MenuBar
        // It can be null if there are no pages yet, or represent the current state.
        if (Object.keys(pages).length === 0 && !projectTitle) return null; // Or a default initial project DTO

        return {
            projectTitle,
            pages,
            pageOrder,
            activePageId,
            version: '1.0.0' // Consistent with save logic
        };
    }, [projectTitle, pages, pageOrder, activePageId]);

    // ===== EVENT HANDLERS =====
    const handleTypingChange = (typing: boolean) => {
        setIsTyping(typing);
    };

    // ===== EFFECTS =====
    useEffect(() => {
        function handleKeyDown(e: KeyboardEvent) {
            if (isTyping) return;
            const isModifier = e.metaKey || e.ctrlKey; 

            // Use hook handlers
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
                 
                // History saving is integrated into setPages now
                // saveToHistory(activePageData); // REMOVE this standalone call

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
                        ...currentPage, // Keep id, title, mode, view state etc.
                        places: updatedPlaces,
                        transitions: updatedTransitions,
                        arcs: updatedArcs,
                        selectedElements: [], // Clear selection
                        history: nextHistory  // Set updated history
                    };

                    return {
                        ...prevPages,
                        [activePageId!]: updatedPageData
                    };
                });
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
        activePageData, // For reading selectedElements inside handleDeleteLocal & conditions
        pages, // For setPages call in handleDeleteLocal & clearActivePageSelection
        // handleCopy, handlePaste, handleUndo, saveToHistory will be added back once adapted
        setSelectedTool,
        // Removed clearActivePageSelection from deps as it's defined in App scope and doesn't change
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

    // ===== ARC MANAGEMENT =====
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
                            id: currentPage.id,
                            title: currentPage.title,
                            places: currentPage.places, // Places don't change
                            transitions: updatedTransitions,
                            arcs: updatedArcs,
                            deterministicMode: currentPage.deterministicMode,
                            conflictResolutionMode: currentPage.conflictResolutionMode,
                            conflictingTransitions: currentPage.conflictingTransitions,
                            selectedElements: [], // Clear selection
                            history: nextHistory, // Set updated history
                            zoomLevel: currentPage.zoomLevel,
                            panOffset: currentPage.panOffset
                        }
                    };
                });
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
                            id: currentPage.id,
                            title: currentPage.title,
                            places: currentPage.places,
                            transitions: updatedTransitions,
                            arcs: updatedArcs,
                            deterministicMode: currentPage.deterministicMode,
                            conflictResolutionMode: currentPage.conflictResolutionMode,
                            conflictingTransitions: currentPage.conflictingTransitions,
                            selectedElements: [],
                            history: nextHistory,
                            zoomLevel: currentPage.zoomLevel,
                            panOffset: currentPage.panOffset
                        }
                    };
                 });
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
        if (!activePageId) return; // Only need activePageId now

        if (selectedTool === 'PLACE') {
            const newPlace: UIPlace = {
                name: '',
                id: `place_${Date.now()}_${activePageId}`,
                tokens: 0, x, y, radius: 46, bounded: false, capacity: null
            };
            setPages(prevPages => {
                const currentPage = prevPages[activePageId!];
                if (!currentPage) return prevPages;
                // --- Integrate History Update ---
                const currentHistory = currentPage.history || { places: [], transitions: [], arcs: [], title: [] };
                const currentPlacesState = JSON.parse(JSON.stringify(currentPage.places));
                const currentTransitionsState = JSON.parse(JSON.stringify(currentPage.transitions));
                const currentArcsState = JSON.parse(JSON.stringify(currentPage.arcs));
                const currentTitleState = currentPage.title;
                const nextPlacesHistory = [...currentHistory.places, currentPlacesState].slice(-MAX_HISTORY_LENGTH);
                const nextTransitionsHistory = [...currentHistory.transitions, currentTransitionsState].slice(-MAX_HISTORY_LENGTH);
                const nextArcsHistory = [...currentHistory.arcs, currentArcsState].slice(-MAX_HISTORY_LENGTH);
                const nextTitleHistory = [...currentHistory.title, currentTitleState].slice(-MAX_HISTORY_LENGTH);
                // --- End History Update ---
                return {
                    ...prevPages,
                    [activePageId!]: {
                        ...currentPage,
                        places: [...currentPage.places, newPlace], // Apply change
                        history: { // Save new history
                            places: nextPlacesHistory,
                            transitions: nextTransitionsHistory,
                            arcs: nextArcsHistory,
                            title: nextTitleHistory
                        } 
                    }
                };
            });
            setSelectedTool('NONE');

        } else if (selectedTool === 'TRANSITION') {
            const newTransition: UITransition = {
                name: '', id: `trans_${Date.now()}_${activePageId}`,
                enabled: false, arcIds: [], x, y, width: 120, height: 54
            };
             setPages(prevPages => {
                const currentPage = prevPages[activePageId!];
                if (!currentPage) return prevPages;
                // --- Integrate History Update --- 
                const currentHistory = currentPage.history || { places: [], transitions: [], arcs: [], title: [] };
                const currentPlacesState = JSON.parse(JSON.stringify(currentPage.places)); 
                const currentTransitionsState = JSON.parse(JSON.stringify(currentPage.transitions));
                const currentArcsState = JSON.parse(JSON.stringify(currentPage.arcs));
                const currentTitleState = currentPage.title;
                const nextPlacesHistory = [...currentHistory.places, currentPlacesState].slice(-MAX_HISTORY_LENGTH);
                const nextTransitionsHistory = [...currentHistory.transitions, currentTransitionsState].slice(-MAX_HISTORY_LENGTH);
                const nextArcsHistory = [...currentHistory.arcs, currentArcsState].slice(-MAX_HISTORY_LENGTH);
                const nextTitleHistory = [...currentHistory.title, currentTitleState].slice(-MAX_HISTORY_LENGTH);
                // --- End History Update --- 
                return {
                    ...prevPages,
                    [activePageId!]: {
                        ...currentPage,
                        transitions: [...currentPage.transitions, newTransition], // Apply change
                        history: { // Save new history
                            places: nextPlacesHistory,
                            transitions: nextTransitionsHistory,
                            arcs: nextArcsHistory,
                            title: nextTitleHistory
                        } 
                    }
                };
            });
            setSelectedTool('NONE');

        } else if (selectedTool === 'ARC') {
             // handleArcCreation needs to be updated with integrated history saving
            handleArcCreation(x, y);
            setSelectedTool('NONE');
        }
    // Dependencies updated - no longer needs activePageData directly, no longer needs saveToHistory
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

    // ===== HELPER FUNCTIONS =====
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

    // ===== SIMULATION CONTROLS =====
    const handleSimulate = async () => {
        if (!activePageId || !activePageData) {
            console.log("No active page to simulate.");
            return;
        }
        
        setCurrentFiredTransitions([]); 
        // setCurrentAnimatingTransitions({}); // This was correctly commented out as per plan
        
        // Small delay to ensure the animation class is removed before adding it again
        await new Promise(resolve => setTimeout(resolve, 10));
        
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
            // Construct the URL correctly for the paged endpoint
            // Assuming API_ENDPOINTS.PROCESS is just "/api"
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

            // Update the active page's state using setPages
            setPages(prevPages => {
                const pageToUpdate = prevPages[activePageId!]; // activePageId is confirmed not null
                if (!pageToUpdate) return prevPages; // Should not happen

                // Map response DTO places to UIPlace, preserving existing UI properties not in DTO if necessary
                const updatedPagePlaces = pageToUpdate.places.map(p_ui => {
                    const updatedPlaceData = responseData.places.find(rp => rp.id === p_ui.id);
                    return updatedPlaceData ? { 
                        ...p_ui, // Preserve existing UI properties like x,y,radius,name etc.
                        tokens: updatedPlaceData.tokens // Only update tokens from DTO
                        // If DTO could also update name/x/y, merge them here too.
                    } : p_ui;
            });

            let newConflictResolutionMode = false;
            let newConflictingTransitions: string[] = [];
            const responseEnabledTransitions = responseData.transitions?.filter(t => t.enabled).map(t => t.id) || [];

            if (pageToUpdate.deterministicMode && responseEnabledTransitions.length > 1) {
                newConflictResolutionMode = true;
                newConflictingTransitions = responseEnabledTransitions;
            }

            // Map response DTO transitions to UITransition
            const updatedPageTransitions = pageToUpdate.transitions.map(t_ui => {
                const updatedTransitionData = responseData.transitions?.find(rt => rt.id === t_ui.id);
                return updatedTransitionData ? { 
                    ...t_ui, // Preserve existing UI properties
                    enabled: updatedTransitionData.enabled // Update enabled status from DTO
                } : { ...t_ui, enabled: false }; // Default to not enabled if not in response
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
                    // arcs are not changed by the /process endpoint directly, only places and transitions
                }
            };
        });

    } catch (error) {
        console.error('Simulation error:', error);
        // TODO: Optionally set an error state here to display to the user
    }
};

    const handleReset = async () => {
        if (!activePageId || !pages[activePageId]) {
            console.log("No active page to reset.");
            return;
        }
        handleUndo(); // Call before resetting page
        const pageToReset = pages[activePageId];
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
    };

    const updatePlaceSize = (id: string, newRadius: number, resizeState: 'start' | 'resizing' | 'end') => {
        if (!activePageId || !pages[activePageId]) return;
        
        // Save history only at the start of the resize
        if (resizeState === 'start') {
            saveToHistory(pages[activePageId]);
        }

        // Update the size in the main state
        setPages(prevPages => {
            const currentPage = prevPages[activePageId!];
            if (!currentPage) return prevPages;
            
            const updatedPlaces = currentPage.places.map(p => 
                p.id === id ? { ...p, radius: newRadius } : p
            );

            // Optimization: Check if change actually occurred
            if (JSON.stringify(currentPage.places) === JSON.stringify(updatedPlaces)) return prevPages;
            
            return {
                ...prevPages,
                [activePageId!]: { 
                    ...currentPage, 
                    places: updatedPlaces, // Apply size change
                    // DO NOT update history here
                }
            };
        });
    };

    const updateTransitionSize = (id: string, newWidth: number, newHeight: number, resizeState: 'start' | 'resizing' | 'end') => {
        if (!activePageId || !pages[activePageId]) return;

        // Save history only at the start of the resize
        if (resizeState === 'start') {
            saveToHistory(pages[activePageId]);
        }

        // Update the size in the main state
        setPages(prevPages => {
            const currentPage = prevPages[activePageId!];
            if (!currentPage) return prevPages;

            const updatedTransitions = currentPage.transitions.map(t => 
                 t.id === id ? { ...t, width: newWidth, height: newHeight } : t
            );

             // Optimization: Check if change actually occurred
             if (JSON.stringify(currentPage.transitions) === JSON.stringify(updatedTransitions)) return prevPages;
             
            return {
                ...prevPages,
                [activePageId!]: { 
                    ...currentPage, 
                    transitions: updatedTransitions, // Apply size change
                    // DO NOT update history here
                }
            };
        });
    };

    const updateElementPosition = (id: string, newX: number, newY: number, dragState: 'start' | 'dragging' | 'end' = 'end') => {
        if (!activePageId || !activePageData) return;
        
        // --- Drag Start Logic ---
        if (dragState === 'start') {
            // Call standalone saveToHistory here
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

                 // Optimization: Use stringify for a quick check, though not perfectly performant
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
    };

    // ===== MENU HANDLERS =====
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
            panOffset: pageToLoad.panOffset ?? { x: -750, y: -421.875 } 
        };
        
        setPages(prevPages => ({
            ...prevPages,
            [newPageId]: newPageData
        })); 
        // Only add to pageOrder and set active if it's a truly new page (not part of project load)
        // This logic will be refined when handleOpenProject calls this.
        if (!Object.keys(pages).includes(newPageId)) {
             setPageOrder(prevOrder => [...prevOrder, newPageId]); 
        }
        setActivePageId(newPageId);
        setCurrentFiredTransitions([]);
    };

    // This function is kept for the legacy import in MenuBar for now.
    // It can be removed if the new import/open project fully replaces it.
    const handleLegacyImport = (importedData: PetriNetDTO) => {
        // Create a structure that processLoadedData can understand
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
            arcs: importedData.arcs.map(a => ({ // Ensure arc has all required UIArc fields
                id: a.id, // UIArc requires id
                type: a.type ?? 'REGULAR', // UIArc requires type
                incomingId: a.incomingId, // UIArc requires incomingId
                outgoingId: a.outgoingId // UIArc requires outgoingId
            })),
            deterministicMode: importedData.deterministicMode,
            // zoomLevel and panOffset might not be in PetriNetDTO, so they'll get defaults in processLoadedData
        };
        processLoadedData(partialPageData, "Imported Page");
    };

    const handleOpenProject = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const projectData = await readJSONFile(file) as ProjectDTO;
            // Basic validation (can be expanded)
            if (!projectData || !projectData.pages || !projectData.pageOrder || typeof projectData.projectTitle !== 'string') {
                alert('Invalid project file format.');
                return;
            }

            // Clear existing project state
            setProjectTitle(projectData.projectTitle);
            setPages(projectData.pages); // Directly set the pages from the project
            setPageOrder(projectData.pageOrder);
            setActivePageId(projectData.activePageId || (projectData.pageOrder.length > 0 ? projectData.pageOrder[0] : null));
            setCurrentFiredTransitions([]);
            clearClipboard(); // Clear clipboard for the new project

            // Reset file input value to allow re-opening the same file if needed
            event.target.value = '';
        } catch (error) {
            console.error("Error opening project:", error);
            alert("Failed to open project file. Ensure it is a valid .pats.json file.");
        }
    };

    const handleImportPages = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;

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
            } catch (error) {
                console.error(`Error importing page ${file.name}:`, error);
                alert(`Failed to import page ${file.name}.`);
            }
        }
        // Reset file input value
        event.target.value = '';
    };

    const continueSimulation = async (selectedTransitionId: string) => {
        if (!activePageId || !activePageData) {
            console.log("No active page for conflict resolution.");
            return;
        }

        setCurrentFiredTransitions([]); 
        await new Promise(resolve => setTimeout(resolve, 10));
        
        // OPTIONAL: Visually mark only the selected transition as "enabled" immediately 
        //           before sending the request, for better UX.
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
            // Assuming API_ENDPOINTS.RESOLVE = "/api/process"
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
            
            // Update page state based on response
            setPages(prevPages => {
                const pageToUpdate = prevPages[activePageId!];
                if (!pageToUpdate) return prevPages;

                const updatedPagePlaces = pageToUpdate.places.map(p_ui => {
                    const updatedPlaceData = responseData.places.find(rp => rp.id === p_ui.id);
                    return updatedPlaceData ? { ...p_ui, tokens: updatedPlaceData.tokens } : p_ui;
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
                } 
                
                // Clear transient animation state after processing response
                setCurrentFiredTransitions([]);

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

        } catch (error) {
            console.error('Error resolving conflict:', error);
            // Revert UI state and exit conflict mode on unexpected error
            if (activePageId && pages[activePageId]) { // Check existence before accessing
                 setPages(prev => ({ ...prev, [activePageId!]: { ...prev[activePageId!], transitions: pages[activePageId!].transitions, conflictResolutionMode: false } }));
            }
            setCurrentFiredTransitions([]);
        }
    };

    // ===== VALIDATION HANDLERS =====
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
    };

    // ===== PAGE HANDLERS =====
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
            panOffset: { x: -750, y: -421.875 } // Set default centered pan
        };
        setPages(prevPages => ({
            ...prevPages,
            [newPageId]: newPage
        }));
        setPageOrder(prevOrder => [...prevOrder, newPageId]);
        setActivePageId(newPageId); 
    };

    const handleRenamePage = (pageId: string, newTitle: string) => {
        if (!pageId || !newTitle.trim() || !pages[pageId]) return; // Basic validation

        setPages(prevPages => ({
            ...prevPages,
            [pageId]: {
                ...prevPages[pageId],
                title: newTitle.trim() // Update the title for the specific page
            }
        }));
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
    };

    // Handler for reordering pages
    const handleReorderPages = (newPageOrder: string[]) => {
        setPageOrder(newPageOrder);
    };

    // ===== ZOOM/PAN HANDLER =====
    const handleViewChange = (view: { zoomLevel: number, panOffset: {x: number, y: number} }) => {
        if (!activePageId || !pages[activePageId]) return; // Check activePageId before saving/setting
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
    };

    // ===== FILE UTILITY FUNCTIONS =====
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

    // ===== PROJECT/PAGE SAVE AND LOAD HANDLERS =====
    const handleSaveProjectAs = (suggestedFilename?: string) => {
        const filename = suggestedFilename || projectTitle.replace(/[^a-z0-9_\-\s]/gi, '_').replace(/\s+/g, '-') + '.petri' || 'project.petri';
        const projectData: ProjectDTO = {
            projectTitle,
            pages,
            pageOrder,
            activePageId,
            version: '1.0.0' // Example version
        };
        downloadJSON(projectData, filename);
    };

    const handleSaveProject = () => {
        // For now, Save behaves like Save As. 
        // True "Save" to an existing file path is complex for web apps.
        handleSaveProjectAs(); 
    };

    const handleExportActivePage = (suggestedFilename?: string) => {
        if (!activePageData) {
            alert("No active page to export.");
            return;
        }
        const filename = suggestedFilename || activePageData.title.replace(/[^a-z0-9_\-\s]/gi, '_').replace(/\s+/g, '-') + '.page.json' || 'page.page.json';
        downloadJSON(activePageData, filename); // Exporting the full PetriNetPageData
    };

    // ===== RENDER =====
    return (
        <div className="app" style={{ 
            display: 'flex',
            flexDirection: 'column',
            height: '100vh',
            overflow: 'hidden'
        }}>
            <EditableTitle 
                ref={titleRef}
                title={projectTitle} 
                onTitleChange={setProjectTitle}
            />
            
            <MenuBar
                projectData={currentProjectDTO}
                onImport={handleLegacyImport}
                highlightTitle={handleHighlightTitle}
                onOpenProject={handleOpenProject}
                onSaveProject={handleSaveProject}
                onSaveProjectAs={handleSaveProjectAs}
                onImportPages={handleImportPages}
                onExportActivePage={handleExportActivePage}
                onExportProject={handleSaveProjectAs}
            />

            <div style={{ 
                display: 'flex', 
                flexGrow: 1,
                height: 'calc(100vh - 80px)',
                overflow: 'hidden'
            }}>
                <div style={{ 
                    width: '200px', 
                    borderRight: '1px solid #4a4a4a',
                    padding: '10px',
                    flexShrink: 0, 
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden'
                }}>
                    <div style={{ flex: 'none', overflow: 'hidden' }}>
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

                    <div className="controls" style={{ 
                        marginTop: '2rem', 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '10px',
                        padding: '10px',
                        borderTop: '1px solid #4a4a4a',
                        overflow: 'hidden'
                    }}>
                        <div 
                            style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                marginBottom: '10px',
                                padding: '5px',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                transition: 'background-color 0.2s ease'
                            }}
                            onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#2a2a2a'; }}
                            onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                            onClick={() => {
                                handleSetDeterministicMode(!(activePageData?.deterministicMode ?? false));
                            }}
                            title="When enabled, you can choose which transition to fire when multiple are enabled"
                        >
                            <input
                                type="checkbox"
                                id="deterministic-mode"
                                checked={activePageData?.deterministicMode ?? false}
                                onChange={(e) => { e.stopPropagation(); handleSetDeterministicMode(e.target.checked); }}
                                style={{ marginRight: '5px', cursor: 'pointer' }}
                            />
                            <label 
                                htmlFor="deterministic-mode" 
                                style={{ cursor: 'pointer' }}
                                onClick={(e) => { e.preventDefault(); }}
                            >
                                Deterministic Mode
                            </label>
                        </div>
                        
                        <button 
                            onClick={handleSimulate} 
                            className="simulate-button"
                            style={{ 
                                padding: '8px 12px', backgroundColor: '#2c5282', color: 'white',
                                border: 'none', borderRadius: '4px', cursor: 'pointer',
                                transition: 'background-color 0.2s ease'
                            }}
                            onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#3a69a4'; }}
                            onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#2c5282'; }}
                            title="Advance the Petri net to the next state"
                        >
                            Next State
                        </button>
                        
                        {activePageData?.conflictResolutionMode && (
                            <div style={{ marginTop: '10px', color: '#ff4d4d' }}>
                                Select one transition to fire
                            </div>
                        )}
                    </div>
                    
                    <div style={{ flex: '1' }}></div>
                    
                    <div style={{ 
                        marginTop: '10px', 
                        borderTop: '1px solid #4a4a4a',
                        paddingTop: '10px'
                    }}>
                        <button 
                            onClick={handleReset} 
                            className="reset-button"
                            style={{ 
                                width: '100%', padding: '8px 12px', backgroundColor: '#822c2c',
                                color: 'white', border: 'none', borderRadius: '4px', 
                                cursor: 'pointer', transition: 'background-color 0.2s ease', fontWeight: 'bold'
                            }}
                            onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#a43a3a'; }}
                            onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#822c2c'; }}
                            title="Clear all elements from the canvas"
                        >
                            Reset Canvas
                        </button>
                    </div>
                </div>

                {/* Center area (Restored from user input, with Canvas added) */}
                <div style={{ 
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden'
                }}>
                    {/* Canvas container */}
                    <div style={{ 
                        flex: 1,
                        overflow: 'hidden',
                        minHeight: 0,
                        position: 'relative' // Added for positioning context if needed
                    }}>
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
                        />
                    </div>
                    
                    {/* Replace Placeholder with PagesComponent */}
                    <PagesComponent 
                        pages={pages}
                        pageOrder={pageOrder}
                        activePageId={activePageId}
                        onSelectPage={setActivePageId}
                        onCreatePage={handleCreatePage}
                        onRenamePage={handleRenamePage}
                        onDeletePage={handleDeletePage}
                        onReorderPages={handleReorderPages}
                    />
                </div>

                {/* Right Panel for TabbedPanel */}
                <div style={{ 
                     width: '390px', // Width from previous layout assumption
                     borderLeft: '1px solid #4a4a4a',
                     overflow: 'auto',
                     flexShrink: 0,
                     height: '100%'
                }}>
                    {/* Conditionally render TabbedPanel */}
                    {petriNetDTO && (
                    <TabbedPanel 
                            data={petriNetDTO} 
                        onValidationResult={handleValidationResult}
                            selectedElements={activePageData?.selectedElements || []}
                        autoScrollEnabled={autoScrollEnabled}
                        onAutoScrollToggle={setAutoScrollEnabled}
                        currentMode={currentMode}
                        width="100%" 
                        height="100%"
                        activePageId={activePageId} // Pass activePageId
                    />
                    )}
                    {/* Optional placeholder when no page is active */}
                    {!petriNetDTO && (
                        <div style={{ padding: '20px', color: '#888', textAlign: 'center' }}>
                            No active Petri net selected.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
