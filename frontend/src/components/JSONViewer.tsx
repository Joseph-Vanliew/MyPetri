import { PetriNetDTO } from '../types';
import { useRef } from 'react';

interface JSONViewerProps {
    data: PetriNetDTO;
    width?: string | number;
    height?: string | number;
}

// Function to format JSON and bold specific keys
const formatJSON = (jsonData: object) => {
    let jsonString = JSON.stringify(jsonData, null, 2);

    // Bold "places", "transitions", and "arcs"
    jsonString = jsonString.replace(/"places":/g, `"<strong>places</strong>":`);
    jsonString = jsonString.replace(/"transitions":/g, `"<strong>transitions</strong>":`);
    jsonString = jsonString.replace(/"arcs":/g, `"<strong>arcs</strong>":`);

    return jsonString;
};

export function JSONViewer({
                               data,
                               width = 400,
                               height = 600,
                           }: JSONViewerProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const placesRef = useRef<HTMLPreElement>(null);
    const transitionsRef = useRef<HTMLPreElement>(null);
    const arcsRef = useRef<HTMLPreElement>(null);

    const scrollToSection = (ref: React.RefObject<HTMLPreElement>) => {
        if (ref.current && containerRef.current) {
            ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    return (
        <div style={{ position: 'relative', width: typeof width === 'number' ? `${width}px` : width }}>
            {/* Scroll Buttons */}
            <div style={{
                position: 'absolute',
                top: '-48px',
                left: '0',
                display: 'flex',
                gap: '10px'
            }}>
                <span style={{fontWeight: 'bold', color: '#ddd'}}>Go To:</span>
                <button onClick={() => scrollToSection(placesRef)}>Places</button>
                <button onClick={() => scrollToSection(transitionsRef)}>Transitions</button>
                <button onClick={() => scrollToSection(arcsRef)}>Arcs</button>
            </div>

            {/* Scrollable JSON Viewer */}
            <div
                ref={containerRef}
                style={{
                    height: typeof height === 'number' ? `${height}px` : height,
                    backgroundColor: '#f9f9f9',
                    overflow: 'auto',
                    padding: '0.5rem',
                    borderRadius: '8px',
                    border: '1px solid #ddd',
                    position: 'relative',
                    marginTop: '0px'
                }}
            >
                <h3 style={{ margin: '0.5rem', color: '#000' }}>Petri Net:</h3>

                <pre ref={placesRef} style={{ color: '#000', margin: '0.5rem', whiteSpace: 'pre-wrap' }}>
                    <span dangerouslySetInnerHTML={{ __html: formatJSON({ places: data.places }) }} />
                </pre>

                <pre ref={transitionsRef} style={{ color: '#000', margin: '0.5rem', whiteSpace: 'pre-wrap' }}>
                    <span dangerouslySetInnerHTML={{ __html: formatJSON({ transitions: data.transitions }) }} />
                </pre>

                <pre ref={arcsRef} style={{ color: '#000', margin: '0.5rem', whiteSpace: 'pre-wrap' }}>
                    <span dangerouslySetInnerHTML={{ __html: formatJSON({ arcs: data.arcs }) }} />
                </pre>
            </div>
        </div>
    );
}