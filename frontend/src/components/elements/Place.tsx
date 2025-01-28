// src/components/elements/Place.tsx
import type { UIPlace } from '../../types';

interface PlaceProps extends UIPlace {
    isSelected: boolean;
    onSelect: (id: string) => void;
    onUpdatePosition: (id: string, x: number, y: number) => void;
}

export const Place = ({
                          id,
                          x,
                          y,
                          tokens,
                          isSelected,
                          onSelect,
                          //onUpdatePosition
                      }: PlaceProps) => {
    return (
        <g
            transform={`translate(${x},${y})`}
            className="petri-element place"
            onClick={() => onSelect(id)}
        >
            <circle
                r="20"
                fill="#0f0f0f"
                stroke={isSelected ? "#ffffff" : "#ffffff"}
                strokeWidth="2"
            />
            <text
                x="0"
                y="5"
                textAnchor="middle"
                dominantBaseline="middle"
                className="token-count"
            >
                {tokens}
            </text>
        </g>
    );
};