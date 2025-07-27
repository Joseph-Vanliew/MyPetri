// Simulation-related types

export interface ITokenAnimator {
  hasActiveAnimations(): boolean;
  startAnimation(source: UIPlace | UITransition, target: UIPlace | UITransition, transition: UITransition, arcs: UIArc[], onComplete: () => void): void;
  startBidirectionalAnimation(place: UIPlace, transition: UITransition, arcs: UIArc[], onMidpointCallback: () => void, onCompleteCallback: () => void): void;
  clear(): void;
  completeCurrentAnimations(): void;
}

export interface UseSimulationProps {
  activePageId: string | null;
  activePageData: PetriNetPageData | null;
  setPages: React.Dispatch<React.SetStateAction<Record<string, PetriNetPageData>>>;
  setCurrentFiredTransitions: (transitions: string[]) => void;
  setProjectHasUnsavedChanges: (hasChanges: boolean) => void;
  setAnimationMessage: (message: string | null) => void;
  tokenAnimator: ITokenAnimator;
  handleUndo: () => void;
}

// Forward references to avoid circular dependencies
import type { UIPlace, UITransition, UIArc, PetriNetPageData } from './domain'; 