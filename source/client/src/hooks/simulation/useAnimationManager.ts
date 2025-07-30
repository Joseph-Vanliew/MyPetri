import { useCallback } from 'react';
import { UIPlace, UITransition, UIArc, ITokenAnimator, PetriNetDTO, PetriNetPageData } from '../../types';

export const useAnimationManager = (tokenAnimator: ITokenAnimator) => {
  
  // Shared animation logic for handling different arc types
  const animateArcs = useCallback((
    transition: UITransition,
    arcs: UIArc[],
    places: UIPlace[],
    options: {
      onOutputComplete?: () => void;
      onBidirectionalComplete?: () => void;
      getFinalTokens?: (placeId: string) => number;
      updateState?: (placeId: string, finalTokens: number) => void;
    } = {}
  ) => {
    const { onOutputComplete, onBidirectionalComplete, getFinalTokens, updateState } = options;

    // Handle input arcs (consumption) - same for both preview and production
    const inputArcs = arcs.filter(a => 
      a.outgoingId === transition.id && a.type !== 'INHIBITOR'
    );
    
    inputArcs.forEach(inputArc => {
      const sourcePlace = places.find(p => p.id === inputArc.incomingId);
      if (sourcePlace) {
        tokenAnimator.startAnimation(
          sourcePlace,
          transition,
          transition,
          arcs,
          () => {} // No callback needed for consumption
        );
      }
    });

    // Handle output arcs (production)
    const outputArcs = arcs.filter(a => 
      a.incomingId === transition.id
    );
    
    let completedAnimations = 0;
    const outputArcCount = outputArcs.length;

    outputArcs.forEach(outputArc => {
      const targetPlace = places.find(p => p.id === outputArc.outgoingId);
      if (targetPlace) {
        const finalTokens = getFinalTokens ? getFinalTokens(targetPlace.id) : targetPlace.tokens;
        
        tokenAnimator.startAnimation(
          transition,
          targetPlace,
          transition,
          arcs,
          () => {
            // Update state if provided
            if (updateState) {
              updateState(targetPlace.id, finalTokens);
            }
            
            // Check completion
            completedAnimations++;
            if (completedAnimations === outputArcCount && onOutputComplete) {
              onOutputComplete();
            }
          }
        );
      }
    });

    // Handle bidirectional arcs
    const bidirectionalArcs = arcs.filter(a =>
      (a.incomingId === transition.id || a.outgoingId === transition.id) && a.type === 'BIDIRECTIONAL'
    );

    bidirectionalArcs.forEach(bidirectionalArc => {
      const place = places.find(p => 
        p.id === bidirectionalArc.incomingId || p.id === bidirectionalArc.outgoingId
      );
      if (place) {
        const finalTokens = getFinalTokens ? getFinalTokens(place.id) : place.tokens;
        
        tokenAnimator.startBidirectionalAnimation(
          place,
          transition,
          arcs,
          () => {},
          () => {
            // Update state if provided
            if (updateState) {
              updateState(place.id, finalTokens);
            }
            
            // Call completion callback
            if (onBidirectionalComplete) {
              onBidirectionalComplete();
            }
          }
        );
      }
    });

    // If there are no output arcs, call completion immediately
    if (outputArcCount === 0 && bidirectionalArcs.length === 0 && onOutputComplete) {
      onOutputComplete();
    }
  }, [tokenAnimator]);

  // Preview version (no state updates)
  const startTransitionAnimations = useCallback((
    transition: UITransition,
    arcs: UIArc[],
    places: UIPlace[],
    onComplete?: () => void
  ) => {
    animateArcs(transition, arcs, places, {
      onOutputComplete: onComplete,
      onBidirectionalComplete: onComplete
    });
  }, [animateArcs]);

  // Production version (with state updates)
  const startFiredTransitionAnimations = useCallback((
    firedTransitions: Array<{ id: string; name?: string; x?: number; y?: number; width?: number; height?: number }>,
    pageData: { transitions: UITransition[]; arcs: UIArc[]; places: UIPlace[] },
    responseData: PetriNetDTO,
    setPages: React.Dispatch<React.SetStateAction<Record<string, PetriNetPageData>>>,
    activePageId: string
  ) => {
    firedTransitions.forEach(firedTransition => {
      // Find the transition object from the page data
      const transitionObj = pageData.transitions.find(t => t.id === firedTransition.id);
      if (!transitionObj) return;

      // Create state update function
      const updateState = (placeId: string, finalTokens: number) => {
        setPages(prevPages => {
          const currentPage = prevPages[activePageId];
          if (!currentPage) return prevPages;

          const updatedPlaces = currentPage.places.map(p => {
            if (p.id === placeId) {
              return { ...p, tokens: finalTokens };
            }
            return p;
          });

          return {
            ...prevPages,
            [activePageId]: {
              ...currentPage,
              places: updatedPlaces
            }
          };
        });
      };

      // Create final tokens getter from response data
      const getFinalTokens = (placeId: string) => {
        return responseData.places.find(rp => rp.id === placeId)?.tokens ?? 0;
      };

      // Use shared animation logic with state updates
      animateArcs(transitionObj, pageData.arcs, pageData.places, {
        getFinalTokens,
        updateState
      });
    });
  }, [animateArcs]);

  return { startTransitionAnimations, startFiredTransitionAnimations };
}; 