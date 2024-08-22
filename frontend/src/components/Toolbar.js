import React, { useState } from 'react';
import '../styles/Toolbar.css';

const Toolbar = ({ petriNetData, setPetriNetData }) => {
    const [isDropdownVisible, setIsDropdownVisible] = useState(false);

    const handleSave = () => {
        const jsonData = JSON.stringify(petriNetData, null, 2); // Convert Petri net data to JSON
        const blob = new Blob([jsonData], { type: 'application/json' }); // Create a Blob with the JSON data
        const link = document.createElement('a');
        link.download = 'diagram.petrinet'; // setting .petrinet extension
        link.href = URL.createObjectURL(blob); // Create a URL for the Blob
        document.body.appendChild(link);
        link.click(); // Trigger the download
        document.body.removeChild(link); // Clean up
    };

    const handleOpen = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.petrinet'; // Restrict to .petrinet files

        input.onchange = async (event) => {
            const file = event.target.files[0];
            if (file && file.name.endsWith('.petrinet')) {
                const text = await file.text();
                const data = JSON.parse(text); // Parse the JSON content
                setPetriNetData(data); // Update the Petri net state with the loaded data
            } else {
                alert('Please select a valid .petrinet file.');
            }
        };

        input.click(); // Trigger the file input dialog
    };

    const handleSaveClick = () => {
        setIsDropdownVisible(false);
        handleSave();
    };

    const handleOpenClick = () => {
        setIsDropdownVisible(false);
        const userConfirmed = window.confirm('Do you want to save your current configuration before opening a new file?');
        if (userConfirmed) {
            handleSave(); // Save the current configuration first
        }
        handleOpen(); // Open a new file afterward
    };

    return (
        <div className="toolbar">
            <div className="file-menu" onClick={() => setIsDropdownVisible(!isDropdownVisible)}>
                File ▼
                {isDropdownVisible && (
                    <div className="dropdown-content">
                        <div onClick={handleSaveClick}>Save</div>
                        <div onClick={handleOpenClick}>Open</div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Toolbar;
