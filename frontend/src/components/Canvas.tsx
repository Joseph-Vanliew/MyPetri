// src/components/Canvas.tsx
import { UIPlace, UITransition, UIArc } from '../types';

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
    // Helper to get element position by ID
    const getElementPosition = (id: string) => {
        const place = places.find(p => p.id === id);
        if (place) return { x: place.x, y: place.y };

        const transition = transitions.find(t => t.id === id);
        if (transition) return { x: transition.x, y: transition.y };

        return null;
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