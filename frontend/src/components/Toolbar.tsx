// src/components/Toolbar.tsx

import { UIArc } from '../types';
import { useState, useRef } from 'react';
import './styles/Toolbar.css';

interface ToolbarProps {
    selectedTool: 'PLACE' | 'TRANSITION' | 'ARC'| 'NONE';
    setSelectedTool: (tool: 'PLACE' | 'TRANSITION' | 'ARC' | 'NONE') => void;
    arcType: UIArc['type'];
    setArcType: (type: UIArc['type']) => void;
    showCapacityEditorMode: boolean;
    onToggleCapacityEditorMode: (enabled: boolean) => void;
}

export const Toolbar = ({
    selectedTool,
    setSelectedTool,
    arcType,
    setArcType,
}: ToolbarProps) => {
    // Add state to track if we're currently dragging
    const [isDragging, setIsDragging] = useState<'PLACE' | 'TRANSITION' | null>(null);
    
    // Create refs for the SVG elements to use as drag images
    const placeRef = useRef<SVGSVGElement>(null);
    const transitionRef = useRef<SVGSVGElement>(null);
    
    const handleToolSelect = (tool: ToolbarProps['selectedTool']) => {
        setSelectedTool(tool);
        // If selecting Place or Transition, reset Arc type (optional UX choice)
        if (tool === 'PLACE' || tool === 'TRANSITION') {
            setArcType('REGULAR');
        }
    };

    return (
        <div className="toolbar-elements">
            <div className="tools-container">
                <div className="elements-label">
                    Node Elements:
                </div>

                {/* Place button */}
                <div 
                    className={`toolbar-item toolbar-place ${selectedTool === 'PLACE' || isDragging === 'PLACE' ? 'active' : ''}`}
                    onClick={() => handleToolSelect('PLACE')}
                    draggable
                    onDragStart={(e) => {
                        e.dataTransfer.setData('application/petri-item', 'PLACE');
                        setSelectedTool('PLACE');
                        setIsDragging('PLACE');
                        
                        const dragImage = document.createElement('div');
                        dragImage.innerHTML = `
                            <svg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="30" cy="30" r="25" fill="#0f0f0f" stroke="#ffffff" stroke-width="2" />
                            </svg>
                        `;
                        document.body.appendChild(dragImage);
                        dragImage.style.position = 'absolute';
                        dragImage.style.top = '-1000px';
                        e.dataTransfer.setDragImage(dragImage, 30, 30);
                        setTimeout(() => {
                            document.body.removeChild(dragImage);
                        }, 0);
                    }}
                    onDragEnd={() => {
                        setIsDragging(null);
                    }}
                    title="Add a Place (container for tokens)"
                >
                    <div className="toolbar-icon-container">
                        <svg 
                            ref={placeRef}
                            viewBox="0 0 80 80"
                        >
                            <circle 
                                cx="40" 
                                cy="40" 
                                r="30" 
                                fill="#0f0f0f" 
                                stroke="#ffffff" 
                                strokeWidth="2" 
                            />
                        </svg>
                    </div>
                    <span className="toolbar-item-label">Place</span>
                </div>

                {/* Transition button */}
                <div 
                    className={`toolbar-item toolbar-transition ${selectedTool === 'TRANSITION' || isDragging === 'TRANSITION' ? 'active' : ''}`}
                    onClick={() => handleToolSelect('TRANSITION')}
                    draggable
                    onDragStart={(e) => {
                        e.dataTransfer.setData('application/petri-item', 'TRANSITION');
                        setSelectedTool('TRANSITION');
                        setIsDragging('TRANSITION');
                        
                        const dragImage = document.createElement('div');
                        dragImage.innerHTML = `
                            <svg width="60" height="40" viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg">
                                <rect x="10" y="10" width="40" height="20" rx="8" fill="#0f0f0f" stroke="#ffffff" stroke-width="2" />
                            </svg>
                        `;
                        document.body.appendChild(dragImage);
                        dragImage.style.position = 'absolute';
                        dragImage.style.top = '-1000px';
                        e.dataTransfer.setDragImage(dragImage, 30, 20);
                        setTimeout(() => {
                            document.body.removeChild(dragImage);
                        }, 0);
                    }}
                    onDragEnd={() => {
                        setIsDragging(null);
                    }}
                    title="Add a Transition (action that consumes and produces tokens)"
                >
                    <div className="toolbar-icon-container">
                        <svg 
                            ref={transitionRef}
                            viewBox="0 0 80 80"
                        >
                            <rect 
                                x="10" 
                                y="25" 
                                width="60" 
                                height="30" 
                                rx="8"
                                fill="#0f0f0f" 
                                stroke="#ffffff" 
                                strokeWidth="2" 
                            />
                        </svg>
                    </div>
                    <span className="toolbar-item-label">Transition</span>
                </div>

                <div className="arcs-label">
                    Arcs:
                </div>

                <div className="arcs-row">
                    {/* Regular Arc */}
                    <button 
                        className={`arc-button ${selectedTool === 'ARC' && arcType === 'REGULAR' ? 'active' : ''}`}
                        onClick={() => {
                            setSelectedTool('ARC');
                            setArcType('REGULAR');
                        }}
                        title="Regular Arc: Connects places and transitions"
                    >
                        <svg viewBox="0 0 100 50">
                            <defs>
                                <marker id="arrowhead-regular" markerWidth="10" markerHeight="7" 
                                 refX="0" refY="3.5" orient="auto">
                                    <polygon points="0 0, 10 3.5, 0 7" fill="#fff" />
                                </marker>
                            </defs>
                            <line x1="20" y1="25" x2="70" y2="25" stroke="#fff" strokeWidth="3" markerEnd="url(#arrowhead-regular)" />
                        </svg>
                        <span className="arc-button-label">Regular</span>
                    </button>

                    {/* Inhibitor Arc */}
                    <button 
                        className={`arc-button ${selectedTool === 'ARC' && arcType === 'INHIBITOR' ? 'active' : ''}`}
                        onClick={() => {
                            setSelectedTool('ARC');
                            setArcType('INHIBITOR');
                        }}
                        title="Inhibitor Arc: Prevents transition from firing when place has tokens"
                    >
                        <svg viewBox="0 0 100 50">
                            <line x1="20" y1="25" x2="65" y2="25" stroke="#fff" strokeWidth="3" />
                            <circle cx="75" cy="25" r="8" fill="#ff3333" stroke="#fff" strokeWidth="2" />
                        </svg>
                        <span className="arc-button-label">Inhibitor</span>
                    </button>

                    {/* Bidirectional Arc */}
                    <button 
                        className={`arc-button ${selectedTool === 'ARC' && arcType === 'BIDIRECTIONAL' ? 'active' : ''}`}
                        onClick={() => {
                            setSelectedTool('ARC');
                            setArcType('BIDIRECTIONAL');
                        }}
                        title="Bidirectional Arc: Two-way connection"
                    >
                        <svg viewBox="0 0 120 60">
                            <defs>
                                <marker id="arrowhead-bi1" markerWidth="10" markerHeight="7" 
                                 refX="0" refY="3.5" orient="auto">
                                    <polygon points="0 0, 10 3.5, 0 7" fill="#fff" />
                                </marker>
                                <marker id="arrowhead-bi2" markerWidth="10" markerHeight="7" 
                                 refX="10" refY="3.5" orient="auto">
                                    <polygon points="10 0, 0 3.5, 10 7" fill="#fff" />
                                </marker>
                            </defs>
                            <line x1="30" y1="30" x2="90" y2="30" stroke="#fff" strokeWidth="3" 
                                  markerStart="url(#arrowhead-bi2)" markerEnd="url(#arrowhead-bi1)" />
                        </svg>
                        <span className="arc-button-label">Bi-direct</span>
                    </button>
                </div>

                {/* Arc Description - shows when an arc type is selected */}
                {selectedTool === 'ARC' && (
                    <div className="arc-description">
                        {arcType === 'REGULAR' && (
                            <div>
                                <div className="arc-type-label">Regular Arc</div>
                                <div className="arc-pattern">
                                    <span className="arc-text-small">place</span>
                                    <svg className="arc-arrow-svg" viewBox="0 0 30 15">
                                        <defs>
                                            <marker id="desc-arrow-regular" markerWidth="4" markerHeight="3" 
                                             refX="0" refY="1.5" orient="auto">
                                                <polygon points="0 0, 4 1.5, 0 3" fill="#e0e0e0" />
                                            </marker>
                                        </defs>
                                        <line x1="4" y1="7.5" x2="22" y2="7.5" stroke="#e0e0e0" strokeWidth="1.5" markerEnd="url(#desc-arrow-regular)" />
                                    </svg>
                                    <span className="arc-text-small">transition</span>
                                </div>
                                <div className="arc-text">Connects places and transitions and vice versa</div>
                            </div>
                        )}
                        {arcType === 'INHIBITOR' && (
                            <div>
                                <div className="arc-type-label">Inhibitor Arc</div>
                                <div className="arc-pattern">
                                    <span className="arc-text-small">place</span>
                                    <svg className="arc-arrow-svg" viewBox="0 0 30 15">
                                        <line x1="4" y1="7.5" x2="20" y2="7.5" stroke="#e0e0e0" strokeWidth="1.5" />
                                        <circle cx="24" cy="7.5" r="2.5" fill="#ff3333" stroke="#e0e0e0" strokeWidth="1" />
                                    </svg>
                                    <span className="arc-text-small">transition</span>
                                </div>
                                <div className="arc-text">Prevents firing when place has tokens</div>
                            </div>
                        )}
                        {arcType === 'BIDIRECTIONAL' && (
                            <div>
                                <div className="arc-type-label">Bidirectional Arc</div>
                                <div className="arc-pattern">
                                    <span className="arc-text-small">place</span>
                                    <svg className="arc-arrow-svg bidirectional" viewBox="0 0 30 15">
                                        <defs>
                                            <marker id="desc-arrow-bi1" markerWidth="4" markerHeight="3" 
                                             refX="0" refY="1.5" orient="auto">
                                                <polygon points="0 0, 4 1.5, 0 3" fill="#e0e0e0" />
                                            </marker>
                                            <marker id="desc-arrow-bi2" markerWidth="4" markerHeight="3" 
                                             refX="4" refY="1.5" orient="auto">
                                                <polygon points="4 0, 0 1.5, 4 3" fill="#e0e0e0" />
                                            </marker>
                                        </defs>
                                        <line x1="6" y1="7.5" x2="24" y2="7.5" stroke="#e0e0e0" strokeWidth="1.5" 
                                              markerStart="url(#desc-arrow-bi2)" markerEnd="url(#desc-arrow-bi1)" />
                                    </svg>
                                    <span className="arc-text-small">transition</span>
                                </div>
                                <div className="arc-text">Two-way connection between elements</div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};