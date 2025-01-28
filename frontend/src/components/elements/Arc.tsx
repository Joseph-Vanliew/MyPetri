// src/components/elements/Arc.tsx
import type { UIArc } from '../../types';
//import { v4 as uuidv4 } from 'uuid';

interface ArcProps extends UIArc {
    sourcePos: { x: number; y: number };
    targetPos: { x: number; y: number };
}

export const Arc = ({
                        //id,
                        type,
                        sourcePos,
                        targetPos
                    }: ArcProps) => {
    return (
        <line
            x1={sourcePos.x}
            y1={sourcePos.y}
            x2={targetPos.x}
            y2={targetPos.y}
            stroke={type === 'INHIBITOR' ? '#ff0000' : '#000'}
            strokeWidth="2"
            markerEnd={
                type === 'INHIBITOR' ? 'url(#inhibitor)' :
                    type === 'BIDIRECTIONAL' ? 'url(#bidirectional)' :
                        'url(#arrow)'
            }
        />
    );
};