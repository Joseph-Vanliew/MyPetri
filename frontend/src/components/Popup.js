import React from 'react';
import '../styles/Popup.css';

const Popup = ({ onNewDiagram, onOpenDiagram }) => {
    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (file && file.name.endsWith('.petrinet')) {
            onOpenDiagram(file);
        } else {
            alert('Please select a valid .petrinet file.');
        }
    };

    return (
        <div className="popup-overlay">
            <div className="popup-content">
                <h2>Welcome to Petri Net Editor</h2>
                <button onClick={onNewDiagram}>Create New Diagram</button>
                <div>
                    <label htmlFor="file-upload" className="custom-file-upload">
                        Open Existing Diagram
                    </label>
                    <input
                        id="file-upload"
                        type="file"
                        accept=".petrinet"  /* Restrict to .petrinet files */
                        onChange={handleFileChange}
                    />
                </div>
            </div>
        </div>
    );
};

export default Popup;
