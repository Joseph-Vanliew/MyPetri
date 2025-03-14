// src/App.tsx
import {useState, useCallback, useEffect, useRef} from 'react';
import { Canvas } from './components/Canvas';
import { Toolbar } from './components/Toolbar';
import {PetriNetDTO, UIPlace, UITransition, UIArc, GRID_CELL_SIZE} from './types';
import {JSONViewer} from "./components/JSONViewer.tsx";
import { MenuBar } from './components/MenuBar';
import { EditableTitle, EditableTitleRef } from './components/EditableTitle';

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
    
    // Reference to the EditableTitle component
    const titleRef = useRef<EditableTitleRef>(null);
    
    // Function to highlight the title for editing
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
        if (history.places.length === 0) return; // Nothing to undo
        
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

    // ===== DERIVED STATE / CONSTANTS =====
    const petriNetDTO: PetriNetDTO = {
        places: places.map((p) => ({ 
            id: p.id, 
            tokens: p.tokens,
            name: p.name,
            x: p.x,
            y: p.y,
            radius: p.radius
        })),
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
            
            if (e.key === 'Escape') {
                setSelectedTool('NONE');
                return;
            }
            
            // Handle undo with CMD+Z (Mac) or CTRL+Z (Windows)
            if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
                e.preventDefault(); // Prevent browser's default undo
                handleUndo();
                return;
            }

            if (e.key === 'Delete' || e.key === 'Backspace') {
                // Save current state before deletion
                saveToHistory();
                handleDelete();
            }
        }

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [selectedElements, places, transitions, arcs, isTyping, handleUndo, saveToHistory]);

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
                radius: 46
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

    const handleSelectElement = (id: string) => {
        setSelectedElements([id]);
    };

    // ===== ARC MANAGEMENT =====
    const handleArcPortClick = (clickedId: string) => {
        if (selectedElements.length === 0) {
            setSelectedElements([clickedId]);
        } else {
            const sourceId = selectedElements[0];
            const targetId = clickedId;
            if (isValidArcConnection(sourceId, targetId, arcType)) {
                // Save current state before adding arc
                saveToHistory();
                
                const newArc: UIArc = {
                    id: `arc_${Date.now()}`,
                    type: arcType,
                    incomingId: sourceId,
                    outgoingId: targetId,
                };
                setArcs(prev => [...prev, newArc]);

                // Update transitions:
                if (sourceId.startsWith('trans')) {
                    setTransitions(prev => prev.map(t =>
                        t.id === sourceId ? { ...t, arcIds: [...t.arcIds, newArc.id] } : t
                    ));
                }
                if (targetId.startsWith('trans')) {
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

            // Use isValidArcConnection with the arcType
            if (isValidArcConnection(sourceId, targetId, arcType)) {
                // Save current state before adding arc
                saveToHistory();
                
                const newArc: UIArc = {
                    id: `arc_${Date.now()}`,
                    type: arcType,
                    incomingId: sourceId,
                    outgoingId: targetId,
                };

                setArcs(prev => [...prev, newArc]);

                // Update transition arcIds if necessary
                if (sourceId.startsWith('trans')) {
                    setTransitions(prev => prev.map(t =>
                        t.id === sourceId
                            ? { ...t, arcIds: [...t.arcIds, newArc.id] }
                            : t
                    ));
                }
                if (targetId.startsWith('trans')) {
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

    function isValidArcConnection(sourceId: string, targetId: string, arcType: UIArc['type']): boolean {
        // Disallow self-loop (same node for source & target)
        if (sourceId === targetId) {
            return false;
        }

        const isSourcePlace = sourceId.startsWith('place');
        const isSourceTrans = sourceId.startsWith('trans');
        const isTargetPlace = targetId.startsWith('place');
        const isTargetTrans = targetId.startsWith('trans');

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
        
        const requestBody: PetriNetDTO = {
            places: places.map(p => ({ id: p.id, tokens: p.tokens })),
            transitions: transitions.map(t => ({
                id: t.id,
                enabled: t.enabled,
                arcIds: t.arcIds
            })),
            arcs: arcs.map(a => ({
                id: a.id,
                type: a.type,
                incomingId: a.incomingId,
                outgoingId: a.outgoingId
            })),
            deterministicMode: deterministicMode
        };

        console.log("Sending PetriNet Request for simulation", requestBody);

        try {
            const response = await fetch('http://localhost:8080/api/process', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });

            const responseData: PetriNetDTO = await response.json();
            console.log("Received new state response:", responseData);

            // In deterministic mode, handle potentially multiple enabled transitions
            if (deterministicMode) {
                const enabledTransitions = responseData.transitions
                    .filter(t => t.enabled)
                    .map(t => t.id);
                
                if (enabledTransitions.length > 1) {
                    // Multiple enabled transitions - enter conflict resolution mode
                    setConflictingTransitions(enabledTransitions);
                    setConflictResolutionMode(true);
                    
                    // Update places state
                    const newPlaces = places.map(p => {
                        const updated = responseData.places.find(rp => rp.id === p.id);
                        return updated ? { ...p, tokens: updated.tokens } : p;
                    });
                    setPlaces([...newPlaces]);
                    
                    // Mark transitions as enabled based on response
                    const newTransitions = transitions.map(t => {
                        const updated = responseData.transitions.find(rt => rt.id === t.id);
                        return updated ? { ...t, enabled: updated.enabled } : t;
                    });
                    setTransitions([...newTransitions]);
                    
                    return; // Wait for user selection
                }
            }
            
            // Normal flow (non-deterministic or deterministic with single enabled transition)
            const newPlaces = places.map(p => {
                const updated = responseData.places.find(rp => rp.id === p.id);
                return updated ? { ...p, tokens: updated.tokens } : p;
            });

            console.log("Updated places state:", newPlaces);
            setPlaces([...newPlaces]); // new reference for rendering token counts

            const newTransitions = transitions.map(t => {
                const updated = responseData.transitions.find(rt => rt.id === t.id);
                return updated ? { ...t, enabled: updated.enabled } : t;
            });

            console.log("Updated transitions state:", newTransitions);
            setTransitions([...newTransitions]); // new reference to update transition enabled boolean

        } catch (error) {
            console.error('Simulation error:', error);
        }
    };

    const handleReset = async () => {
        // Save current state before reset
        saveToHistory();
        
        setPlaces([]);
        setTransitions([]);
        setArcs([]);
        setSelectedElements([]);
    }

    // ===== ELEMENT MANIPULATION =====
    function handleDelete() {
        if (selectedElements.length === 0) return;

        // Find all arcs that need to be deleted:
        // 1. Explicitly selected arcs
        // 2. Arcs connected to selected places or transitions
        const arcsToDelete = arcs.filter((arc) => 
            selectedElements.includes(arc.id) || // Explicitly selected arcs
            selectedElements.includes(arc.incomingId) || // Arcs where selected element is source
            selectedElements.includes(arc.outgoingId) // Arcs where selected element is target
        ).map((arc) => arc.id);

        // removing selected arcs from arcs array
        setArcs((prevArcs) => prevArcs.filter((arc) => !arcsToDelete.includes(arc.id)));

        // updating connected transitions to exclude deleted arc ids
        setTransitions((prevTransitions) =>
            prevTransitions.map((t) => ({
                ...t,
                arcIds: t.arcIds.filter((arcId) => !arcsToDelete.includes(arcId)),
            }))
        );

        // deleting the selected places and transitions
        setPlaces((prevPlaces) => prevPlaces.filter((p) => !selectedElements.includes(p.id)));
        setTransitions((prevTransitions) => prevTransitions.filter((t) => !selectedElements.includes(t.id)));

        // Clear the selection
        setSelectedElements([]);
    }

    const updatePlaceSize = (id: string, newRadius: number) => {
        // Save current state before updating size
        saveToHistory();
        
        setPlaces((prevPlaces) =>
            prevPlaces.map((p) => (p.id === id ? { ...p, radius: newRadius } : p))
        );
    };

    const updateTransitionSize = (id: string, newWidth: number, newHeight: number) => {
        console.log('App: Updating size to:', newWidth, newHeight);
        // Save current state before updating size
        saveToHistory();
        
        setTransitions((prevTransitions) =>
            prevTransitions.map((t) => {
                if (t.id === id) {
                    console.log('App: Before update:', t.width, t.height);
                    const updated = { ...t, width: newWidth, height: newHeight };
                    console.log('App: After update:', updated.width, updated.height);
                    return updated;
                }
                return t;
            })
        );
    };

    const updateElementPosition = (id: string, newX: number, newY: number, dragState: 'start' | 'dragging' | 'end' = 'end') => {
        // If this is the start of dragging, save the current state to history
        if (dragState === 'start') {
            // Save the current state to history
            saveToHistory();
        }
        
        // Update the position (this happens for all position updates)
        setPlaces((prevPlaces) =>
            prevPlaces.map((p) =>
                p.id === id ? { ...p, x: newX, y: newY } : p
            )
        );

        setTransitions((prevTransitions) =>
            prevTransitions.map((t) =>
                t.id === id ? { ...t, x: newX, y: newY } : t
            )
        );
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
    const handleImport = (importedData: PetriNetDTO) => {
        // Convert imported places to UIPlace objects
        const importedPlaces = importedData.places.map(place => ({
            id: place.id,
            name: place.name || '',
            tokens: place.tokens,
            x: place.x || 100, // Default position if not provided
            y: place.y || 100,
            radius: place.radius || 46  // Doubled from 23 to 46
        }));
        
        // Convert imported transitions to UITransition objects
        const importedTransitions = importedData.transitions.map(transition => ({
            id: transition.id,
            name: transition.name || '',
            enabled: transition.enabled,
            arcIds: transition.arcIds,
            x: transition.x || 200, // Default position if not provided
            y: transition.y || 200,
            width: transition.width || 120,  // Doubled from 60 to 120
            height: transition.height || 54   // Doubled from 27 to 54
        }));
        
        // Set the imported data
        setPlaces(importedPlaces);
        setTransitions(importedTransitions);
        setArcs(importedData.arcs);
        
        // If the imported data has a title, use it
        if (importedData.title) {
            setTitle(importedData.title);
        }
    };

    const continueSimulation = async (selectedTransitionId: string) => {
        const requestBody = {
            ...petriNetDTO,
            selectedTransitionId
        };
        
        try {
            const response = await fetch('http://localhost:8080/api/process/resolve', {
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
            
            // Update transitions state
            const newTransitions = transitions.map(t => {
                const updated = responseData.transitions.find((rt: { id: string; enabled: boolean }) => rt.id === t.id);
                return updated ? { ...t, enabled: updated.enabled } : t;
            });
            setTransitions([...newTransitions]);
            
            setConflictResolutionMode(false);
            setConflictingTransitions([]);
        } catch (error) {
            console.error('Error resolving conflict:', error);
        }
    };

    // ===== RENDER =====
    return (
        <div className="app" style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            height: '100vh',
            overflow: 'hidden' // Prevent scrolling at the app level
        }}>
            {/* Use the EditableTitle component */}
            <EditableTitle 
                title={title} 
                onTitleChange={setTitle} 
                ref={titleRef}
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

            {/* Main content area */}
            <div style={{ 
                display: 'flex', 
                flex: 1, 
                overflow: 'hidden',
                position: 'relative' // Ensure children are positioned relative to this
            }}>
                {/* Left sidebar for tools */}
                <div style={{ 
                    width: '200px', 
                    borderRight: '1px solid #2a2a2a', // Lighter grey border
                    padding: '10px',
                    flexShrink: 0, // Prevent sidebar from shrinking
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden' // Prevent scrolling in the sidebar
                }}>
                    {/* Toolbar section */}
                    <div style={{ flex: 'none', overflow: 'hidden' }}>
                        <Toolbar
                            selectedTool={selectedTool}
                            setSelectedTool={setSelectedTool}
                            arcType={arcType}
                            setArcType={setArcType}
                        />
                    </div>

                    {/* Simulation controls */}
                    <div className="controls" style={{ 
                        marginTop: '2rem', 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '10px',
                        padding: '10px',
                        borderTop: '1px solid #2a2a2a',
                        overflow: 'hidden' // Prevent scrolling in controls
                    }}>
                        {/* Deterministic Mode checkbox with hover effect */}
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
                            onMouseOver={(e) => {
                                e.currentTarget.style.backgroundColor = '#2a2a2a';
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                            onClick={() => {
                                const newValue = !deterministicMode;
                                console.log("Setting deterministic mode to:", newValue);
                                setDeterministicMode(newValue);
                            }}
                            title="When enabled, you can choose which transition to fire when multiple are enabled"
                        >
                            <input
                                type="checkbox"
                                id="deterministic-mode"
                                checked={deterministicMode}
                                onChange={(e) => {
                                    // This handler is now redundant since the parent div handles the click,
                                    // keeping it for accessibility and direct checkbox interactions
                                    console.log("Setting deterministic mode to:", e.target.checked);
                                    setDeterministicMode(e.target.checked);
                                }}
                                style={{ marginRight: '5px', cursor: 'pointer' }}
                                onClick={(e) => {
                                    // Stop propagation to prevent double-toggling
                                    e.stopPropagation();
                                }}
                            />
                            <label 
                                htmlFor="deterministic-mode" 
                                style={{ cursor: 'pointer' }}
                                onClick={(e) => {
                                    // Stop propagation to prevent double-toggling
                                    // since clicking the label already triggers the checkbox
                                    e.stopPropagation();
                                }}
                            >
                                Deterministic Mode
                            </label>
                        </div>
                        
                        {/* Next State button with hover effect */}
                        <button 
                            onClick={handleSimulate} 
                            className="simulate-button"
                            style={{
                                padding: '8px 12px',
                                backgroundColor: '#2c5282',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                transition: 'background-color 0.2s ease'
                            }}
                            onMouseOver={(e) => {
                                e.currentTarget.style.backgroundColor = '#3a69a4';
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.backgroundColor = '#2c5282';
                            }}
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
                    
                    {/* Reset button at the bottom of sidebar */}
                    <div style={{ 
                        marginTop: '10px', 
                        borderTop: '1px solid #2a2a2a',
                        paddingTop: '10px'
                    }}>
                        <button 
                            onClick={handleReset} 
                            className="reset-button"
                            style={{
                                width: '100%',
                                padding: '8px 12px',
                                backgroundColor: '#822c2c',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                transition: 'background-color 0.2s ease',
                                fontWeight: 'bold'
                            }}
                            onMouseOver={(e) => {
                                e.currentTarget.style.backgroundColor = '#a43a3a';
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.backgroundColor = '#822c2c';
                            }}
                            title="Clear all elements from the canvas"
                        >
                            Reset Canvas
                        </button>
                    </div>
                </div>

                {/* Center area with canvas and page navigation */}
                <div style={{ 
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden'
                }}>
                    {/* Canvas container - takes most of the space but leaves room at bottom */}
                    <div style={{ 
                        flex: 1,
                        overflow: 'hidden',
                        minHeight: 0 // Important for flex child to respect parent's size
                    }}>
                    <Canvas
                        places={places}
                        transitions={transitions}
                        arcs={arcs}
                        selectedElements={selectedElements}
                        onCanvasClick={handleCanvasClick}
                        onUpdatePlaceSize={updatePlaceSize}
                        onUpdateTransitionSize={updateTransitionSize}
                        onUpdateElementPosition={updateElementPosition}
                        onSelectElement={handleSelectElement}
                        selectedTool={selectedTool}
                        onArcPortClick={handleArcPortClick}
                        arcType={arcType}
                        onUpdateToken={handleTokenUpdate}
                        onTypingChange={handleTypingChange}
                        onUpdateName={handleNameUpdate}
                        conflictResolutionMode={conflictResolutionMode}
                        conflictingTransitions={conflictingTransitions}
                        onConflictingTransitionSelect={continueSimulation}
                    />
                </div>

                    {/* Space for future page navigation */}
                    <div style={{ 
                        height: '40px',
                        borderTop: '1px solid #2a2a2a',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#1a1a1a',
                        padding: '0 15px'
                    }}>
                        {/* Page Navigation */}
                        <div style={{ color: '#777', fontSize: '14px' }}>
                            Page navigation (Under Construction)
                        </div>
                    </div>
                </div>

                {/* Right sidebar for JSON viewer */}
                <div style={{ 
                    width: '390px', 
                    borderLeft: '1px solid #2a2a2a',
                    overflow: 'auto',
                    flexShrink: 0, // Prevent shrinking
                    marginRight: '2px' // Add a small margin to ensure scrollbar is visible
                }}>
                    <JSONViewer 
                        data={petriNetDTO} 
                        width={390} 
                        height="100%" 
                        selectedElements={selectedElements} 
                        autoScrollEnabled={autoScrollEnabled}
                        onAutoScrollToggle={setAutoScrollEnabled}
                        currentMode={currentMode}
                    />
                </div>
            </div>
        </div>
    );
}