import React, { useState } from 'react';
import '../styles/Arc.css';

const Arc = ({ id, initialType, initialIncomingId, initialOutgoingId }) => {
    const [type, setType] = useState(initialType);
    const [incomingId, setIncomingId] = useState(initialIncomingId);
    const [outgoingId, setOutgoingId] = useState(initialOutgoingId);

    // Function to update the type of the arc
    const updateType = (newType) => {
        setType(newType);
    };

    // Function to update the incoming node ID
    const updateIncomingId = (newIncomingId) => {
        setIncomingId(newIncomingId);
    };

    // Function to update the outgoing node ID
    const updateOutgoingId = (newOutgoingId) => {
        setOutgoingId(newOutgoingId);
    };

    return (
        <svg className={`arc arc-${type.toLowerCase()}`} xmlns="http://www.w3.org/2000/svg">
            <line x1="0" y1="0" x2="100" y2="100" />
            {type === 'REGULAR' && (
                <polygon points="90,100 100,90 110,100" />
            )}
            {type === 'INHIBITOR' && (
                <circle cx="100" cy="100" r="5" />
            )}
            {type === 'BIDIRECTIONAL' && (
                <>
                    <polygon points="90,100 100,90 110,100" />
                    <polygon points="-10,0 0,-10 10,0" />
                </>
            )}
        </svg>
    );
};

export default Arc;