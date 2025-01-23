// src/components/Canvas.tsx
import { UIPlace, UITransition, UIArc } from '../types';
import { GRID_CELL_SIZE } from '../types';

interface CanvasProps {
    places: UIPlace[];
    transitions: UITransition[];
    arcs: UIArc[];
    selectedElements: string[];
    onCanvasClick: (x: number, y: number) => void;
}

export const Canvas = ({
                           places,
                           transitions,
                           arcs,
                           selectedElements,
                           onCanvasClick,
                       }: CanvasProps) => {
    const getElementPosition = (id: string) => {
        const place = places.find(p => p.id === id);
        if (place) return { x: place.x, y: place.y };

        const transition = transitions.find(t => t.id === id);
        if (transition) return { x: transition.x, y: transition.y };

        return null;
    };

    const renderGrid = () => {
        const lines = [];
        const width = 800;
        const height = 600;

        // Vertical lines
        for (let x = 0; x <= width; x += GRID_CELL_SIZE) {
            lines.push(
                <line
                    key={`vline_${x}`}
                    x1={x}
                    y1={0}
                    x2={x}
                    y2={height}
                    stroke="#e0e0e0"
                    strokeWidth={1}
                />
            );
        }

        // Horizontal lines
        for (let y = 0; y <= height; y += GRID_CELL_SIZE) {
            lines.push(
                <line
                    key={`hline_${y}`}
                    x1={0}
                    y1={y}
                    x2={width}
                    y2={y}
                    stroke="#e0e0e0"
                    strokeWidth={1}
                />
            );
        }

        return lines;
    };

    return (
        <div
            className="canvas-container"
            onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                onCanvasClick(e.clientX - rect.left, e.clientY - rect.top);
            }}
        >
            <svg className="canvas-svg" width="800" height="600">
                {/* Grid System */}
                {renderGrid()}

                {/* Render Arcs */}
                {arcs.map(arc => {
                    const sourcePos = getElementPosition(arc.incomingId);
                    const targetPos = getElementPosition(arc.outgoingId);

                    if (!sourcePos || !targetPos) return null;

                    return (
                        <line
                            key={arc.id}
                            x1={sourcePos.x}
                            y1={sourcePos.y}
                            x2={targetPos.x}
                            y2={targetPos.y}
                            stroke={arc.type === 'INHIBITOR' ? '#ff0000' : '#000000'}
                            strokeWidth="2"
                            markerEnd={
                                arc.type === 'INHIBITOR' ? 'url(#inhibitor)' :
                                    arc.type === 'BIDIRECTIONAL' ? 'url(#bidirectional)' :
                                        'url(#arrow)'
                            }
                        />
                    );
                })}

                {/* SVG Markers */}
                <defs>
                    <marker
                        id="arrow"
                        viewBox="0 0 10 10"
                        refX="8"
                        refY="5"
                        markerWidth="6"
                        markerHeight="6"
                        orient="auto-start-reverse"
                    >
                        <path d="M 0 0 L 10 5 L 0 10 z" fill="#000" />
                    </marker>

                    <marker
                        id="inhibitor"
                        viewBox="0 0 10 10"
                        refX="8"
                        refY="5"
                        markerWidth="6"
                        markerHeight="6"
                    >
                        <circle cx="5" cy="5" r="4" fill="#ff0000" />
                    </marker>

                    <marker
                        id="bidirectional"
                        viewBox="0 0 10 10"
                        refX="8"
                        refY="5"
                        markerWidth="6"
                        markerHeight="6"
                        orient="auto-start-reverse"
                    >
                        <path d="M 0 0 L 10 5 L 0 10 z" fill="#000" />
                    </marker>
                </defs>
            </svg>

            {/* Render Places */}
            {places.map(place => (
                <div
                    key={place.id}
                    className={`place ${selectedElements.includes(place.id) ? 'selected' : ''}`}
                    style={{
                        left: place.x - 20,
                        top: place.y - 20,
                    }}
                >
                    <div className="tokens">{place.tokens}</div>
                </div>
            ))}

            {/* Render Transitions */}
            {transitions.map(transition => (
                <div
                    key={transition.id}
                    className={`transition ${transition.enabled ? 'enabled' : ''} ${
                        selectedElements.includes(transition.id) ? 'selected' : ''
                    }`}
                    style={{
                        left: transition.x - 30,
                        top: transition.y - 15,
                    }}
                />
            ))}
        </div>
    );
};