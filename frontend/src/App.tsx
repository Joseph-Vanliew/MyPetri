// src/App.tsx
import React, {useState, useCallback, useEffect, useRef} from 'react';
import { Canvas } from './components/Canvas';
import { Toolbar } from './components/Toolbar';
import {PetriNetDTO, UIPlace, UITransition, UIArc, GRID_CELL_SIZE, ValidationResult} from './types';
import { MenuBar } from './components/MenuBar';
import { EditableTitle, EditableTitleRef } from './components/Title.tsx';
import { API_ENDPOINTS } from './utils/api';
import { TabbedPanel } from './components/TabbedPanel';
import { useClipboard } from './hooks/useClipboard';

export default function App() {
    // ===== STATE MANAGEMENT =====
    const [places, setPlaces] = useState<UIPlace[]>([]);
    const [transitions, setTransitions] = useState<UITransition[]>([]);
    const [arcs, setArcs] = useState<UIArc[]>([]);
    const [selectedTool, setSelectedTool] = useState<'NONE' |'PLACE' | 'TRANSITION' | 'ARC'>('NONE');
    const [selectedElements, setSelectedElements] = useState<string[]>([]);
    const [arcType, setArcType] = useState<UIArc['type']>('REGULAR');
    const [isTyping, setIsTyping] = useState(false);
    const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
    const [currentMode, setCurrentMode] = useState('select');
    const [deterministicMode, setDeterministicMode] = useState(false);
    const [conflictResolutionMode, setConflictResolutionMode] = useState(false);
    const [conflictingTransitions, setConflictingTransitions] = useState<string[]>([]);
    const [title, setTitle] = useState<string>("Untitled Petri Net");
    const [firedTransitions, setFiredTransitions] = useState<string[]>([]);
    const [animatingTransitions, setAnimatingTransitions] = useState<Record<string, boolean>>({});
    const [showCapacityEditorMode, setShowCapacityEditorMode] = useState(false);
    
    const dragStartPositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
    
    const titleRef = useRef<EditableTitleRef>(null);
    
    const handleHighlightTitle = () => {
        if (titleRef.current) {
            titleRef.current.startEditing();
        }
    };
    
    // Add history state for undo functionality
    const [history, setHistory] = useState<{
        places: UIPlace[][],
        transitions: UITransition[][],
        arcs: UIArc[][]
    }>({
        places: [],
        transitions: [],
        arcs: []
    });
    
    // Function to save current state to history
    const saveToHistory = useCallback(() => {
        setHistory(prev => ({
            places: [...prev.places, JSON.parse(JSON.stringify(places))],
            transitions: [...prev.transitions, JSON.parse(JSON.stringify(transitions))],
            arcs: [...prev.arcs, JSON.parse(JSON.stringify(arcs))]
        }));
    }, [places, transitions, arcs]);
    
    // Function to handle undo
    const handleUndo = useCallback(() => {
        if (history.places.length === 0) return;
        
        // Get the previous state
        const prevPlaces = history.places[history.places.length - 1];
        const prevTransitions = history.transitions[history.transitions.length - 1];
        const prevArcs = history.arcs[history.arcs.length - 1];
        
        // Restore previous state
        setPlaces(prevPlaces);
        setTransitions(prevTransitions);
        setArcs(prevArcs);
        
        // Remove the used history entry
        setHistory(prev => ({
            places: prev.places.slice(0, -1),
            transitions: prev.transitions.slice(0, -1),
            arcs: prev.arcs.slice(0, -1)
        }));
    }, [history]);

    // Instantiate the clipboard hook
    const { handleCopy, handlePaste, clearClipboard } = useClipboard({
        places,
        transitions,
        arcs,
        selectedElements,
        setPlaces,
        setTransitions,
        setArcs,
        setSelectedElements,
        saveToHistory,
    });

    // ===== DERIVED STATE / CONSTANTS =====
    const petriNetDTO: PetriNetDTO = {
        places: places.map((p) => {
            return {
                id: p.id,
                tokens: p.tokens,
                name: p.name,
                x: p.x,
                y: p.y,
                radius: p.radius,
                bounded: p.bounded,
                capacity: p.capacity
            };
        }),
        transitions: transitions.map((t) => ({
            id: t.id,
            enabled: t.enabled,
            arcIds: t.arcIds,
            name: t.name,
            x: t.x,
            y: t.y,
            width: t.width,
            height: t.height
        })),
        arcs: arcs.map((a) => ({
            id: a.id,
            type: a.type,
            incomingId: a.incomingId,
            outgoingId: a.outgoingId,
        })),
    };

    // ===== EVENT HANDLERS =====
    const handleTypingChange = (typing: boolean) => {
        setIsTyping(typing);
    };

    // ===== EFFECTS =====
    useEffect(() => {
        function handleKeyDown(e: KeyboardEvent) {
            if (isTyping) return; // Prevent actions while typing

            //different operating systems have different key combinations for copy, paste, and undo
            const isModifier = e.metaKey || e.ctrlKey; 

            if (isModifier && e.key === 'c') { // Copy
                e.preventDefault();
                handleCopy(); // UseClipboard hook's handleCopy
                return;
            }

            if (isModifier && e.key === 'v') { // Paste
                e.preventDefault();
                handlePaste(); // UseClipboard hook's handlePaste
                return;
            }

            if (isModifier && e.key === 'z') { // Undo
                e.preventDefault();
                handleUndo();
                return;
            }

            if (e.key === 'Escape') {
                setSelectedTool('NONE');
                setSelectedElements([]);
                return;
            }
            
            // Moved handleDelete declaration inside the effect or passed as dependency
            const handleDeleteLocal = () => {
                 if (selectedElements.length === 0) return;
                 
                 saveToHistory(); // Save history before deleting

                 const arcsToDelete = arcs.filter((arc) => 
                     selectedElements.includes(arc.id) || 
                     selectedElements.includes(arc.incomingId) || 
                     selectedElements.includes(arc.outgoingId)
                 ).map((arc) => arc.id);

                 setArcs((prevArcs) => prevArcs.filter((arc) => !arcsToDelete.includes(arc.id)));

                 setTransitions((prevTransitions) =>
                     prevTransitions.map((t) => ({
                         ...t,
                         arcIds: t.arcIds.filter((arcId) => !arcsToDelete.includes(arcId)),
                     }))
                 );

                 setPlaces((prevPlaces) => prevPlaces.filter((p) => !selectedElements.includes(p.id)));
                 setTransitions((prevTransitions) => prevTransitions.filter((t) => !selectedElements.includes(t.id)));

                 setSelectedElements([]);
            };


            if (e.key === 'Delete' || e.key === 'Backspace') {
                if (selectedTool === 'ARC' && selectedElements.length === 1) {
                    setSelectedElements([]);
                    return; 
                }
                // Call the local delete function
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
        selectedElements, 
        arcs,
        places,
        transitions,
        handleCopy,
        handlePaste,
        handleUndo, 
        saveToHistory, 
        setSelectedTool,
        setSelectedElements
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

    // ===== ELEMENT CREATION & SELECTION =====
    const handleCanvasClick = useCallback((x: number, y: number) => {
        if (selectedTool === 'NONE') {
            // Clears the selection if no tool is active.
            setSelectedElements([]);
            return;
        }

        // Save current state 
        saveToHistory();

        if (selectedTool === 'PLACE') {
            const newPlace: UIPlace = {
                name:'',
                id: `place_${Date.now()}`,
                tokens: 0,
                x,
                y,
                radius: 46,
                bounded: false,
                capacity: null
            };
            setPlaces(prev => [...prev, newPlace]);
            setSelectedTool('NONE');
        } else if (selectedTool === 'TRANSITION') {
            const newTransition: UITransition = {
                name: '',
                id: `trans_${Date.now()}`,
                enabled: false,
                arcIds: [],
                x,
                y,
                width: 120,
                height: 54
            };
            setTransitions(prev => [...prev, newTransition]);
            setSelectedTool('NONE');
        } else if (selectedTool === 'ARC') {
            handleArcCreation(x, y);
            setSelectedTool('NONE')
        }

    }, [selectedTool, places, transitions, saveToHistory]);

    const handleSelectElement = (id: string, event?: React.MouseEvent | KeyboardEvent) => {
        // Check if shift key is pressed (from either mouse or keyboard event)
        const isShift = event?.shiftKey;
        
        setSelectedElements(prevSelected => {
            // Determine the next state based on id and isShift
            let nextSelected: string[];
            if (id === '') { // Special case to clear selection (e.g., background click)
                nextSelected = [];
            } else if (isShift) {
                // Shift+Click: Toggle selection
                if (prevSelected.includes(id)) {
                    // Remove if already selected
                    nextSelected = prevSelected.filter(elId => elId !== id);
                } else {
                    // Add if not selected
                    nextSelected = [...prevSelected, id];
                }
            } else {
                // No Shift: Select only this element, unless it's already the *only* selected element
                if (prevSelected.length === 1 && prevSelected[0] === id) {
                    nextSelected = prevSelected; // No change if clicking the already solely selected element
                } else {
                    // Otherwise, select just this one
                    nextSelected = [id];
                }
            }
            return nextSelected; // Return the calculated next state
        });

        // If we just selected exactly one element (not clearing selection, not shift-clicking)
        // then deactivate any active creation tool by setting it back to NONE.
        if (!isShift && id !== '') {
             setSelectedTool('NONE'); 
        }
    };
    
    // Handler for multi-selection (e.g., from drag-select box)
    const handleMultiSelectElement = (ids: string[]) => {
        setSelectedElements(ids);
    };

    // ===== ARC MANAGEMENT =====
    const handleArcPortClick = (clickedId: string) => {
        if (selectedElements.length === 0) {
            setSelectedElements([clickedId]);
        } else {
            const sourceId = selectedElements[0];
            const targetId = clickedId;
            if (isValidArcConnection(sourceId, targetId, arcType, places, transitions)) {
                // Save current state before adding arc
                saveToHistory();
                
                const newArc: UIArc = {
                    id: `arc_${Date.now()}`,
                    type: arcType,
                    incomingId: sourceId,
                    outgoingId: targetId,
                };
                setArcs(prev => [...prev, newArc]);

                // Update transitions using property check
                const sourceElement = places.find(p => p.id === sourceId) || transitions.find(t => t.id === sourceId);
                const targetElement = places.find(p => p.id === targetId) || transitions.find(t => t.id === targetId);

                if (sourceElement && 'width' in sourceElement) { // Check if source is transition
                    setTransitions(prev => prev.map(t =>
                        t.id === sourceId ? { ...t, arcIds: [...t.arcIds, newArc.id] } : t
                    ));
                }
                if (targetElement && 'width' in targetElement) { // Check if target is transition
                    setTransitions(prev => prev.map(t =>
                        t.id === targetId ? { ...t, arcIds: [...t.arcIds, newArc.id] } : t
                    ));
                }
            } else {
                console.warn('Invalid arc connection');
            }
            setSelectedElements([]);
        }
    };

    const handleArcCreation = (x: number, y: number) => {
        const clickedElement = findClickedElement(x, y);

        if (!clickedElement) {
            setSelectedElements([]);
            return;
        }

        // If we haven't yet chosen a source, set this clicked node as source
        if (selectedElements.length === 0) {
            setSelectedElements([clickedElement.id]);
        }
        // Otherwise, we already have a source, so connect to this new target
        else {
            const sourceId = selectedElements[0];
            const targetId = clickedElement.id;

            // Pass places and transitions arrays to validation function
            if (isValidArcConnection(sourceId, targetId, arcType, places, transitions)) {
                // Save current state before adding arc
                saveToHistory();
                
                const newArc: UIArc = {
                    id: `arc_${Date.now()}`,
                    type: arcType,
                    incomingId: sourceId,
                    outgoingId: targetId,
                };

                setArcs(prev => [...prev, newArc]);

                // Update transition arcIds using property check
                const sourceElement = places.find(p => p.id === sourceId) || transitions.find(t => t.id === sourceId);
                const targetElement = places.find(p => p.id === targetId) || transitions.find(t => t.id === targetId);

                if (sourceElement && 'width' in sourceElement) { // Check if source is transition
                    setTransitions(prev => prev.map(t =>
                        t.id === sourceId
                            ? { ...t, arcIds: [...t.arcIds, newArc.id] }
                            : t
                    ));
                }
                if (targetElement && 'width' in targetElement) { // Check if target is transition
                    setTransitions(prev => prev.map(t =>
                        t.id === targetId
                            ? { ...t, arcIds: [...t.arcIds, newArc.id] }
                            : t
                    ));
                }
            } else {
                console.warn(`Invalid arc from ${sourceId} to ${targetId} (${arcType}).`);
            }

            // Reset after trying to create the arc
            setSelectedElements([]);
        }
    };

    // ===== HELPER FUNCTIONS =====
    const findClickedElement = (x: number, y: number) => {
        // Snap to grid first
        const gridX = Math.round(x / GRID_CELL_SIZE) * GRID_CELL_SIZE;
        const gridY = Math.round(y / GRID_CELL_SIZE) * GRID_CELL_SIZE;

        // Check places (use grid-aligned positions)
        const place = places.find(p =>
            p.x === gridX && p.y === gridY
        );
        if (place) return place;

        // Check transitions
        const transition = transitions.find(t =>
            t.x === gridX && t.y === gridY
        );
        if (transition) return transition;

        return null;
    };

    // Modify function signature to accept element arrays
    function isValidArcConnection(
        sourceId: string,
        targetId: string,
        arcType: UIArc['type'],
        allPlaces: UIPlace[],
        allTransitions: UITransition[]
    ): boolean {
        // Disallow self-loop (same node for source & target)
        if (sourceId === targetId) {
            return false;
        }

        // Find the actual elements
        const sourceElement = allPlaces.find(p => p.id === sourceId) || allTransitions.find(t => t.id === sourceId);
        const targetElement = allPlaces.find(p => p.id === targetId) || allTransitions.find(t => t.id === targetId);

        // Check if elements were found
        if (!sourceElement || !targetElement) {
            console.error("Could not find source or target element for arc validation.");
            return false; 
        }

        // Determine types based on properties
        const isSourcePlace = 'radius' in sourceElement;
        const isSourceTrans = 'width' in sourceElement;
        const isTargetPlace = 'radius' in targetElement;
        const isTargetTrans = 'width' in targetElement;

        // Inhibitor arcs must ONLY go from a Place to a Transition
        if (arcType === 'INHIBITOR') {
            return isSourcePlace && isTargetTrans;
        }
        // REGULAR or BIDIRECTIONAL arcs can be:
        // (Place -> Transition) OR (Transition -> Place)
        else {
            return (
                (isSourcePlace && isTargetTrans) ||
                (isSourceTrans && isTargetPlace)
            );
        }
    }

    // ===== SIMULATION CONTROLS =====
    const handleSimulate = async () => {
        console.log("Current deterministic mode state:", deterministicMode);
        
        // First, clear any existing animation by setting firedTransitions to empty
        setFiredTransitions([]);
        
        // Small delay to ensure the animation class is removed before adding it again
        await new Promise(resolve => setTimeout(resolve, 10));
        
        const requestBody: PetriNetDTO = {
            places: places.map(p => ({ 
                id: p.id, 
                tokens: p.tokens,
                name: p.name,
                x: p.x,
                y: p.y,
                radius: p.radius,
                bounded: p.bounded,
                capacity: p.capacity
            })),
            transitions: transitions.map(t => ({
                id: t.id,
                enabled: t.enabled,
                arcIds: t.arcIds,
                name: t.name,
                x: t.x,
                y: t.y,
                width: t.width,
                height: t.height
            })),
            arcs: arcs.map(a => ({
                id: a.id,
                type: a.type,
                incomingId: a.incomingId,
                outgoingId: a.outgoingId,
            })),
            deterministicMode: deterministicMode
        };

        try {
            const response = await fetch(API_ENDPOINTS.PROCESS, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });

            const responseData: PetriNetDTO = await response.json();

            // Update places state
            const newPlaces = places.map(p => {
                const updated = responseData.places.find(rp => rp.id === p.id);
                return updated ? { ...p, tokens: updated.tokens } : p;
            });
            setPlaces([...newPlaces]); 

            // Get the list of enabled transitions from the response
            const enabledTransitions = responseData.transitions
                .filter(t => t.enabled)
                .map(t => t.id);
                
            // In deterministic mode, handle potentially multiple enabled transitions
            if (deterministicMode && enabledTransitions.length > 1) {
                console.log("Entering conflict resolution mode with transitions:", enabledTransitions);
                
                // Multiple enabled transitions - enter conflict resolution mode
                setConflictingTransitions(enabledTransitions);
                setConflictResolutionMode(true);
                
                // Update transitions state without animation
                const newTransitions = transitions.map(t => {
                    const updated = responseData.transitions.find(rt => rt.id === t.id);
                    return updated ? { ...t, enabled: updated.enabled } : t;
                });
                setTransitions([...newTransitions]);
                
                return; // Wait for user selection - don't animate
            }
            
            // Non-deterministic mode or only one enabled transition
            
            // Update transitions based on response
            const newTransitions = transitions.map(t => {
                const updated = responseData.transitions.find(rt => rt.id === t.id);
                return updated ? { ...t, enabled: updated.enabled } : t;
            });
            setTransitions([...newTransitions]);
            
            // Get the list of enabled transitions IDs from the *updated state*
            const enabledTransitionsUpdated = newTransitions // Use the updated array
                .filter(t => t.enabled)
                .map(t => t.id);

            // Check for deterministic conflict
            if (deterministicMode && enabledTransitionsUpdated.length > 1) {
                console.log("Entering conflict resolution mode with transitions:", enabledTransitionsUpdated);
                
                // Multiple enabled transitions - enter conflict resolution mode
                setConflictingTransitions(enabledTransitionsUpdated);
                setConflictResolutionMode(true);
                
                // Update transitions state without animation
                const newTransitionsConflict = transitions.map(t => {
                    const updated = responseData.transitions.find(rt => rt.id === t.id);
                    return updated ? { ...t, enabled: updated.enabled } : t;
                });
                setTransitions([...newTransitionsConflict]);
                
                return; // Wait for user selection - don't animate
            }
            
            // Check if any animation should happen
            if (enabledTransitionsUpdated.length > 0) {
                const newAnimatingTransitions = { ...animatingTransitions };
                enabledTransitionsUpdated.forEach(id => {
                    newAnimatingTransitions[id] = true;
                });
                setAnimatingTransitions(newAnimatingTransitions);
                setFiredTransitions(prevFired => [...prevFired, ...enabledTransitionsUpdated]);
            } else {
                console.log("No enabled transitions found.");
            }
            
            // Exit conflict resolution mode
            setConflictResolutionMode(false);
            setConflictingTransitions([]);

        } catch (error) {
            console.error('Simulation error:', error);
        }
    };

    const handleReset = async () => {
        saveToHistory();
        setPlaces([]);
        setTransitions([]);
        setArcs([]);
        setSelectedElements([]);
        clearClipboard(); // Clear clipboard on reset
        setConflictResolutionMode(false);
        setConflictingTransitions([]);
        setFiredTransitions([]);
        setAnimatingTransitions({});
        setHistory({ places: [], transitions: [], arcs: [] }); // Clear history for the new net
    };

    const updatePlaceSize = (id: string, newRadius: number) => {
        // Save current state before updating size
        saveToHistory();
        
        setPlaces((prevPlaces) =>
            prevPlaces.map((p) => (p.id === id ? { ...p, radius: newRadius } : p))
        );
    };

    const updateTransitionSize = (id: string, newWidth: number, newHeight: number) => {
        // Save current state before updating size
        saveToHistory();
        
        setTransitions((prevTransitions) =>
            prevTransitions.map((t) => {
                if (t.id === id) {
                    const updated = { ...t, width: newWidth, height: newHeight };
                    return updated;
                }
                return t;
            })
        );
    };

    const updateElementPosition = (id: string, newX: number, newY: number, dragState: 'start' | 'dragging' | 'end' = 'end') => {
        
        const isMultiSelect = selectedElements.length > 1 && selectedElements.includes(id);
        let deltaX = 0;
        let deltaY = 0;

        if (dragState === 'start') {
            // Save current state to history
            saveToHistory();
            // Store starting positions for all selected elements
            dragStartPositionsRef.current.clear();
            const allElements = [...places, ...transitions];
            selectedElements.forEach(selectedId => {
                const element = allElements.find(el => el.id === selectedId);
                if (element) {
                    dragStartPositionsRef.current.set(selectedId, { x: element.x, y: element.y });
                }
            });
            // For single element drag, store its start position too
            if (!isMultiSelect) {
                 const element = [...places, ...transitions].find(el => el.id === id);
                 if (element) {
                     dragStartPositionsRef.current.set(id, { x: element.x, y: element.y });
                 }
            }
        }

        // Calculate delta based on the initially dragged element
        const startPos = dragStartPositionsRef.current.get(id);
        if (startPos) {
             deltaX = newX - startPos.x;
             deltaY = newY - startPos.y;
        } else {
             // Fallback if startPos wasn't captured (shouldn't happen ideally)
             // Calculate delta based on current position vs new position (less accurate for multi-drag)
             const currentElement = [...places, ...transitions].find(el => el.id === id);
             if (currentElement) {
                 deltaX = newX - currentElement.x;
                 deltaY = newY - currentElement.y;
             }
        }
        
        // Apply updates
        setPlaces((prevPlaces) =>
            prevPlaces.map((p) => {
                const start = dragStartPositionsRef.current.get(p.id);
                if (isMultiSelect && selectedElements.includes(p.id) && start) {
                    return { ...p, x: start.x + deltaX, y: start.y + deltaY };
                } else if (p.id === id && start) { // Handle single element drag
                     return { ...p, x: start.x + deltaX, y: start.y + deltaY };
                }
                return p;
            })
        );

        setTransitions((prevTransitions) =>
            prevTransitions.map((t) => {
                const start = dragStartPositionsRef.current.get(t.id);
                if (isMultiSelect && selectedElements.includes(t.id) && start) {
                    return { ...t, x: start.x + deltaX, y: start.y + deltaY };
                } else if (t.id === id && start) { // Handle single element drag
                    return { ...t, x: start.x + deltaX, y: start.y + deltaY };
                }
                return t;
            })
        );

        // Clear start positions reference when drag ends
        if (dragState === 'end') {
            dragStartPositionsRef.current.clear();
        }
    };

    const handleTokenUpdate = (id: string, newTokens: number) => {
        // Save current state before updating tokens
        saveToHistory();
        
        setPlaces(prevPlaces =>
            prevPlaces.map(place =>
                place.id === id ? { ...place, tokens: newTokens } : place
            )
        );
    };

    const handleNameUpdate = (id: string, newName: string) => {
        // Save current state before updating names
        saveToHistory();
        
        // Update place names
        setPlaces(prevPlaces =>
            prevPlaces.map(place =>
                place.id === id ? { ...place, name: newName } : place
            )
        );
        
        // Update transition names
        setTransitions(prevTransitions =>
            prevTransitions.map(transition =>
                transition.id === id ? { ...transition, name: newName } : transition
            )
        );
    };

    // ===== MENU HANDLERS =====
    const processLoadedData = (loadedData: PetriNetDTO, sourceTitle?: string) => {
        saveToHistory();

        // Convert imported places to UIPlace objects
        const loadedPlaces: UIPlace[] = loadedData.places.map(place => ({
            id: place.id,
            name: place.name || '',
            tokens: place.tokens,
            x: place.x ?? 100, // Use nullish coalescing for defaults
            y: place.y ?? 100,
            radius: place.radius ?? 46,
            bounded: place.bounded ?? false,
            capacity: place.capacity ?? null
        }));

        // Convert imported transitions to UITransition objects
        const loadedTransitions: UITransition[] = loadedData.transitions.map(transition => ({
            id: transition.id,
            name: transition.name || '',
            enabled: transition.enabled ?? false, // Default enabled state if missing
            arcIds: transition.arcIds || [], // Default arcIds if missing
            x: transition.x ?? 200,
            y: transition.y ?? 200,
            width: transition.width ?? 120,
            height: transition.height ?? 54
        }));

        // Convert imported arcs to UIArc objects (ensure all fields)
        const loadedArcs: UIArc[] = loadedData.arcs.map(arc => ({
            id: arc.id,
            type: arc.type ?? 'REGULAR', // Default type if missing
            incomingId: arc.incomingId,
            outgoingId: arc.outgoingId,
        }));

        // Set the imported data
        setPlaces(loadedPlaces);
        setTransitions(loadedTransitions);
        setArcs(loadedArcs);
        // Use title from loaded data, fallback to sourceTitle, then default
        setTitle(loadedData.title || sourceTitle || "Untitled Petri Net");

        // Clear selection and simulation/history related to the previous state
        setSelectedElements([]);
        setConflictResolutionMode(false);
        setConflictingTransitions([]);
        setFiredTransitions([]);
        setAnimatingTransitions({});
        clearClipboard(); // Clear clipboard when loading new data
        setHistory({ places: [], transitions: [], arcs: [] }); // Clear history for the new net
    };

    // Handler for importing from pre-defined examples (if any)
    const handleImport = (importedData: PetriNetDTO) => {
        processLoadedData(importedData);
    };

    const continueSimulation = async (selectedTransitionId: string) => {
        // First, clear any existing animation by setting firedTransitions to empty
        setFiredTransitions([]);
        
        // Small delay to ensure the animation class is removed before adding it again
        await new Promise(resolve => setTimeout(resolve, 10));
        
        // Update transitions in state to mark only the selected one as enabled
        const updatedTransitions = transitions.map(t => ({
            ...t,
            enabled: t.id === selectedTransitionId
        }));
        
        // Update the transitions state immediately to show the user's selection
        setTransitions(updatedTransitions);
        
        // Clear any existing animation states
        setAnimatingTransitions({});
        
        // Mark ONLY the selected transition as animating
        setAnimatingTransitions({
            [selectedTransitionId]: true
        });
        
        // Add ONLY the selected transition to the fired transitions list
        setFiredTransitions([selectedTransitionId]);
        
        /* DO NOT exit conflict resolution mode yet - we'll do that only when we confirm
        there are no more conflicts from the backend */
        
        // Create a request body with the updated transitions
        const requestBody = {
            places: places.map(p => ({ 
                id: p.id, 
                tokens: p.tokens,
                name: p.name,
                x: p.x,
                y: p.y,
                radius: p.radius
            })),
            transitions: updatedTransitions.map(t => ({
                id: t.id,
                enabled: t.enabled,
                arcIds: t.arcIds,
                name: t.name,
                x: t.x,
                y: t.y,
                width: t.width,
                height: t.height
            })),
            arcs: arcs.map(a => ({
                id: a.id,
                type: a.type,
                incomingId: a.incomingId,
                outgoingId: a.outgoingId,
            })),
            selectedTransitionId,
            deterministicMode: deterministicMode
        };
        
        try {
            const response = await fetch(API_ENDPOINTS.RESOLVE, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });
            
            const responseData = await response.json() as PetriNetDTO;
            
            // Update places state
            const newPlaces = places.map(p => {
                const updated = responseData.places.find((rp: { id: string; tokens: number }) => rp.id === p.id);
                return updated ? { ...p, tokens: updated.tokens } : p;
            });
            setPlaces([...newPlaces]);
            
            // Update transitions state with the response from the backend
            const newTransitions = transitions.map(t => {
                const updated = responseData.transitions.find((rt: { id: string; enabled: boolean }) => rt.id === t.id);
                return updated ? { ...t, enabled: updated.enabled } : t;
            });
            
            // Get the list of enabled transitions from the response
            const enabledTransitions = responseData.transitions
                .filter((t: { enabled: boolean }) => t.enabled)
                .map((t: { id: string }) => t.id);
                
            // Do NOT add animations for newly enabled transitions in deterministic mode
            // Only exit conflict resolution mode if there are no more conflicts
            if (enabledTransitions.length <= 1 || !deterministicMode) {
                // No more conflicts, exit conflict resolution mode
                setConflictResolutionMode(false);
                setConflictingTransitions([]);
            } else {
                // Still have conflicts, update the conflicting transitions list
                setConflictingTransitions(enabledTransitions);
            }
            
            setTransitions(newTransitions);
        } catch (error) {
            console.error('Error resolving conflict:', error);
            // In case of error, still exit conflict resolution mode to avoid getting stuck
            setConflictResolutionMode(false);
            setConflictingTransitions([]);
        }
    };

    // ===== VALIDATION HANDLERS =====
    const handleValidationResult = (result: ValidationResult) => {
        console.log('Validation result:', result);
    };

    // REVISED: Handler now just takes capacity, infers bounded state
    const handleUpdatePlaceCapacity = (id: string, newCapacity: number | null) => {
        saveToHistory();
        setPlaces(prevPlaces =>
            prevPlaces.map(place => {
                if (place.id === id) {
                    const newBounded = newCapacity !== null; // Determine bounded based on capacity presence
                    let validCapacity = newCapacity;

                    // Ensure capacity is non-negative if provided
                    if (newBounded && (validCapacity === null || validCapacity < 0)) {
                         validCapacity = 0;
                    }

                    // Adjust tokens if current tokens exceed new capacity
                    let newTokens = place.tokens;
                    if (newBounded && validCapacity !== null && newTokens > validCapacity) {
                        newTokens = validCapacity;
                    }

                    return { ...place, bounded: newBounded, capacity: validCapacity, tokens: newTokens };
                }
                return place;
            })
        );
    };

    // ===== RENDER =====
    return (
        <div className="app" style={{ 
            display: 'flex',
            flexDirection: 'column',
            height: '100vh',
            overflow: 'hidden'
        }}>
            {/* Use the EditableTitle component */}
            <EditableTitle 
                ref={titleRef}
                title={title}
                onTitleChange={setTitle}
            />
            
            {/* Menu Bar below the title */}
            <MenuBar
                petriNetData={{
                    ...petriNetDTO,
                    title: title
                }}
                onImport={handleImport}
                highlightTitle={handleHighlightTitle}
            />

            {/* Main content area - Restore the detailed layout */}
            <div style={{ 
                display: 'flex', 
                flexGrow: 1,
                height: 'calc(100vh - 80px)', // Adjust height based on MenuBar/Title height
                overflow: 'hidden'
            }}>
                {/* Left sidebar */}
                <div style={{ 
                    width: '200px', 
                    borderRight: '1px solid #4a4a4a',
                    padding: '10px',
                    flexShrink: 0, 
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden'
                }}>
                    {/* Toolbar section */}
                    <div style={{ flex: 'none', overflow: 'hidden' }}>
                        <Toolbar
                            selectedTool={selectedTool}
                            // Use the logic provided by user to clear selection on ARC tool activation
                            setSelectedTool={(tool) => {
                                if (tool === 'ARC') {
                                    setSelectedElements([]);
                                }
                                setSelectedTool(tool); // Call the actual state setter
                            }}
                            arcType={arcType}
                            setArcType={setArcType}
                            showCapacityEditorMode={showCapacityEditorMode}
                            onToggleCapacityEditorMode={setShowCapacityEditorMode}
                        />
                    </div>

                    {/* Simulation controls (Restored from user input) */}
                    <div className="controls" style={{ 
                        marginTop: '2rem', 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '10px',
                        padding: '10px',
                        borderTop: '1px solid #4a4a4a',
                        overflow: 'hidden'
                    }}>
                        {/* Deterministic Mode checkbox */}
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
                                const newValue = !deterministicMode;
                                if (!newValue && conflictResolutionMode) {
                                    setConflictResolutionMode(false);
                                    setConflictingTransitions([]);
                                    setTransitions(transitions.map(t => ({ ...t, enabled: false })));
                                }
                                setDeterministicMode(newValue);
                            }}
                            title="When enabled, you can choose which transition to fire when multiple are enabled"
                        >
                            <input
                                type="checkbox"
                                id="deterministic-mode"
                                checked={deterministicMode}
                                onChange={(e) => { e.stopPropagation(); }}
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
                        
                        {/* Next State button */}
                        <button 
                            onClick={handleSimulate} 
                            className="simulate-button"
                            style={{ /* styles */ 
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
                        
                        {conflictResolutionMode && (
                            <div style={{ marginTop: '10px', color: '#ff4d4d' }}>
                                Select one transition to fire
                            </div>
                        )}
                    </div>
                    
                    {/* Spacer to push reset button to bottom */}
                    <div style={{ flex: '1' }}></div>
                    
                    {/* Reset button (Restored from user input) */}
                    <div style={{ 
                        marginTop: '10px', 
                        borderTop: '1px solid #4a4a4a',
                        paddingTop: '10px'
                    }}>
                        <button 
                            onClick={handleReset} 
                            className="reset-button"
                            style={{ /* styles */ 
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
                            places={places}
                            transitions={transitions}
                            arcs={arcs}
                            selectedElements={selectedElements}
                            onCanvasClick={handleCanvasClick}
                            onSelectElement={handleSelectElement}
                            onMultiSelectElement={handleMultiSelectElement}
                            onUpdatePlaceSize={updatePlaceSize}
                            onUpdateTransitionSize={updateTransitionSize}
                            onUpdateElementPosition={updateElementPosition}
                            onArcPortClick={handleArcPortClick}
                            selectedTool={selectedTool}
                            onSelectTool={setSelectedTool} // Pass the state setter
                            arcType={arcType}
                            onUpdateToken={handleTokenUpdate}
                            onTypingChange={handleTypingChange}
                            onUpdateName={handleNameUpdate}
                            conflictResolutionMode={conflictResolutionMode}
                            conflictingTransitions={conflictingTransitions}
                            onConflictingTransitionSelect={continueSimulation}
                            firedTransitions={firedTransitions}
                            onUpdatePlaceCapacity={handleUpdatePlaceCapacity}
                            showCapacityEditorMode={showCapacityEditorMode}
                        />
                    </div>
                    
                    {/* Page Navigation Placeholder */}
                    <div style={{ 
                        height: '40px',
                        borderTop: '1px solid #4a4a4a',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#1a1a1a',
                        padding: '0 15px',
                        flexShrink: 0 // Prevent shrinking
                    }}>
                        <div style={{ color: '#777', fontSize: '14px' }}>
                            Page Tabs (Under Construction)
                        </div>
                    </div>
                </div>

                {/* Right Panel for TabbedPanel */}
                <div style={{ 
                     width: '390px', // Width from previous layout assumption
                     borderLeft: '1px solid #4a4a4a',
                     overflow: 'auto',
                     flexShrink: 0,
                     height: '100%'
                }}>
                    <TabbedPanel 
                        data={petriNetDTO}
                        onValidationResult={handleValidationResult}
                        selectedElements={selectedElements}
                        autoScrollEnabled={autoScrollEnabled}
                        onAutoScrollToggle={setAutoScrollEnabled}
                        currentMode={currentMode}
                        // Explicitly set width/height to fill container
                        width="100%" 
                        height="100%"
                    />
                </div>
            </div>
        </div>
    );
}