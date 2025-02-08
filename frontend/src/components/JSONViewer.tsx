// src/components/JSONViewer.tsx
import { PetriNetDTO } from '../types';

interface JSONViewerProps {
    data: PetriNetDTO;
    width?: string | number;
    height?: string | number;
}

export function JSONViewer({
                               data,
                               width = 400,
                               height = 600,
                           }: JSONViewerProps) {
    return (
        <div
            style={{
                width: typeof width === 'number' ? `${width}px` : width,
                height: typeof height === 'number' ? `${height}px` : height,
                backgroundColor: '#f9f9f9',
                overflow: 'auto',
            }}
        >
            <h3 style={{ margin: '0.5rem', color: '#000' }}>Petri Net:</h3>
            <pre style={{ color: '#000', margin: '0.5rem' }}>
        {JSON.stringify(data, null, 2)}
      </pre>
        </div>
    );
}