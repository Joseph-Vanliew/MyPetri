// src/components/Toolbar.tsx

import { UIArc } from '../types';
import { useState, useRef } from 'react';

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
                            showCapacityEditorMode,
                            onToggleCapacityEditorMode,
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
        <div className="toolbar" style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            padding: '10px', 
            backgroundColor: '#1a1a1a', 
            gap: '0px',
            overflow: 'hidden'
        }}>
            <div className="elements-label" style={{ marginBottom: '5px', fontWeight: 'bold' }}>
                Node Elements:
            </div>

            {/* Place button with hover effect and tooltip */}
            <div 
                className={`toolbar-item ${selectedTool === 'PLACE' || isDragging === 'PLACE' ? 'active' : ''}`}
                onClick={() => handleToolSelect('PLACE')}
                draggable
                onDragStart={(e) => {
                    // Set the data for transfer
                    e.dataTransfer.setData('application/petri-item', 'PLACE');
                    
                    // Set the selected tool to PLACE
                    setSelectedTool('PLACE');
                    setIsDragging('PLACE');
                    
                    // drag image
                    const dragImage = document.createElement('div');
                    dragImage.innerHTML = `
                        <svg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="30" cy="30" r="25" fill="#0f0f0f" stroke="#ffffff" stroke-width="2" />
                        </svg>
                    `;
                    document.body.appendChild(dragImage);
                    
                    // Position off-screen to hide it
                    dragImage.style.position = 'absolute';
                    dragImage.style.top = '-1000px';
                    
                    // Use the div as drag image
                    e.dataTransfer.setDragImage(dragImage, 30, 30);
                    
                    // Clean up
                    setTimeout(() => {
                        document.body.removeChild(dragImage);
                    }, 0);
                }}
                onDragEnd={() => {
                    // Reset dragging state when drag ends
                    setIsDragging(null);
                }}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '8px',
                    borderRadius: '4px 4px 0 0',
                    marginBottom: '-1px',
                    cursor: 'pointer',
                    backgroundColor: selectedTool === 'PLACE' || isDragging === 'PLACE' ? '#333' : 'transparent',
                    border: selectedTool === 'PLACE' || isDragging === 'PLACE' ? '1px solid #555' : '1px solid transparent',
                    borderBottom: 'none',
                    transition: 'background-color 0.2s ease',
                    zIndex: selectedTool === 'PLACE' || isDragging === 'PLACE' ? 1 : 'auto'
                }}
                onMouseOver={(e) => {
                    if (selectedTool !== 'PLACE' && isDragging !== 'PLACE') {
                        e.currentTarget.style.backgroundColor = '#2a2a2a';
                    }
                }}
                onMouseOut={(e) => {
                    if (selectedTool !== 'PLACE' && isDragging !== 'PLACE') {
                        e.currentTarget.style.backgroundColor = 'transparent';
                    }
                }}
                title="Add a Place (container for tokens)"
            >
                <div style={{ width: '80px', height: '80px', position: 'relative', marginRight: '10px' }}>
                    <svg 
                        ref={placeRef}
                        width="80" 
                        height="80" 
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
                <span style={{ fontSize: '16px' }}>Place</span>
            </div>

            {/* Transition button with hover effect and tooltip */}
            <div 
                className={`toolbar-item ${selectedTool === 'TRANSITION' || isDragging === 'TRANSITION' ? 'active' : ''}`}
                onClick={() => handleToolSelect('TRANSITION')}
                draggable
                onDragStart={(e) => {
                    // Set the data for transfer
                    e.dataTransfer.setData('application/petri-item', 'TRANSITION');
                    
                    // Setting the selected tool to TRANSITION
                    setSelectedTool('TRANSITION');
                    setIsDragging('TRANSITION');
                    
                    // drag image
                    const dragImage = document.createElement('div');
                    dragImage.innerHTML = `
                        <svg width="60" height="30" viewBox="0 0 60 30" xmlns="http://www.w3.org/2000/svg">
                            <rect x="0" y="0" width="60" height="30" rx="4" fill="#0f0f0f" stroke="#ffffff" stroke-width="2" />
                        </svg>
                    `;
                    document.body.appendChild(dragImage);
                    
                    // Position off-screen to hide it
                    dragImage.style.position = 'absolute';
                    dragImage.style.top = '-1000px';
                    
                    // Using the div as drag image
                    e.dataTransfer.setDragImage(dragImage, 30, 15);
                    
                    // Clean up 
                    setTimeout(() => {
                        document.body.removeChild(dragImage);
                    }, 0);
                }}
                onDragEnd={() => {
                    // Reset dragging state when drag ends
                    setIsDragging(null);
                }}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '8px',
                    borderRadius: '0 0 4px 4px',
                    cursor: 'pointer',
                    backgroundColor: selectedTool === 'TRANSITION' || isDragging === 'TRANSITION' ? '#333' : 'transparent',
                    border: selectedTool === 'TRANSITION' || isDragging === 'TRANSITION' ? '1px solid #555' : '1px solid transparent',
                    transition: 'background-color 0.2s ease',
                    zIndex: selectedTool === 'TRANSITION' || isDragging === 'TRANSITION' ? 1 : 'auto'
                }}
                onMouseOver={(e) => {
                    if (selectedTool !== 'TRANSITION' && isDragging !== 'TRANSITION') {
                        e.currentTarget.style.backgroundColor = '#2a2a2a';
                    }
                }}
                onMouseOut={(e) => {
                    if (selectedTool !== 'TRANSITION' && isDragging !== 'TRANSITION') {
                        e.currentTarget.style.backgroundColor = 'transparent';
                    }
                }}
                title="Add a Transition (action that consumes and produces tokens)"
            >
                <div style={{ width: '80px', height: '80px', position: 'relative', marginRight: '10px' }}>
                    <svg 
                        ref={transitionRef}
                        width="80" 
                        height="80" 
                        viewBox="0 0 80 80"
                    >
                        <rect 
                            x="10" 
                            y="25" 
                            width="60" 
                            height="30" 
                            rx="6" 
                            fill="#0f0f0f" 
                            stroke="#ffffff" 
                            strokeWidth="2" 
                        />
                    </svg>
                </div>
                <span style={{ fontSize: '16px' }}>Transition</span>
            </div>

            {/* Arc section with integrated type selection and guidance */}
            <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '10px',
                padding: '8px',
                borderRadius: '4px',
                backgroundColor: selectedTool === 'ARC' ? '#333' : 'transparent',
                border: selectedTool === 'ARC' ? '1px solid #555' : '1px solid transparent',
                transition: 'background-color 0.2s ease',
                marginTop: '15px'
            }}>
                {/* Arcs label */}
                <div style={{ fontWeight: 'bold', marginBottom: '2px', fontSize: '14px' }}>
                    Arcs:
                </div>
                
                {/* Arc type buttons */}
                <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    width: '100%'
                }}>
                    {/* Regular Arc */}
                    <div 
                        onClick={() => {
                            setArcType('REGULAR');
                            setSelectedTool('ARC');
                        }}
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            padding: '4px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            backgroundColor: selectedTool === 'ARC' && arcType === 'REGULAR' ? '#444' : 'transparent',
                            border: selectedTool === 'ARC' && arcType === 'REGULAR' ? '1px solid #666' : '1px solid transparent',
                            transition: 'background-color 0.2s ease',
                            width: '48px'
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.backgroundColor = '#2a2a2a';
                        }}
                        onMouseOut={(e) => {
                            if (!(selectedTool === 'ARC' && arcType === 'REGULAR')) {
                                e.currentTarget.style.backgroundColor = 'transparent';
                            }
                        }}
                        title="Regular Arc: Connects Places to Transitions or Transitions to Places"
                    >
                        <svg width="36" height="36" viewBox="0 0 80 80">
                            <line 
                                x1="10" 
                                y1="40" 
                                x2="60" 
                                y2="40" 
                                stroke="#ddd" 
                                strokeWidth="4" 
                            />
                            <polygon 
                                points="60,30 70,40 60,50" 
                                fill="#ddd" 
                                stroke="#ddd" 
                            />
                        </svg>
                        <span style={{ fontSize: '11px' }}>Regular</span>
                    </div>
                    
                    {/* Inhibitor Arc */}
                    <div 
                        onClick={() => {
                            setArcType('INHIBITOR');
                            setSelectedTool('ARC');
                        }}
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            padding: '4px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            backgroundColor: selectedTool === 'ARC' && arcType === 'INHIBITOR' ? '#444' : 'transparent',
                            border: selectedTool === 'ARC' && arcType === 'INHIBITOR' ? '1px solid #666' : '1px solid transparent',
                            transition: 'background-color 0.2s ease',
                            width: '48px'
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.backgroundColor = '#2a2a2a';
                        }}
                        onMouseOut={(e) => {
                            if (!(selectedTool === 'ARC' && arcType === 'INHIBITOR')) {
                                e.currentTarget.style.backgroundColor = 'transparent';
                            }
                        }}
                        title="Inhibitor Arc: Prevents transition from firing when place has tokens"
                    >
                        <svg width="36" height="36" viewBox="0 0 80 80">
                            <line 
                                x1="10" 
                                y1="40" 
                                x2="60" 
                                y2="40" 
                                stroke="#ddd" 
                                strokeWidth="4" 
                            />
                            <circle 
                                cx="60" 
                                cy="40" 
                                r="10" 
                                fill="#ff3333" 
                                stroke="#ddd" 
                                strokeWidth="3" 
                            />
                        </svg>
                        <span style={{ fontSize: '11px' }}>Inhibitor</span>
                    </div>
                    
                    {/* Bidirectional Arc */}
                    <div 
                        onClick={() => {
                            setArcType('BIDIRECTIONAL');
                            setSelectedTool('ARC');
                        }}
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            padding: '4px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            backgroundColor: selectedTool === 'ARC' && arcType === 'BIDIRECTIONAL' ? '#444' : 'transparent',
                            border: selectedTool === 'ARC' && arcType === 'BIDIRECTIONAL' ? '1px solid #666' : '1px solid transparent',
                            transition: 'background-color 0.2s ease',
                            width: '54px'
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.backgroundColor = '#2a2a2a';
                        }}
                        onMouseOut={(e) => {
                            if (!(selectedTool === 'ARC' && arcType === 'BIDIRECTIONAL')) {
                                e.currentTarget.style.backgroundColor = 'transparent';
                            }
                        }}
                        title="Bidirectional Arc: Works in both directions between Places and Transitions"
                    >
                        <svg width="36" height="36" viewBox="0 0 80 80">
                            <line 
                                x1="10" 
                                y1="40" 
                                x2="60" 
                                y2="40" 
                                stroke="#ddd" 
                                strokeWidth="4" 
                            />
                            <polygon 
                                points="60,30 70,40 60,50" 
                                fill="#ddd" 
                                stroke="#ddd" 
                            />
                            <polygon 
                                points="20,30 10,40 20,50" 
                                fill="#ddd" 
                                stroke="#ddd" 
                            />
                        </svg>
                        <span style={{ fontSize: '11px', whiteSpace: 'nowrap' }}>Bi-direct</span>
                    </div>
                </div>
                
                {/* Connection guidance */}
                {selectedTool === 'ARC' && (
                    <div style={{ 
                        fontSize: '12px', 
                        backgroundColor: '#222', 
                        padding: '6px', 
                        borderRadius: '3px',
                        marginTop: '5px'
                    }}>
                        {arcType === 'INHIBITOR' ? (
                            <div>
                                <div style={{ fontWeight: 'bold', marginBottom: '3px' }}>Inhibitor Arc</div>
                                <div>
                                    <span style={{ color: '#4299e1' }}>Place</span> → <span style={{ color: '#f56565' }}>Transition</span> only
                                </div>
                                <div style={{ fontSize: '11px', color: '#a0aec0', marginTop: '3px' }}>
                                    Prevents firing when place has tokens
                                </div>
                            </div>
                        ) : arcType === 'BIDIRECTIONAL' ? (
                            <div>
                                <div style={{ fontWeight: 'bold', marginBottom: '3px' }}>
                                    Bidirectional Arc
                                </div>
                                <div>
                                    <span style={{ color: '#4299e1' }}>Place</span> ↔ <span style={{ color: '#f56565' }}>Transition</span>
                                </div>
                            </div>
                        ) : (
                            <div>
                                <div style={{ fontWeight: 'bold', marginBottom: '3px' }}>
                                    Regular Arc
                                </div>
                                <div style={{ marginBottom: '2px' }}>
                                    <span style={{ color: '#4299e1' }}>Place</span> → <span style={{ color: '#f56565' }}>Transition</span>
                                </div>
                                <div>
                                    <span style={{ color: '#f56565' }}>Transition</span> → <span style={{ color: '#4299e1' }}>Place</span>
                                </div>
                            </div>
                        )}
                        <div style={{ fontSize: '11px', fontStyle: 'italic', marginTop: '5px' }}>
                            Click source, then target
                        </div>
                    </div>
                )}
            </div>

            {/* NEW Global Bounded Mode Toggle - Using Custom Switch */} 
            <div 
                style={{ display: 'flex', alignItems: 'center', marginTop: '15px' }}
                title="Toggle visibility of place capacity editors"
            >
                <label className="switch-container" htmlFor="capacity-mode-toggle" style={{ marginRight: '8px' }}>
                    <input
                        type="checkbox"
                        id="capacity-mode-toggle"
                        checked={showCapacityEditorMode}
                        onChange={(e) => onToggleCapacityEditorMode(e.target.checked)}
                        style={{ opacity: 0, width: 0, height: 0 }} // Hide original checkbox
                    />
                    <span className="switch-slider round"></span>
                </label>
                <span 
                    style={{ cursor: 'pointer' }} 
                    onClick={() => onToggleCapacityEditorMode(!showCapacityEditorMode)}
                >
                    Show Bounding
                </span>
            </div>
        </div>
    );
};