// src/App.tsx
import {useState, useCallback, useEffect} from 'react';
import { Canvas } from './components/Canvas';
import { Toolbar } from './components/Toolbar';
import {PetriNetDTO, UIPlace, UITransition, UIArc, GRID_CELL_SIZE} from './types';
import {JSONViewer} from "./components/JSONViewer.tsx";
import { MenuBar } from './components/MenuBar';

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
            if (isTyping) return; // Prevent deletion while typing

            if (e.key === 'Escape') {
                setSelectedTool('NONE');
                return;
            }

            if (e.key === 'Delete' || e.key === 'Backspace') {
                handleDelete();
            }
        }

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [selectedElements, places, transitions, arcs, isTyping]);

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

        if (selectedTool === 'PLACE') {
            const newPlace: UIPlace = {
                name:'',
                id: `place_${Date.now()}`,
                tokens: 0,
                x,
                y,
                radius: 23
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
                width: 60,
                height: 27
            };
            setTransitions(prev => [...prev, newTransition]);
            setSelectedTool('NONE');
        } else if (selectedTool === 'ARC') {
            handleArcCreation(x, y);
            setSelectedTool('NONE')
        }

    }, [selectedTool, places, transitions]);

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
                const newArc: UIArc = {
                    id: `arc_${Date.now()}`,
                    type: arcType,
                    incomingId: sourceId,
                    outgoingId: targetId,
                };
                setArcs(prev => [...prev, newArc]);

                // Optionally, update transitions if needed:
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
        setPlaces((prevPlaces) =>
            prevPlaces.map((p) => (p.id === id ? { ...p, radius: newRadius } : p))
        );
    };

    const updateTransitionSize = (id: string, newWidth: number, newHeight: number) => {
        console.log('App: Updating size to:', newWidth, newHeight);
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

    const updateElementPosition = (id: string, newX: number, newY: number) => {
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
        setPlaces(prevPlaces =>
            prevPlaces.map(place =>
                place.id === id ? { ...place, tokens: newTokens } : place
            )
        );
    };

    const handleNameUpdate = (id: string, newName: string) => {
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
            radius: place.radius || 23
        }));
        
        // Convert imported transitions to UITransition objects
        const importedTransitions = importedData.transitions.map(transition => ({
            id: transition.id,
            name: transition.name || '',
            enabled: transition.enabled,
            arcIds: transition.arcIds,
            x: transition.x || 200, // Default position if not provided
            y: transition.y || 200,
            width: transition.width || 60,
            height: transition.height || 27
        }));
        
        // Set the imported data
        setPlaces(importedPlaces);
        setTransitions(importedTransitions);
        setArcs(importedData.arcs);
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
        <div className="app">
            {/* Menu Bar at the very top */}
            <MenuBar
                petriNetData={petriNetDTO}
                onImport={handleImport}
            />

            {/* Toolbar for editing tools below the menu bar */}
            <Toolbar
                selectedTool={selectedTool}
                setSelectedTool={setSelectedTool}
                arcType={arcType}
                setArcType={setArcType}
            />

            {/* Main area*/}
            <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                {/* Canvas */}
                <div style={{ width: '800px', height: '600px' }}>
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

                {/* JSON Viewer */}
                <div style={{ marginLeft: '1rem' }}>
                    <JSONViewer 
                        data={petriNetDTO} 
                        width={400} 
                        height={600} 
                        selectedElements={selectedElements} 
                        autoScrollEnabled={autoScrollEnabled}
                        onAutoScrollToggle={setAutoScrollEnabled}
                        currentMode={currentMode}
                    />
                </div>
            </div>

            {/* Simulate and reset buttons */}
            <div className="controls" style={{ marginTop: '1rem' }}>
                <button onClick={handleSimulate} className="simulate-button">
                    Next State
                </button>
                <button onClick={handleReset} className="reset-button">
                    Reset
                </button>
                <div style={{ marginLeft: '1rem', display: 'inline-flex', alignItems: 'center' }}>
                    <input
                        type="checkbox"
                        id="deterministic-mode"
                        checked={deterministicMode}
                        onChange={(e) => {
                            console.log("Setting deterministic mode to:", e.target.checked);
                            setDeterministicMode(e.target.checked);
                        }}
                        style={{ marginRight: '5px' }}
                    />
                    <label htmlFor="deterministic-mode">Deterministic Mode</label>
                </div>
                {conflictResolutionMode && (
                    <div style={{ marginLeft: '1rem', color: '#ff4d4d' }}>
                        Select one transition to fire
                    </div>
                )}
            </div>
        </div>
    );
}