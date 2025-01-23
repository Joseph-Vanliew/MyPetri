// src/App.tsx
import { useState, useCallback } from 'react';
import { Canvas } from './components/Canvas';
import { Toolbar } from './components/Toolbar';
import {PetriNetDTO, UIPlace, UITransition, UIArc, GRID_CELL_SIZE} from './types';

export default function App() {
    // State management
    const [places, setPlaces] = useState<UIPlace[]>([]);
    const [transitions, setTransitions] = useState<UITransition[]>([]);
    const [arcs, setArcs] = useState<UIArc[]>([]);
    const [selectedTool, setSelectedTool] = useState<'PLACE' | 'TRANSITION' | 'ARC'>('PLACE');
    const [selectedElements, setSelectedElements] = useState<string[]>([]);
    const [arcType, setArcType] = useState<UIArc['type']>('REGULAR');

    // Handle canvas clicks
    const handleCanvasClick = useCallback((x: number, y: number) => {
        if (selectedTool === 'PLACE') {
            const newPlace: UIPlace = {
                id: `place_${Date.now()}`,
                tokens: 1,
                x,
                y
            };
            setPlaces(prev => [...prev, newPlace]);
        } else if (selectedTool === 'TRANSITION') {
            const newTransition: UITransition = {
                id: `trans_${Date.now()}`,
                enabled: false,
                arcIds: [],
                x,
                y
            };
            setTransitions(prev => [...prev, newTransition]);
        } else if (selectedTool === 'ARC') {
            handleArcCreation(x, y);
        }
    }, [selectedTool, places, transitions]);

    // Arc creation logic
    const handleArcCreation = (x: number, y: number) => {
        const clickedElement = findClickedElement(x, y);

        if (!clickedElement) {
            setSelectedElements([]);
            return;
        }

        if (selectedElements.length === 0) {
            setSelectedElements([clickedElement.id]);
        } else {
            const sourceId = selectedElements[0];
            const targetId = clickedElement.id;

            if (isValidArcConnection(sourceId, targetId)) {
                const newArc: UIArc = {
                    id: `arc_${Date.now()}`,
                    type: arcType,
                    incomingId: sourceId,
                    outgoingId: targetId
                };
                setArcs(prev => [...prev, newArc]);

                // Update connected transitions with arc IDs
                if (sourceId.startsWith('trans')) {
                    setTransitions(prev => prev.map(t =>
                        t.id === sourceId ? {...t, arcIds: [...t.arcIds, newArc.id]} : t
                    ));
                }
                if (targetId.startsWith('trans')) {
                    setTransitions(prev => prev.map(t =>
                        t.id === targetId ? {...t, arcIds: [...t.arcIds, newArc.id]} : t
                    ));
                }
            }
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
    const isValidArcConnection = (sourceId: string, targetId: string) => {
        const isSourcePlace = sourceId.startsWith('place');
        const isSourceTrans = sourceId.startsWith('trans');
        const isTargetPlace = targetId.startsWith('place');
        const isTargetTrans = targetId.startsWith('trans');

        // Valid connections: Place -> Transition or Transition -> Place
        return (isSourcePlace && isTargetTrans) || (isSourceTrans && isTargetPlace);
    };

    // Simulation handler
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

            // Update state with backend response
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

    return (
        <div className="app">
            <Toolbar
                selectedTool={selectedTool}
                setSelectedTool={setSelectedTool}
                arcType={arcType}
                setArcType={setArcType}
            />

            <Canvas
                places={places}
                transitions={transitions}
                arcs={arcs}
                selectedElements={selectedElements}
                onCanvasClick={handleCanvasClick}
            />

            <div className="controls">
                <button onClick={handleSimulate} className="simulate-button">
                    Run Simulation
                </button>
            </div>
        </div>
    );
}