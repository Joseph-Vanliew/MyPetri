// src/components/Toolbar.tsx
import { UIArc } from '../types';

interface ToolbarProps {
    selectedTool: 'PLACE' | 'TRANSITION' | 'ARC';
    setSelectedTool: (tool: 'PLACE' | 'TRANSITION' | 'ARC') => void;
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
        <div className="toolbar">
            <button
                className={selectedTool === 'PLACE' ? 'active' : ''}
                onClick={() => setSelectedTool('PLACE')}
            >
                Place
            </button>

            <button
                className={selectedTool === 'TRANSITION' ? 'active' : ''}
                onClick={() => setSelectedTool('TRANSITION')}
            >
                Transition
            </button>

            <div className="arc-tools">
                <button
                    className={selectedTool === 'ARC' ? 'active' : ''}
                    onClick={() => setSelectedTool('ARC')}
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