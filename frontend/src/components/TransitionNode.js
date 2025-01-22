import React, { useState } from 'react';
import '../styles/TransitionNode.css';

const TransitionNode = ({ id, initialEnabled = false }) => {
    // State to manage whether the transition is enabled
    const [enabled, setEnabled] = useState(initialEnabled);

    // State to manage the list of connected arc IDs
    const [arcIds, setArcIds] = useState([]);

    // Function to handle adding an arc
    const addArc = (arcId) => {
        setArcIds([...arcIds, arcId]);
    };

    // Function to handle removing an arc
    const removeArc = (arcId) => {
        const updatedArcIds = arcIds.filter(existingArcId => existingArcId !== arcId);
        setArcIds(updatedArcIds);
    };

    return (
        <div className={`transition-node ${enabled ? 'enabled' : 'disabled'}`}>
            <div className="transition-node-id">
                {`Transition: ${id}`}
            </div>
            <div className="transition-node-status">
                {`Status: ${enabled ? 'Enabled' : 'Disabled'}`}
            </div>
        </div>
    );
};

export default TransitionNode;
