// src/components/Toolbar.tsx

import { UIArc } from '../types';
import { useState, useRef, useEffect } from 'react';
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
    const [dragPreview, setDragPreview] = useState<{
        type: 'PLACE' | 'TRANSITION';
        x: number;
        y: number;
        visible: boolean;
    } | null>(null);
    
    // Create refs for the SVG elements to use as drag images
    const placeRef = useRef<SVGSVGElement>(null);
    const transitionRef = useRef<SVGSVGElement>(null);
    
    // Track drag movement to update preview position
    useEffect(() => {
        const handleDragOver = (e: DragEvent) => {
            if (dragPreview) {
                e.preventDefault(); // Required for drag events
                
                // Get the canvas container element
                const canvasContainer = document.querySelector('.canvas-container');
                let isOverCanvas = false;
                
                if (canvasContainer) {
                    const rect = canvasContainer.getBoundingClientRect();
                    isOverCanvas = (
                        e.clientX >= rect.left &&
                        e.clientX <= rect.right &&
                        e.clientY >= rect.top &&
                        e.clientY <= rect.bottom
                    );
                }
                
                setDragPreview(prev => prev ? {
                    ...prev,
                    x: e.clientX,
                    y: e.clientY,
                    visible: !isOverCanvas
                } : null);
            }
        };

        if (dragPreview) {
            // Add dragover event listener to track position during drag
            document.addEventListener('dragover', handleDragOver, true);
            return () => document.removeEventListener('dragover', handleDragOver, true);
        }
    }, [dragPreview]);

    // Clear drag preview on drag end
    useEffect(() => {
        const handleDragEnd = () => {
            setDragPreview(null);
            setIsDragging(null);
        };

        const handleDrop = () => {
            setDragPreview(null);
            setIsDragging(null);
        };

        document.addEventListener('dragend', handleDragEnd, true);
        document.addEventListener('drop', handleDrop, true);
        return () => {
            document.removeEventListener('dragend', handleDragEnd, true);
            document.removeEventListener('drop', handleDrop, true);
        };
    }, []);
    
    const handleToolSelect = (tool: ToolbarProps['selectedTool']) => {
        setSelectedTool(tool);
        // If selecting Place or Transition, reset Arc type (optional UX choice)
        if (tool === 'PLACE' || tool === 'TRANSITION') {
            setArcType('REGULAR');
        }
    };

    return (
        <>
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
                            e.dataTransfer.effectAllowed = "move";
                            // Set global variable for Canvas to access
                            window.currentToolbarDragType = 'PLACE';
                            setSelectedTool('PLACE');
                            setIsDragging('PLACE');
                            
                            // Create transparent drag image
                            const dragImage = document.createElement('div');
                            dragImage.innerHTML = `<svg width="1" height="1"><rect width="1" height="1" fill="transparent"/></svg>`;
                            dragImage.style.position = 'absolute';
                            dragImage.style.top = '-1000px';
                            dragImage.style.opacity = '0';
                            document.body.appendChild(dragImage);
                            e.dataTransfer.setDragImage(dragImage, 0, 0);
                            setTimeout(() => {
                                if (document.body.contains(dragImage)) {
                                    document.body.removeChild(dragImage);
                                }
                            }, 0);
                            
                            // Start custom drag preview
                            setDragPreview({
                                type: 'PLACE',
                                x: e.clientX,
                                y: e.clientY,
                                visible: true
                            });
                        }}
                        onDragEnd={() => {
                            setIsDragging(null);
                            setDragPreview(null);
                            // Clear global variable
                            window.currentToolbarDragType = undefined;
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
                            e.dataTransfer.effectAllowed = "move";
                            // Set global variable for Canvas to access
                            window.currentToolbarDragType = 'TRANSITION';
                            setSelectedTool('TRANSITION');
                            setIsDragging('TRANSITION');
                            
                            // Create transparent drag image
                            const dragImage = document.createElement('div');
                            dragImage.innerHTML = `<svg width="1" height="1"><rect width="1" height="1" fill="transparent"/></svg>`;
                            dragImage.style.position = 'absolute';
                            dragImage.style.top = '-1000px';
                            dragImage.style.opacity = '0';
                            document.body.appendChild(dragImage);
                            e.dataTransfer.setDragImage(dragImage, 0, 0);
                            setTimeout(() => {
                                if (document.body.contains(dragImage)) {
                                    document.body.removeChild(dragImage);
                                }
                            }, 0);
                            
                            // Start custom drag preview
                            setDragPreview({
                                type: 'TRANSITION',
                                x: e.clientX,
                                y: e.clientY,
                                visible: true
                            });
                        }}
                        onDragEnd={() => {
                            setIsDragging(null);
                            setDragPreview(null);
                            // Clear global variable
                            window.currentToolbarDragType = undefined;
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
            
            {/* Custom drag preview */}
            {dragPreview && dragPreview.visible && (
                <div
                    style={{
                        position: 'fixed',
                        left: dragPreview.x - 40, // Center the 80px wide preview
                        top: dragPreview.y - 40,  // Center the 80px tall preview
                        pointerEvents: 'none',
                        zIndex: 10000,
                        opacity: 0.8
                    }}
                >
                    {dragPreview.type === 'PLACE' ? (
                        <svg width="80" height="80" viewBox="0 0 80 80">
                            <circle cx="40" cy="40" r="30" fill="#0f0f0f" stroke="#ffffff" strokeWidth="2" />
                            <text x="40" y="40" textAnchor="middle" dominantBaseline="central" 
                                  fill="white" fontSize="18" fontWeight="bold" fontFamily="sans-serif">0</text>
                        </svg>
                    ) : (
                        <svg width="80" height="80" viewBox="0 0 80 80">
                            <rect x="10" y="25" width="60" height="30" rx="8" fill="#0f0f0f" stroke="#ffffff" strokeWidth="2" />
                        </svg>
                    )}
                </div>
            )}
        </>
    );
};