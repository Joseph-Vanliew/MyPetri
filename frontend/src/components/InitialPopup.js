// src/components/InitialPopup.js

import React from 'react';
import './InitialPopup.css';

const InitialPopup = ({ onClose, onLoadFile, onCreateNew }) => {
    return (
        <div className="modal">
            <div className="modal-content">
                <h2>Welcome to Petri Net Simulator</h2>
                <button onClick={onCreateNew}>Create New Petri Net</button>
                <div>
                    <label htmlFor="fileUpload">Load Petri Net File:</label>
                    <input type="file" id="fileUpload" onChange={onLoadFile} />
                </div>
                <button onClick={onClose}>Close</button>
            </div>
        </div>
    );
};

export default InitialPopup;
