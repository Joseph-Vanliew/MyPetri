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
            alignItems: 'center', 
            padding: '10px', 
            backgroundColor: '#1a1a1a', 
            borderBottom: '1px solid #333' 
        }}>
            <div className="elements-label" style={{ marginRight: '10px', fontWeight: 'bold' }}>
                Elements:
            </div>

            {/* Draggable "Place" */}
            <button
                className={selectedTool === 'PLACE' ? 'active' : ''}
                onClick={() => setSelectedTool('PLACE')}
                draggable
                onDragStart={(e) => {
                    // Store "PLACE" in dataTransfer
                    e.dataTransfer.setData('application/petri-item', 'PLACE');
                }}
            >
                Place
            </button>

            {/* Draggable "Transition" */}
            <button
                className={selectedTool === 'TRANSITION' ? 'active' : ''}
                onClick={() => setSelectedTool('TRANSITION')}
                draggable
                onDragStart={(e) => {
                    e.dataTransfer.setData('application/petri-item', 'TRANSITION');
                }}
            >
                Transition
            </button>

            <div className="arc-tools">
                <button
                    className={selectedTool === 'ARC' ? 'active' : ''}
                    onClick={() => setSelectedTool('ARC')}
                    draggable
                    onDragStart={(e) => {
                        // Store 'ARC' and the arc type in dataTransfer
                        e.dataTransfer.setData('application/petri-item', 'ARC');
                        e.dataTransfer.setData('application/petri-arctype', arcType);
                    }}
                >
                    Arc
                </button>
                {selectedTool === 'ARC' && (
                    <select
                        value={arcType}
                        onChange={(e) => setArcType(e.target.value as UIArc['type'])}
                    >
                        <option value="REGULAR">Regular</option>
                        <option value="INHIBITOR">Inhibitor</option>
                        <option value="BIDIRECTIONAL">Bidirectional</option>
                    </select>
                )}
            </div>
        </div>
    );
};