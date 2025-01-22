import React, { useState } from 'react';
import ShapeSidebar from './Toolbox';
import Canvas from './Canvas';
import PlaceNode from './PlaceNode';
import Transitions from './TransitionNode';
import TopToolbar from './Toolbar';
import { processPetriNet } from '../services/PetriNetService';
import '../styles/PetriNetEditor.css';

const PetriNetEditor = () => {
    const [selectedTool, setSelectedTool] = useState(null);
    const [petriNet, setPetriNet] = useState({
        places: [],
        transitions: [],
        arcs: [],
    });

    const handleSelectTool = (tool) => {
        setSelectedTool(tool);
    };

    const handleProcessPetriNet = () => {
        processPetriNet(petriNet)
            .then(updatedPetriNet => {
                setPetriNet(updatedPetriNet); // Update the state with the processed Petri net
                console.log("Petri net processed successfully", updatedPetriNet);
            })
            .catch(error => {
                console.error("There was an error processing the Petri net!", error);
            });
    };

    return (
        <div className="editor-container">
            <TopToolbar onProcess={handleProcessPetriNet} />
            <ShapeSidebar onSelect={handleSelectTool} />
            <Canvas selectedTool={selectedTool} petriNet={petriNet} setPetriNet={setPetriNet} />
        </div>
    );
};

export default PetriNetEditor;
