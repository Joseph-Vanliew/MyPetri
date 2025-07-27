import { useCallback } from 'react';
import { UIPlace, UITransition, UIArc, ITokenAnimator, PetriNetDTO, PetriNetPageData } from '../../types';

export const useAnimationManager = (tokenAnimator: ITokenAnimator) => {
  const startTransitionAnimations = useCallback((
    transition: UITransition,
    arcs: UIArc[],
    places: UIPlace[],
    onComplete?: () => void
  ) => {
    // Find input and output arcs for this transition
    const inputArcs = arcs.filter(a => 
      a.outgoingId === transition.id && a.type !== 'INHIBITOR'
    );
    const outputArcs = arcs.filter(a => 
      a.incomingId === transition.id
    );
    const bidirectionalArcs = arcs.filter(a =>
      (a.incomingId === transition.id || a.outgoingId === transition.id) && a.type === 'BIDIRECTIONAL'
    );

    // Handle input arcs (consumption)
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

    // Track if this is the last animation to complete
    const outputArcCount = outputArcs.length;
    let completedAnimations = 0;

    // Handle output arcs (production) separately
    outputArcs.forEach(outputArc => {
      const targetPlace = places.find(p => p.id === outputArc.outgoingId);
      if (targetPlace) {
        tokenAnimator.startAnimation(
          transition,
          targetPlace,
          transition,
          arcs,
          () => {
            // Check if all animations are complete
            completedAnimations++;
            if (completedAnimations === outputArcCount && onComplete) {
              onComplete();
            }
          }
        );
      }
    });

    // Handle bidirectional arcs consumption THEN production
    bidirectionalArcs.forEach(bidirectionalArc => {
      const place = places.find(p => 
        p.id === bidirectionalArc.incomingId || p.id === bidirectionalArc.outgoingId
      );
      if (place) {
        tokenAnimator.startBidirectionalAnimation(
          place,
          transition,
          arcs,
          () => {},
          () => {
            // Complete: restore final count
            if (onComplete) onComplete();
          }
        );
      }
    });

    // If there are no output arcs, call onComplete immediately
    if (outputArcCount === 0 && bidirectionalArcs.length === 0 && onComplete) {
      onComplete();
    }
  }, [tokenAnimator]);

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

      // Separate arcs by type for proper handling
      const regularInputArcs = pageData.arcs.filter(a => 
        a.outgoingId === firedTransition.id && a.type === 'REGULAR'
      );
      const regularOutputArcs = pageData.arcs.filter(a => 
        a.incomingId === firedTransition.id && a.type === 'REGULAR'
      );
      const bidirectionalArcs = pageData.arcs.filter(a =>
        (a.incomingId === firedTransition.id || a.outgoingId === firedTransition.id) && a.type === 'BIDIRECTIONAL'
      );

      // Handle regular input arcs (consumption only)
      regularInputArcs.forEach(inputArc => {
        const sourcePlace = pageData.places.find(p => p.id === inputArc.incomingId);
        if (sourcePlace) {
          tokenAnimator.startAnimation(
            sourcePlace,
            transitionObj,
            transitionObj,
            pageData.arcs,
            () => {} // No callback needed for consumption
          );
        }
      });

      // Handle regular output arcs (production only)
      regularOutputArcs.forEach(outputArc => {
        const targetPlace = pageData.places.find(p => p.id === outputArc.outgoingId);
        if (targetPlace) {
          // Capture the final token value from responseData
          const finalTokens = responseData.places.find(rp => rp.id === targetPlace.id)?.tokens ?? targetPlace.tokens;
          
          tokenAnimator.startAnimation(
            transitionObj,
            targetPlace,
            transitionObj,
            pageData.arcs,
            () => {
              // Update target place tokens after animation completes
              setPages(prevPages => {
                const currentPage = prevPages[activePageId];
                if (!currentPage) return prevPages;

                const updatedPlaces = currentPage.places.map(p => {
                  if (p.id === targetPlace.id) {
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
            }
          );
        }
      });

      // Handle bidirectional arcs (consumption THEN production)
      bidirectionalArcs.forEach(bidirectionalArc => {
        const place = pageData.places.find(p => 
          p.id === bidirectionalArc.incomingId || p.id === bidirectionalArc.outgoingId
        );
        if (place) {
          const finalTokens = responseData.places.find(rp => rp.id === place.id)?.tokens ?? place.tokens;
          
          tokenAnimator.startBidirectionalAnimation(
            place,
            transitionObj,
            pageData.arcs,
            () => {},
            () => {
              // Complete: restore final count
              setPages(prevPages => {
                const currentPage = prevPages[activePageId];
                if (!currentPage) return prevPages;
                const updatedPlaces = currentPage.places.map(p => {
                  if (p.id === place.id) {
                    return { ...p, tokens: finalTokens };
                  }
                  return p;
                });
                return {
                  ...prevPages,
                  [activePageId]: { ...currentPage, places: updatedPlaces }
                };
              });
            }
          );
        }
      });
    });
  }, [tokenAnimator]);

  return { startTransitionAnimations, startFiredTransitionAnimations };
}; 