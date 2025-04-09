import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { UIPlace, UITransition, UIArc, GRID_CELL_SIZE } from '../types';

// Define the props the hook will need
interface UseClipboardProps {
    places: UIPlace[];
    transitions: UITransition[];
    arcs: UIArc[];
    selectedElements: string[];
    setPlaces: React.Dispatch<React.SetStateAction<UIPlace[]>>;
    setTransitions: React.Dispatch<React.SetStateAction<UITransition[]>>;
    setArcs: React.Dispatch<React.SetStateAction<UIArc[]>>;
    setSelectedElements: React.Dispatch<React.SetStateAction<string[]>>;
    saveToHistory: () => void;
}

// Define the return type of the hook
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

    const [clipboard, setClipboard] = useState<{
        places: UIPlace[];
        transitions: UITransition[];
        arcs: UIArc[];
    } | null>(null);
    const [pasteCount, setPasteCount] = useState(0);

    const handleCopy = useCallback(() => {
        if (selectedElements.length === 0) return;

        const copiedPlaces = places.filter(p => selectedElements.includes(p.id));
        const copiedTransitions = transitions.filter(t => selectedElements.includes(t.id));
        const copiedArcs = arcs.filter(arc =>
            selectedElements.includes(arc.incomingId) && selectedElements.includes(arc.outgoingId)
        );

        if (copiedPlaces.length > 0 || copiedTransitions.length > 0) {
            setClipboard({
                places: JSON.parse(JSON.stringify(copiedPlaces)),
                transitions: JSON.parse(JSON.stringify(copiedTransitions)),
                arcs: JSON.parse(JSON.stringify(copiedArcs))
            });
            setPasteCount(0);
            console.log('Copied to clipboard:', { copiedPlaces, copiedTransitions, copiedArcs });
        } else {
            setClipboard(null);
            setPasteCount(0);
        }
    }, [selectedElements, places, transitions, arcs]);

    const handlePaste = useCallback(() => {
        if (!clipboard) return;

        saveToHistory();

        const currentPasteIndex = pasteCount + 1;
        const pasteOffsetAmount = GRID_CELL_SIZE * 1.3; // tune the offset when pasting multiple times in a row
        const currentOffsetX = currentPasteIndex * pasteOffsetAmount;
        const currentOffsetY = currentPasteIndex * pasteOffsetAmount;

        const idMapping: Record<string, string> = {};
        const newElements: string[] = [];

        const pastedPlaces = clipboard.places.map((p: UIPlace) => {
            const newId = `place_${uuidv4()}`;
            idMapping[p.id] = newId;
            newElements.push(newId);
            return { ...p, id: newId, x: p.x + currentOffsetX, y: p.y + currentOffsetY };
        });

        const pastedTransitions = clipboard.transitions.map((t: UITransition) => {
            const newId = `trans_${uuidv4()}`;
            idMapping[t.id] = newId;
            newElements.push(newId);
            return { ...t, id: newId, x: t.x + currentOffsetX, y: t.y + currentOffsetY, arcIds: [] };
        });

        const pastedArcs = clipboard.arcs.map((a: UIArc) => {
            const newId = `arc_${uuidv4()}`;
            idMapping[a.id] = newId;
            return {
                ...a,
                id: newId,
                incomingId: idMapping[a.incomingId],
                outgoingId: idMapping[a.outgoingId],
            };
        });

        pastedTransitions.forEach((transition: UITransition) => {
            const originalTransition = clipboard.transitions.find((t: UITransition) => idMapping[t.id] === transition.id);
            if (originalTransition) {
                transition.arcIds = originalTransition.arcIds
                    .map(oldArcId => idMapping[oldArcId])
                    .filter(newArcId => newArcId !== undefined);
            }
        });

        setPlaces(prev => [...prev, ...pastedPlaces]);
        setTransitions(prev => [...prev, ...pastedTransitions]);
        setArcs(prev => [...prev, ...pastedArcs]);
        setSelectedElements(newElements);

        setPasteCount(currentPasteIndex);

        console.log(`Pasted from clipboard (Paste #${currentPasteIndex}):`, { pastedPlaces, pastedTransitions, pastedArcs });

    }, [clipboard, pasteCount, saveToHistory, setPlaces, setTransitions, setArcs, setSelectedElements]);

    const clearClipboard = useCallback(() => {
        setClipboard(null);
        setPasteCount(0);
    }, []);

    return { handleCopy, handlePaste, clearClipboard };
} 