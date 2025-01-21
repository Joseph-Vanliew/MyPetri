import React, { useState } from 'react';
import PlaceNode from './PlaceNode';
import TransitionNode from './TransitionNode';
import Arc from './Arc';
import '../styles/Toolbox.css';

const Toolbox = ({ onSelectTool }) => {
    const [showArcDropdown, setShowArcDropdown] = useState(false);

    const handleToolClick = (toolType) => {
        onSelectTool(toolType);
    };

    // Expected drag drop context
    // add a drag and drop method here.

    const onDrag = ({}) => {
    //link to canvas component
    };


    return (
        <div className="toolbox">
            <div className="toolbox-item" onClick={() => handleToolClick('PLACE')}>
                <div className="toolbox-item-scale">
                    <PlaceNode id="preview" />
                </div>
                <span>Place Node</span>
            </div>
            <div className="toolbox-item" onClick={() => handleToolClick('TRANSITION')}>
                <div className="toolbox-item-scale">
                    <TransitionNode id="preview" initialEnabled={false} />
                </div>
                <span>Transition Node</span>
            </div>
            <div className="toolbox-item">
                <div onClick={() => setShowArcDropdown(!showArcDropdown)}>
                    <span>Arcs ▼</span>
                </div>
                {showArcDropdown && (
                    <div className="arc-dropdown">
                        <div className="toolbox-item-scale" onClick={() => handleToolClick('REGULAR')}>
                            <Arc id="preview" initialType="REGULAR" />
                            <span>Regular Arc</span>
                        </div>
                        <div className="toolbox-item-scale" onClick={() => handleToolClick('INHIBITOR')}>
                            <Arc id="preview" initialType="INHIBITOR" />
                            <span>Inhibitor Arc</span>
                        </div>
                        <div className="toolbox-item-scale" onClick={() => handleToolClick('BIDIRECTIONAL')}>
                            <Arc id="preview" initialType="BIDIRECTIONAL" />
                            <span>Bidirectional Arc</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Toolbox;
