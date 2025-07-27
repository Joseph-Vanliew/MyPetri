import { UIPlace, UITransition, UIArc, ITokenAnimator } from '../types';
import { getElementAnchorPoint } from '../components/canvas/utils/anchorPointUtils';

interface AnimationState {
    sourceId: string;
    targetId: string;
    arcPath: string;
    progress: number;
    startTime: number;
    duration: number;
    type: 'consume' | 'produce';
    onComplete?: () => void;
}

export class TokenAnimator implements ITokenAnimator {
    private animations: AnimationState[] = [];
    private animationFrameId: number | null = null;
    private static readonly TRANSITION_DELAY = 50;
    private consumptionAnimations: AnimationState[] = [];
    private productionAnimations: AnimationState[] = [];
    private allConsumptionsComplete: boolean = false;
    private speedMultiplier: number = 1.0; 

    constructor() {
        this.animate = this.animate.bind(this);
    }

    public hasActiveAnimations(): boolean {
        return this.animations.length > 0 || this.animationFrameId !== null;
    }

    public hasActiveProductionAnimations(): boolean {
        return this.productionAnimations.length > 0 && this.allConsumptionsComplete;
    }

    public setSpeedMultiplier(multiplier: number) {
        this.speedMultiplier = multiplier;
    }

    public startAnimation(
        source: UIPlace | UITransition,
        target: UIPlace | UITransition,
        transition: UITransition,
        arcs: UIArc[],
        onComplete: () => void
    ) {
        const now = performance.now();
        const BASE_DURATION = 800 * this.speedMultiplier;
        const DURATION_PER_LENGTH = 2.5 * this.speedMultiplier;
        const MIN_DURATION = BASE_DURATION;
        const MAX_DURATION = 2500 * this.speedMultiplier;

        // Calculate all paths and find the longest one
        let maxLength = 0;
        let consumePath = '';
        let producePath = '';

        if ('radius' in source) {
            const relevantArc = arcs.find(a => a.incomingId === source.id && a.outgoingId === transition.id);
            if (relevantArc) {
                consumePath = this.calculateArcPath(source, transition, relevantArc, arcs);
                const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                path.setAttribute('d', consumePath);
                maxLength = Math.max(maxLength, path.getTotalLength());
            }
        }

        if ('radius' in target) {
            const relevantArc = arcs.find(a => a.incomingId === transition.id && a.outgoingId === target.id);
            if (relevantArc) {
                producePath = this.calculateArcPath(transition, target, relevantArc, arcs);
                const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                path.setAttribute('d', producePath);
                maxLength = Math.max(maxLength, path.getTotalLength());
            }
        }

        // Calculate duration based on the longest path
        const duration = Math.min(Math.max(maxLength * DURATION_PER_LENGTH, MIN_DURATION), MAX_DURATION);

        // Add animations with the calculated duration
        if (consumePath) {
            this.consumptionAnimations.push({
                sourceId: source.id,
                targetId: transition.id,
                arcPath: consumePath,
                progress: 0,
                startTime: now,
                duration,
                type: 'consume'
            });
        }

        if (producePath) {
            this.productionAnimations.push({
                sourceId: transition.id,
                targetId: target.id,
                arcPath: producePath,
                progress: 0,
                startTime: now,
                duration,
                type: 'produce',
                onComplete
            });
        }

        this.animations = [...this.consumptionAnimations, ...this.productionAnimations];
        
        if (!this.animationFrameId) {
            this.allConsumptionsComplete = false;
            this.animationFrameId = requestAnimationFrame(this.animate);
        }
    }

    private calculateArcPath(source: UIPlace | UITransition, target: UIPlace | UITransition, currentArc: UIArc, allArcs: UIArc[]): string {
        const sourceAnchor = getElementAnchorPoint(source, { x: target.x, y: target.y });
        const targetAnchor = getElementAnchorPoint(target, { x: source.x, y: source.y });

        // Calculate offset using the same logic as Arc component
        const OFFSET_AMOUNT = 18;
        let offset = 0;

        const siblings = allArcs.filter(a => {
            const keyA = [a.incomingId, a.outgoingId].sort().join('-');
            const keyCurrent = [currentArc.incomingId, currentArc.outgoingId].sort().join('-');
            return keyA === keyCurrent;
        });

        if (siblings.length > 1) {
            siblings.sort((a, b) => a.id.localeCompare(b.id));
            const index = siblings.findIndex(a => a.id === currentArc.id);
            if (index !== -1) {
                const startFactor = -(siblings.length - 1) / 2.0;
                offset = (startFactor + index) * OFFSET_AMOUNT;
                
                // Determine canonical direction and flip offset if necessary
                const sortedIds = [currentArc.incomingId, currentArc.outgoingId].sort();
                const canonicalSourceId = sortedIds[0];
                if (currentArc.incomingId !== canonicalSourceId) {
                    offset *= -1;
                }
            }
        }

        const dx = targetAnchor.x - sourceAnchor.x;
        const dy = targetAnchor.y - sourceAnchor.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        
        const ndx = length > 0 ? dx / length : 0;
        const ndy = length > 0 ? dy / length : 0;
        const perpDx = -ndy;
        const perpDy = ndx;

        // Apply offset if needed
        if (offset !== 0 && length > 0) {
            sourceAnchor.x += perpDx * offset;
            sourceAnchor.y += perpDy * offset;
            targetAnchor.x += perpDx * offset;
            targetAnchor.y += perpDy * offset;
        }

        // Create path data
        const controlX = offset !== 0 ? (sourceAnchor.x + targetAnchor.x) / 2 + (perpDx * offset * 0.4) : null;
        const controlY = offset !== 0 ? (sourceAnchor.y + targetAnchor.y) / 2 + (perpDy * offset * 0.4) : null;

        return controlX !== null && controlY !== null
            ? `M ${sourceAnchor.x},${sourceAnchor.y} Q ${controlX},${controlY} ${targetAnchor.x},${targetAnchor.y}`
            : `M ${sourceAnchor.x},${sourceAnchor.y} L ${targetAnchor.x},${targetAnchor.y}`;
    }

    private animate(timestamp: number) {
        let hasActiveAnimations = false;

        // Process consumption animations
        if (!this.allConsumptionsComplete) {
            let allConsumesDone = true;
            this.consumptionAnimations = this.consumptionAnimations.filter(anim => {
                if (timestamp < anim.startTime) {
                    allConsumesDone = false;
                    hasActiveAnimations = true;
                    return true;
                }

                anim.progress = Math.min((timestamp - anim.startTime) / anim.duration, 1);

                if (anim.progress < 1) {
                    allConsumesDone = false;
                    hasActiveAnimations = true;
                    return true;
                }

                return false;
            });

            if (allConsumesDone && !this.allConsumptionsComplete) {
                this.allConsumptionsComplete = true;
                const startTime = timestamp + TokenAnimator.TRANSITION_DELAY;
                this.productionAnimations.forEach(anim => anim.startTime = startTime);
            }
        }

        // Process production animations
        if (this.allConsumptionsComplete) {
            this.productionAnimations = this.productionAnimations.filter(anim => {
                if (timestamp < anim.startTime) {
                    hasActiveAnimations = true;
                    return true;
                }

                anim.progress = Math.min((timestamp - anim.startTime) / anim.duration, 1);

                if (anim.progress >= 0.85 && anim.onComplete) {
                    anim.onComplete();
                    anim.onComplete = undefined;
                }

                if (anim.progress < 1) {
                    hasActiveAnimations = true;
                    return true;
                }

                return false;
            });
        }

        this.animations = [...this.consumptionAnimations, ...this.productionAnimations];

        if (!hasActiveAnimations) {
            this.animationFrameId = null;
            this.consumptionAnimations = [];
            this.productionAnimations = [];
            this.allConsumptionsComplete = false;
            return;
        }

        this.animationFrameId = requestAnimationFrame(this.animate);
    }

    public getAnimationState(): AnimationState[] {
        return this.animations;
    }

    public clear() {
        this.animations = [];
        this.consumptionAnimations = [];
        this.productionAnimations = [];
        this.allConsumptionsComplete = false;
        if (this.animationFrameId !== null) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    // Add this method to quickly complete current animations
    public completeCurrentAnimations(): void {
        if (!this.hasActiveAnimations()) {
            return;
        }
        
        // Complete all consumption animations
        this.consumptionAnimations.forEach(anim => {
            anim.progress = 1.0;
        });
        this.allConsumptionsComplete = true;
        
        // Complete all production animations (and trigger callbacks)
        this.productionAnimations.forEach(anim => {
            anim.progress = 1.0;
            if (anim.onComplete) {
                anim.onComplete();
                anim.onComplete = undefined;
            }
        });
        
        // Clear all animations
        this.animations = [];
        this.consumptionAnimations = [];
        this.productionAnimations = [];
        
        if (this.animationFrameId !== null) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    public startBidirectionalAnimation(
        place: UIPlace,
        transition: UITransition,
        arcs: UIArc[],
        onMidpointCallback: () => void,  // Called after consumption, before production
        onCompleteCallback: () => void   // Called after production
    ) {
        // Create two separate animations with proper timing
        const now = performance.now();
        const BASE_DURATION = 800 * this.speedMultiplier;
        
        // Find the bidirectional arc
        const bidirectionalArc = arcs.find(a => 
            ((a.incomingId === place.id && a.outgoingId === transition.id) ||
             (a.outgoingId === place.id && a.incomingId === transition.id)) && 
            a.type === 'BIDIRECTIONAL'
        );
        
        if (bidirectionalArc) {
            const consumePath = this.calculateArcPath(place, transition, bidirectionalArc, arcs);
            const producePath = this.calculateArcPath(transition, place, bidirectionalArc, arcs);
            
            // Add consumption animation
            this.consumptionAnimations.push({
                sourceId: place.id,
                targetId: transition.id,
                arcPath: consumePath,
                progress: 0,
                startTime: now,
                duration: BASE_DURATION,
                type: 'consume'
            });
            
            // Add production animation (starts after consumption + delay)
            this.productionAnimations.push({
                sourceId: transition.id,
                targetId: place.id,
                arcPath: producePath,
                progress: 0,
                startTime: now + BASE_DURATION + 50, // Start after consumption + small delay
                duration: BASE_DURATION,
                type: 'produce',
                onComplete: onCompleteCallback
            });
            
            this.animations = [...this.consumptionAnimations, ...this.productionAnimations];
            
            if (!this.animationFrameId) {
                this.allConsumptionsComplete = false;
                this.animationFrameId = requestAnimationFrame(this.animate);
            }
            
            // Call midpoint callback after consumption duration
            setTimeout(onMidpointCallback, BASE_DURATION);
        }
    }
} 