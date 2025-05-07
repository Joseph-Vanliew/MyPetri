import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { UIPlace, UITransition, UIArc } from '../types';

// Define structure for clipboard data
interface ClipboardData {
    type: 'petriNetElements'; 
    places: UIPlace[];
    transitions: UITransition[];
    arcs: UIArc[];
}

// Export prop type if App.tsx imports it
export interface UseClipboardProps {
    places: UIPlace[];
    transitions: UITransition[];
    arcs: UIArc[];
    selectedElements: string[];
    // selectionBounds prop removed based on rejection
    setPlaces: React.Dispatch<React.SetStateAction<UIPlace[]>>;
    setTransitions: React.Dispatch<React.SetStateAction<UITransition[]>>;
    setArcs: React.Dispatch<React.SetStateAction<UIArc[]>>;
    setSelectedElements: React.Dispatch<React.SetStateAction<string[]>>;
    saveToHistory: () => void;
}

interface UseClipboardReturn {
    handleCopy: () => void;
    handlePaste: () => void;
    clearClipboard: () => void;
}

export function useClipboard({
    places,
    transitions,
    arcs,
    selectedElements,
    setPlaces,
    setTransitions,
    setArcs,
    setSelectedElements,
    saveToHistory,
}: UseClipboardProps): UseClipboardReturn {

    // State to track consecutive pastes of the SAME content
    const [pasteCount, setPasteCount] = useState(0);
    // State to store the content processed by the LAST paste
    const [lastPastedContent, setLastPastedContent] = useState<ClipboardData | null>(null);

    const handleCopy = useCallback(async () => {
        if (selectedElements.length === 0) return;

        const copiedPlaces = places.filter(p => selectedElements.includes(p.id));
        const copiedTransitions = transitions.filter(t => selectedElements.includes(t.id));
        const selectedSet = new Set(selectedElements);
        const copiedArcs = arcs.filter(arc =>
            selectedSet.has(arc.incomingId) && selectedSet.has(arc.outgoingId)
        );

        if (copiedPlaces.length > 0 || copiedTransitions.length > 0) {
            const clipboardData: ClipboardData = {
                type: 'petriNetElements',
                places: JSON.parse(JSON.stringify(copiedPlaces)),
                transitions: JSON.parse(JSON.stringify(copiedTransitions)),
                arcs: JSON.parse(JSON.stringify(copiedArcs))
            };
            try {
                await navigator.clipboard.writeText(JSON.stringify(clipboardData, null, 2));
                setPasteCount(0); 
                setLastPastedContent(null); 
            } catch (err) {
                 console.error('Failed to copy to system clipboard:', err);
            }
        } else {
             setPasteCount(0);
             setLastPastedContent(null);
        }
    }, [selectedElements, places, transitions, arcs]);

    const handlePaste = useCallback(async () => {
        try {
            const clipboardText = await navigator.clipboard.readText();
            if (!clipboardText) return;
            const parsedData = JSON.parse(clipboardText);

            if (parsedData?.type !== 'petriNetElements' || !parsedData.places || !parsedData.transitions || !parsedData.arcs) {
                console.warn("Clipboard data is not valid Petri net elements.");
                return;
            }
            const clipboardContent = parsedData as ClipboardData;
            if (clipboardContent.places.length === 0 && clipboardContent.transitions.length === 0) {
                return; 
            }
            
            saveToHistory(); 

            // Determine if this is a subsequent paste of the same content
            const isSubsequentPaste = lastPastedContent !== null && 
                                      JSON.stringify(clipboardContent) === JSON.stringify(lastPastedContent);

            const currentPasteIndex = isSubsequentPaste ? pasteCount + 1 : 1;
            
            const pasteOffsetAmount = 30; 
            const currentOffsetX = currentPasteIndex * pasteOffsetAmount;
            const currentOffsetY = currentPasteIndex * pasteOffsetAmount;

            const idMapping: Record<string, string> = {};
            const newElementIds: string[] = [];

            const pastedPlaces = clipboardContent.places.map((p: UIPlace) => {
                const newId = `place_${uuidv4()}`;
                idMapping[p.id] = newId;
                newElementIds.push(newId);
                return { 
                    ...p, id: newId, 
                    x: (p.x ?? 100) + currentOffsetX, 
                    y: (p.y ?? 100) + currentOffsetY 
                };
            });

            const pastedTransitionsData = clipboardContent.transitions.map((t: UITransition) => {
                const newId = `trans_${uuidv4()}`;
                idMapping[t.id] = newId;
                newElementIds.push(newId);
                return { 
                    ...t, id: newId, 
                    x: (t.x ?? 200) + currentOffsetX, 
                    y: (t.y ?? 200) + currentOffsetY, 
                    arcIds: [] 
                };
            });

            const pastedArcs = clipboardContent.arcs
                .map((a: UIArc): UIArc | null => {
                    const newId = `arc_${uuidv4()}`;
                    const newIncomingId = idMapping[a.incomingId];
                    const newOutgoingId = idMapping[a.outgoingId];
                    if (newIncomingId && newOutgoingId) {
                        return { ...a, id: newId, incomingId: newIncomingId, outgoingId: newOutgoingId };
                    }
                    return null;
                 })
                .filter((arc): arc is UIArc => arc !== null);

            const pastedTransitions = pastedTransitionsData.map(transition => {
                 const originalTransition = clipboardContent.transitions.find(t => idMapping[t.id] === transition.id);
                 let newArcIds: string[] = [];
                 if (originalTransition) {
                    const successfullyPastedArcIds = new Set(pastedArcs.map(a => a.id));
                    newArcIds = originalTransition.arcIds
                        .map(oldArcId => idMapping[oldArcId]) 
                        .filter((newArcId): newArcId is string => 
                            newArcId !== undefined && successfullyPastedArcIds.has(newArcId)
                        );
                 }
                 return { ...transition, arcIds: newArcIds };
            });

            setPlaces(prev => [...prev, ...pastedPlaces]);
            setTransitions(prev => [...prev, ...pastedTransitions]);
            setArcs(prev => [...prev, ...pastedArcs]);
            setSelectedElements(newElementIds);

            // Update paste tracking state
            setLastPastedContent(clipboardContent); 
            setPasteCount(currentPasteIndex); 

        } catch (err) {
            console.error('Paste error:', err);
            setPasteCount(0);
            setLastPastedContent(null);
        }
    }, [pasteCount, lastPastedContent, saveToHistory, setPlaces, setTransitions, setArcs, setSelectedElements]); 

    const clearClipboard = useCallback(async () => {
        // Reset internal tracking state
        setPasteCount(0);
        setLastPastedContent(null);
        // Optional: Clear system clipboard
        // try { await navigator.clipboard.writeText(''); } catch (err) {} 
    }, []);

    return { handleCopy, handlePaste, clearClipboard };
} 