import { PetriNetDTO } from '../types';
import React, { useRef } from 'react';
import './styles/JSONViewer.css';

interface JSONViewerProps {
    data: PetriNetDTO;
    width?: string | number;
    height?: string | number;
    selectedElements?: string[];
    autoScrollEnabled?: boolean;
    onAutoScrollToggle?: (enabled: boolean) => void;
    currentMode?: string;
}

// Function to format JSON and highlight selected elements
const formatJSON = (jsonData: object, selectedElements: string[] = []) => {
    let jsonString = JSON.stringify(jsonData, (_, value) => {
        // Rounding numeric values to integers for better readability
        if (typeof value === 'number') {
            return Math.round(value);
        }
        return value;
    }, 2); // space parameter for indentation

    // Bold section headers
    jsonString = jsonString.replace(/"places":/g, `"<strong>places</strong>":`);
    jsonString = jsonString.replace(/"transitions":/g, `"<strong>transitions</strong>":`);
    jsonString = jsonString.replace(/"arcs":/g, `"<strong>arcs</strong>":`);

    // Bolding all property names but not their values
    jsonString = jsonString.replace(/"([^"]+)":/g, `"<strong>$1</strong>":`);

    // highlighting selected elements
    if (selectedElements.length > 0) {
        // parse JSON string into lines
        const lines = jsonString.split('\n');
        const highlightedLines: number[] = [];
        
        
        selectedElements.forEach(id => {
            // Find ID 
            const idLineIndex = lines.findIndex(line => line.includes(`"<strong>id</strong>": "${id}"`));
            
            if (idLineIndex >= 0) {
                // get the opening brace of the object
                let openBraceIndex = idLineIndex;
                while (openBraceIndex >= 0 && !lines[openBraceIndex].includes('{')) {
                    openBraceIndex--;
                }
                
                // Find the closing brace 
                let closeBraceIndex = idLineIndex;
                let braceCount = 0;
                
                // Count braces
                for (let i = openBraceIndex; i < lines.length; i++) {
                    const line = lines[i];
                    
                    // Count opening braces in this line
                    for (let j = 0; j < line.length; j++) {
                        if (line[j] === '{') braceCount++;
                        if (line[j] === '}') braceCount--;
                    }
                    
                    // matched brace count
                    if (braceCount === 0) {
                        closeBraceIndex = i;
                        break;
                    }
                }
                
                // Mark lines for highlighting
                for (let i = openBraceIndex; i <= closeBraceIndex; i++) {
                    highlightedLines.push(i);
                }
            }
        });
        
        // Wrap each line that needs highlighting in a span
        for (let i = 0; i < lines.length; i++) {
            if (highlightedLines.includes(i)) {
                lines[i] = `<span class="json-highlight">${lines[i]}</span>`;
            }
        }
        
        // Rejoin the lines
        jsonString = lines.join('\n');
    }

    return jsonString;
};

export function JSONViewer({
    data,
    width = 400,
    height = 600,
    selectedElements = [],
    autoScrollEnabled = true,
    onAutoScrollToggle,
    currentMode = '',
}: JSONViewerProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const placesRef = useRef<HTMLPreElement>(null);
    const transitionsRef = useRef<HTMLPreElement>(null);
    const arcsRef = useRef<HTMLPreElement>(null);
    const lastScrolledIdRef = useRef<string | null>(null);

    // Helper function to scroll to a specific section
    const scrollToSection = (ref: React.RefObject<HTMLElement>) => {
        if (ref.current) {
            ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    // Auto-scroll to selected element - improved version
    React.useEffect(() => {
        if (selectedElements.length === 0 || !autoScrollEnabled || currentMode === 'arc') {
            return;
        }

        const selectedId = selectedElements[0];
        
        // Skip if we've already scrolled to this element
        if (lastScrolledIdRef.current === selectedId) {
            return;
        }
        
        lastScrolledIdRef.current = selectedId;
        
        // Wait for the next render cycle to ensure highlighting is applied
        requestAnimationFrame(() => {
            if (!containerRef.current) return;
            
            // Find all highlighted spans
            const highlightedElements = containerRef.current.querySelectorAll('.json-highlight');
            let foundElement = false;
            
            // find and scroll to the specific element
            for (const element of Array.from(highlightedElements)) {
                if (element.innerHTML.includes(`"<strong>id</strong>": "${selectedId}"`)) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    foundElement = true;
                    break;
                }
            }
            
            // If we couldn't find the specific element, fall back to section scrolling
            if (!foundElement) {
                if (data.places.some(place => place.id === selectedId)) {
                    scrollToSection(placesRef);
                } else if (data.transitions.some(transition => transition.id === selectedId)) {
                    scrollToSection(transitionsRef);
                } else if (data.arcs.some(arc => arc.id === selectedId)) {
                    scrollToSection(arcsRef);
                }
            }
        });
    }, [selectedElements, data, autoScrollEnabled, currentMode]);

    const wrapperStyle = {
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
    };

    return (
        <div className="json-viewer-wrapper" style={wrapperStyle}>
            {/* Auto-scroll toggle */}
            <div className="json-auto-scroll">
                <input 
                    type="checkbox" 
                    id="auto-scroll-toggle" 
                    checked={autoScrollEnabled}
                    onChange={(e) => onAutoScrollToggle && onAutoScrollToggle(e.target.checked)}
                />
                <label htmlFor="auto-scroll-toggle">
                    Auto-scroll
                </label>
            </div>

            {/* Scrollable JSON Viewer */}
            <div
                ref={containerRef}
                className="json-viewer-container"
            >
                <h3 className="json-viewer-title">Petri Net:</h3>

                <pre ref={placesRef} className="json-viewer-content">
                    <span dangerouslySetInnerHTML={{ 
                        __html: formatJSON({ places: data.places }, selectedElements) 
                    }} />
                </pre>

                <pre ref={transitionsRef} className="json-viewer-content">
                    <span dangerouslySetInnerHTML={{ 
                        __html: formatJSON({ transitions: data.transitions }, selectedElements) 
                    }} />
                </pre>

                <pre ref={arcsRef} className="json-viewer-content">
                    <span dangerouslySetInnerHTML={{ 
                        __html: formatJSON({ arcs: data.arcs }, selectedElements) 
                    }} />
                </pre>
            </div>
        </div>
    );
}