import React, { useState, useEffect, useRef } from 'react';
import { processPetriNet } from '../services/PetriNetService';
import Toolbox from './Toolbox';
import InitialPopup from './InitialPopup';
import './PetriNetEditor.css';

const PetriNetEditor = () => {
    const [places, setPlaces] = useState([]);
    const [transitions, setTransitions] = useState([]);
    const [arcs, setArcs] = useState([]);
    const [currentArc, setCurrentArc] = useState(null);
    const [showPopup, setShowPopup] = useState(true);
    const [error, setError] = useState(null);
    const svgRef = useRef(null);

    const handleRun = async () => {
        const petriNetDTO = { places, transitions, arcs };
        try {
            const result = await processPetriNet(petriNetDTO);
            console.log(result);
        } catch (error) {
            setError('Failed to process Petri net. Please try again.');
        }
    };

    const handleSave = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ places, transitions, arcs }));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "petri_net.json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    };

    const handleImport = (event) => {
        const file = event.target.files[0];
        const reader = new FileReader();
        reader.onload = (e) => {
            const petriNetDTO = JSON.parse(e.target.result);
            setPlaces(petriNetDTO.places);
            setTransitions(petriNetDTO.transitions);
            setArcs(petriNetDTO.arcs);
        };
        reader.readAsText(file);
        setShowPopup(false);
    };

    const createNewPetriNet = () => {
        setPlaces([]);
        setTransitions([]);
        setArcs([]);
        setShowPopup(false);
    };

    const onDrop = (event) => {
        event.preventDefault();
        const svg = svgRef.current;
        const rect = svg.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const nodeType = event.dataTransfer.getData('application/reactflow');
        if (nodeType === 'place') {
            const id = `P${places.length + 1}`;
            setPlaces([...places, { id, x, y, tokens: 0, r: 20 }]);
        } else if (nodeType === 'transition-normal') {
            const id = `T${transitions.length + 1}`;
            setTransitions([...transitions, { id, x, y, type: 'normal', arcIds: [] }]);
        } else if (nodeType === 'transition-bidirectional') {
            const id = `T${transitions.length + 1}`;
            setTransitions([...transitions, { id, x, y, type: 'bidirectional', arcIds: [] }]);
        } else if (nodeType === 'transition-inhibitor') {
            const id = `T${transitions.length + 1}`;
            setTransitions([...transitions, { id, x, y, type: 'inhibitor', arcIds: [] }]);
        }
    };

    const onDragOver = (event) => {
        event.preventDefault();
    };

    const startArc = (nodeId, nodeType) => {
        setCurrentArc({ incomingId: nodeId, incomingType: nodeType });
    };

    const endArc = (nodeId, nodeType) => {
        if (currentArc) {
            const newArc = {
                ...currentArc,
                outgoingId: nodeId,
                outgoingType: nodeType,
                id: `A${arcs.length + 1}`,
                type: 'REGULAR'
            };
            setArcs([...arcs, newArc]);
            setCurrentArc(null);
        }
    };

    const addToken = (placeId) => {
        setPlaces(places.map(place => place.id === placeId ? { ...place, tokens: place.tokens + 1 } : place));
    };

    const onPlaceResize = (id, newRadius) => {
        setPlaces(places.map(place => place.id === id ? { ...place, r: newRadius } : place));
    };

    return (
        <div className="editor-container">
            {showPopup && <InitialPopup onClose={() => setShowPopup(false)} onLoadFile={handleImport} onCreateNew={createNewPetriNet} />}
            <Toolbox />
            <div className="canvas-container">
                <div className="control-buttons">
                    <button onClick={handleRun}>Run</button>
                    <button onClick={handleSave}>Export</button>
                </div>
                {error && <div className="error">{error}</div>}
                <svg
                    ref={svgRef}
                    width="800"
                    height="600"
                    onDrop={onDrop}
                    onDragOver={onDragOver}
                    style={{ border: '1px solid black' }}
                >
                    <defs>
                        <pattern id="smallGrid" width="10" height="10" patternUnits="userSpaceOnUse">
                            <path d="M 10 0 L 0 0 0 10" fill="none" stroke="gray" strokeWidth="0.5"/>
                        </pattern>
                        <pattern id="grid" width="100" height="100" patternUnits="userSpaceOnUse">
                            <rect width="100" height="100" fill="url(#smallGrid)"/>
                            <path d="M 100 0 L 0 0 0 100" fill="none" stroke="gray" strokeWidth="1"/>
                        </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#grid)" />
                    {places.map(place => (
                        <g key={place.id}>
                            <circle cx={place.x} cy={place.y} r={place.r} stroke="black" strokeWidth="2" fill="white" />
                            <text x={place.x} y={place.y} textAnchor="middle" dy=".3em">{place.tokens}</text>
                            <rect
                                x={place.x + place.r - 5}
                                y={place.y - 5}
                                width="10"
                                height="10"
                                fill="red"
                                cursor="nwse-resize"
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    const startX = e.clientX;
                                    const startY = e.clientY;
                                    const onMouseMove = (e) => {
                                        const dx = e.clientX - startX;
                                        const dy = e.clientY - startY;
                                        const newRadius = Math.sqrt(dx * dx + dy * dy);
                                        onPlaceResize(place.id, newRadius);
                                    };
                                    const onMouseUp = () => {
                                        window.removeEventListener('mousemove', onMouseMove);
                                        window.removeEventListener('mouseup', onMouseUp);
                                    };
                                    window.addEventListener('mousemove', onMouseMove);
                                    window.addEventListener('mouseup', onMouseUp);
                                }}
                            />
                        </g>
                    ))}
                    {transitions.map(transition => (
                        <g key={transition.id}>
                            <rect x={transition.x - 10} y={transition.y - 30} width="20" height="60" fill="black" />
                        </g>
                    ))}
                    {arcs.map(arc => {
                        const start = places.find(p => p.id === arc.incomingId) || transitions.find(t => t.id === arc.incomingId);
                        const end = places.find(p => p.id === arc.outgoingId) || transitions.find(t => t.id === arc.outgoingId);
                        if (!start || !end) return null;
                        return (
                            <line
                                key={arc.id}
                                x1={start.x}
                                y1={start.y}
                                x2={end.x}
                                y2={end.y}
                                stroke="black"
                                strokeWidth="2"
                            />
                        );
                    })}
                </svg>
            </div>
        </div>
    );
};

export default PetriNetEditor;
