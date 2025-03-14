// src/components/Toolbar.tsx

import { UIArc } from '../types';

interface ToolbarProps {
    selectedTool: 'PLACE' | 'TRANSITION' | 'ARC'| 'NONE';
    setSelectedTool: (tool: 'PLACE' | 'TRANSITION' | 'ARC' | 'NONE') => void;
    arcType: UIArc['type'];
    setArcType: (type: UIArc['type']) => void;
}

export const Toolbar = ({
                            selectedTool,
                            setSelectedTool,
                            arcType,
                            setArcType,
                        }: ToolbarProps) => {
    return (
        <div className="toolbar" style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            padding: '10px', 
            backgroundColor: '#1a1a1a', 
            borderBottom: '1px solid #333',
            gap: '15px'
        }}>
            <div className="elements-label" style={{ marginBottom: '5px', fontWeight: 'bold' }}>
                Elements:
            </div>

            {/* Place Tool*/}
            <div 
                className={`toolbar-item ${selectedTool === 'PLACE' ? 'active' : ''}`}
                onClick={() => setSelectedTool('PLACE')}
                draggable
                onDragStart={(e) => {
                    e.dataTransfer.setData('application/petri-item', 'PLACE');
                }}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '8px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    backgroundColor: selectedTool === 'PLACE' ? '#333' : 'transparent',
                    border: selectedTool === 'PLACE' ? '1px solid #555' : '1px solid transparent'
                }}
            >
                <div style={{ width: '80px', height: '80px', position: 'relative', marginRight: '10px' }}>
                    <svg width="80" height="80" viewBox="0 0 80 80">
                        <circle 
                            cx="40" 
                            cy="40" 
                            r="30" 
                            fill="#0f0f0f" 
                            stroke="#ffffff" 
                            strokeWidth="2" 
                        />
                        <text 
                            x="40" 
                            y="44" 
                            textAnchor="middle" 
                            dominantBaseline="middle" 
                            fill="white" 
                            fontSize="24"
                            fontWeight="bold"
                        >
                            0
                        </text>
                    </svg>
                </div>
                <span style={{ fontSize: '16px' }}>Place</span>
            </div>

            {/* Transition Tool*/}
            <div 
                className={`toolbar-item ${selectedTool === 'TRANSITION' ? 'active' : ''}`}
                onClick={() => setSelectedTool('TRANSITION')}
                draggable
                onDragStart={(e) => {
                    e.dataTransfer.setData('application/petri-item', 'TRANSITION');
                }}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '8px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    backgroundColor: selectedTool === 'TRANSITION' ? '#333' : 'transparent',
                    border: selectedTool === 'TRANSITION' ? '1px solid #555' : '1px solid transparent'
                }}
            >
                <div style={{ width: '80px', height: '80px', position: 'relative', marginRight: '10px' }}>
                    <svg width="80" height="80" viewBox="0 0 80 80">
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

            {/* Arc Tool*/}
            <div 
                className={`toolbar-item ${selectedTool === 'ARC' ? 'active' : ''}`}
                onClick={() => setSelectedTool('ARC')}
                draggable
                onDragStart={(e) => {
                    e.dataTransfer.setData('application/petri-item', 'ARC');
                    e.dataTransfer.setData('application/petri-arctype', arcType);
                }}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '8px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    backgroundColor: selectedTool === 'ARC' ? '#333' : 'transparent',
                    border: selectedTool === 'ARC' ? '1px solid #555' : '1px solid transparent'
                }}
            >
                <div style={{ width: '80px', height: '80px', position: 'relative', marginRight: '10px' }}>
                    <svg width="80" height="80" viewBox="0 0 80 80">
                        {arcType === 'REGULAR' && (
                            <>
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
                            </>
                        )}
                        {arcType === 'INHIBITOR' && (
                            <>
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
                            </>
                        )}
                        {arcType === 'BIDIRECTIONAL' && (
                            <>
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
                            </>
                        )}
                    </svg>
                </div>
                <span style={{ fontSize: '16px' }}>Arc</span>
            </div>

            {/* Arc type selector */}
            {selectedTool === 'ARC' && (
                <div style={{ marginLeft: '10px', marginTop: '5px' }}>
                    <select
                        value={arcType}
                        onChange={(e) => setArcType(e.target.value as UIArc['type'])}
                        style={{
                            width: '100%',
                            padding: '8px',
                            backgroundColor: '#333',
                            color: 'white',
                            border: '1px solid #555',
                            borderRadius: '3px',
                            fontSize: '16px'
                        }}
                    >
                        <option value="REGULAR">Regular</option>
                        <option value="INHIBITOR">Inhibitor</option>
                        <option value="BIDIRECTIONAL">Bidirectional</option>
                    </select>
                </div>
            )}
        </div>
    );
};