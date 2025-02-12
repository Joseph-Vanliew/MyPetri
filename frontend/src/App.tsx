// src/App.tsx
import {useState, useCallback, useEffect} from 'react';
import { Canvas } from './components/Canvas';
import { Toolbar } from './components/Toolbar';
import {PetriNetDTO, UIPlace, UITransition, UIArc, GRID_CELL_SIZE} from './types';
import {JSONViewer} from "./components/JSONViewer.tsx";

export default function App() {
    // State management
    const [places, setPlaces] = useState<UIPlace[]>([]);
    const [transitions, setTransitions] = useState<UITransition[]>([]);
    const [arcs, setArcs] = useState<UIArc[]>([]);
    const [selectedTool, setSelectedTool] = useState<'NONE' |'PLACE' | 'TRANSITION' | 'ARC'>('NONE');
    const [selectedElements, setSelectedElements] = useState<string[]>([]);
    const [arcType, setArcType] = useState<UIArc['type']>('REGULAR');


    // Listen for Escape or Delete keys
    useEffect(() => {
        function handleKeyDown(e: KeyboardEvent) {
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
    }, [selectedElements, places, transitions, arcs]);

    const petriNetDTO: PetriNetDTO = {
        places: places.map((p) => ({ id: p.id, tokens: p.tokens })),
        transitions: transitions.map((t) => ({
            id: t.id,
            enabled: t.enabled,
            arcIds: t.arcIds,
        })),
        arcs: arcs.map((a) => ({
            id: a.id,
            type: a.type,
            incomingId: a.incomingId,
            outgoingId: a.outgoingId,
        })),
    };

    // Placing elements
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

    // Arc creation and binding
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

    // Find clicked element helper
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

    // Validate arc connections
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

    // Builds backend request and Sends
    const handleSimulate = async () => {
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
            }))
        };

        try {
            const response = await fetch('http://localhost:8080/api/process', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) throw new Error(`HTTP error: ${response.status}`);

            const responseData: PetriNetDTO = await response.json();

            // Update state with backend response... replace with update token counts and call animations.
            setPlaces(prev => prev.map(p => {
                const updated = responseData.places.find(rp => rp.id === p.id);
                return updated ? { ...p, tokens: updated.tokens } : p;
            }));

            setTransitions(prev => prev.map(t => {
                const updated = responseData.transitions.find(rt => rt.id === t.id);
                return updated ? { ...t, enabled: updated.enabled } : t;
            }));

        } catch (error) {
            console.error('Simulation error:', error);
        }
    };

    // resets PetriNet
    const handleReset = async () => {
        setPlaces([]);
        setTransitions([]);
        setArcs([]);
        setSelectedElements([]);
    }

    //clears map of selected element
    function handleDelete() {
        if (selectedElements.length === 0) return;

        // We'll remove arcs that reference any selected ID
        // and remove the selected places/transitions from their arrays.

        setArcs((prevArcs) =>
            prevArcs.filter(
                (arc) =>
                    !selectedElements.includes(arc.incomingId) &&
                    !selectedElements.includes(arc.outgoingId)
            )
        );

        setPlaces((prevPlaces) =>
            prevPlaces.filter((p) => !selectedElements.includes(p.id))
        );

        setTransitions((prevTransitions) =>
            prevTransitions.map((t) => ({
                ...t,
                // remove arcs from arcIds if they're referencing a deleted place/transition
                arcIds: t.arcIds.filter((aid) => {
                    // We still want to keep arc if it's not referencing a soon-deleted ID
                    // But we actually removed the arc from arcs array, so it might be moot
                    // This just ensures we don't keep stray references
                    const arc = arcs.find((arc) => arc.id === aid);
                    if (!arc) return false; // If arc was already removed, skip
                    return !(selectedElements.includes(arc.incomingId) ||
                        selectedElements.includes(arc.outgoingId));

                }),
            }))
                // Also filter out transitions themselves that are selected
                .filter((t) => !selectedElements.includes(t.id))
        );

        // Clear the selection after deletion
        setSelectedElements([]);
    }

    //resizes Place nodes when selected
    const updatePlaceSize = (id: string, newRadius: number) => {
        setPlaces((prevPlaces) =>
            prevPlaces.map((p) => (p.id === id ? { ...p, radius: newRadius } : p))
        );
    };

    //resizes Transition nodes when selected
    const updateTransitionSize = (id: string, newHeight: number, newWidth: number) => {
        setTransitions((prevTransitions) =>
            prevTransitions.map((t) => (t.id === id ? { ...t, height: newHeight, width: newWidth } : t))
        );
    };

    //repositions selected element
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



    return (
        <div className="app">
            {/* Toolbar at the top */}
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
                    />
                </div>

                {/* JSON Viewer */}
                <div style={{ marginLeft: '1rem' }}>
                    <JSONViewer data={petriNetDTO} width={400} height={600} />
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
            </div>
        </div>
    );
}