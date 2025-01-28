// src/components/elements/Transition.tsx
import type { UITransition } from '../../types';

interface TransitionProps extends UITransition {
    isSelected: boolean;
    onSelect: (id: string) => void;
    onUpdatePosition: (id: string, x: number, y: number) => void;
}

export const Transition = ({
                               id,
                               x,
                               y,
                               enabled,
                               isSelected,
                               onSelect,
                              // onUpdatePosition
                           }: TransitionProps) => {
    return (
        <g
            transform={`translate(${x},${y})`}
            className="petri-element transition"
            onClick={() => onSelect(id)}
        >
            <rect
                width="60"
                height="30"
                x="-30"
                y="-15"
                rx="4"
                fill={enabled ? "#90EE90" : "#FFA07A"}
                stroke={isSelected ? "#0d6efd" : "#CD5C5C"}
                strokeWidth="2"
            />
        </g>
    );
};