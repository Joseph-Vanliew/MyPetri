// src/components/Toolbox.js

import React from 'react';
import './Toolbox.css';

const Toolbox = () => {
    const onDragStart = (event, nodeType) => {
        event.dataTransfer.setData('application/reactflow', nodeType);
        event.dataTransfer.effectAllowed = 'move';
    };

    return (
        <div className="toolbox">
            <div className="toolbox-section">
                <h3>Place Nodes</h3>
                <div
                    className="toolbox-item"
                    onDragStart={(event) => onDragStart(event, 'place')}
                    draggable
                >
                    <svg width="40" height="40">
                        <circle cx="20" cy="20" r="15" stroke="black" strokeWidth="2" fill="none" />
                    </svg>
                </div>
            </div>
            <div className="toolbox-section">
                <h3>Transitions</h3>
                <div
                    className="toolbox-item"
                    onDragStart={(event) => onDragStart(event, 'transition-normal')}
                    draggable
                >
                    <svg width="40" height="40">
                        <line x1="10" y1="30" x2="30" y2="10" stroke="black" strokeWidth="2" />
                        <polygon points="30,10 25,12 27,8" fill="black" />
                    </svg>
                </div>
                <div
                    className="toolbox-item"
                    onDragStart={(event) => onDragStart(event, 'transition-bidirectional')}
                    draggable
                >
                    <svg width="40" height="40">
                        <line x1="10" y1="30" x2="30" y2="10" stroke="black" strokeWidth="2" />
                        <polygon points="30,10 25,12 27,8" fill="black" />
                        <polygon points="10,30 15,28 13,32" fill="black" />
                    </svg>
                </div>
                <div
                    className="toolbox-item"
                    onDragStart={(event) => onDragStart(event, 'transition-inhibitor')}
                    draggable
                >
                    <svg width="40" height="40">
                        <line x1="10" y1="30" x2="30" y2="10" stroke="black" strokeWidth="2" />
                        <circle cx="30" cy="10" r="3" stroke="black" strokeWidth="2" fill="none" />
                    </svg>
                </div>
            </div>
        </div>
    );
};

export default Toolbox;
