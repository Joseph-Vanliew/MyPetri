import { UIPlace, UITransition, UIArc } from '../types';

interface AnimationState {
    sourceId: string;
    targetId: string;
    arcPath: string;
    progress: number;
    startTime: number;
    duration: number;
    type: 'consume' | 'produce';  // Added to differentiate between consumption and production
    onComplete?: () => void;
}

// Helper functions from Arc component
function getElementAnchorPoint(element: UIPlace | UITransition, otherCenter: { x: number; y: number }) {
    const center = { x: element.x, y: element.y };

    if ('radius' in element) {
        return getCircleAnchorPoint(center, element.radius, otherCenter);
    } else if ('width' in element) {
        return getRectAnchorPoint(center, element.width, element.height, otherCenter);
    }
    return center;
}

function getCircleAnchorPoint(center: { x: number; y: number }, radius: number, target: { x: number; y: number }) {
    const dx = target.x - center.x;
    const dy = target.y - center.y;
    const angle = Math.atan2(dy, dx);
    return {
        x: center.x + radius * Math.cos(angle),
        y: center.y + radius * Math.sin(angle),
    };
}

function getRectAnchorPoint(center: { x: number; y: number }, width: number, height: number, target: { x: number; y: number }) {
    const dx = target.x - center.x;
    const dy = target.y - center.y;
    const halfWidth = width / 2;
    const halfHeight = height / 2;
    if (dx === 0 && dy === 0) return center;

    const scaleX = halfWidth / Math.abs(dx);
    const scaleY = halfHeight / Math.abs(dy);
    const scale = Math.min(scaleX, scaleY);
    return {
        x: center.x + dx * scale,
        y: center.y + dy * scale,
    };
}

// Custom easing function with gentler node transitions
function customNodeEasing(t: number): number {
    // Gentle transition at start (0-10% of animation)
    if (t < 0.1) {
        return t + (t * t) * 0.2;
    }
    // Gentle transition at end (90-100% of animation)
    if (t > 0.9) {
        const normalizedT = (t - 0.9) / 0.1;
        return 0.9 + (1 - (1 - normalizedT) * (1 - normalizedT)) * 0.1;
    }
    // Linear movement in the middle (10-90% of animation)
    return t;
}

function calculateDuration(pathLength: number): number {
    // Keep animation snappy but smooth
    const BASE_DURATION = 800;
    const DURATION_PER_LENGTH = 1.8;
    const MAX_DURATION = 2300;
    
    const duration = BASE_DURATION + (pathLength * DURATION_PER_LENGTH);
    return Math.min(duration, MAX_DURATION);
}

export class TokenAnimator {
    private animations: AnimationState[] = [];
    private animationFrameId: number | null = null;
    private static readonly TRANSITION_DELAY = 0;
    private lastFrameTime: number = 0;
    private readonly targetFrameTime: number = 1000 / 120; // Target 120fps

    constructor() {
        this.animate = this.animate.bind(this);
    }

    public startAnimation(
        sourcePlace: UIPlace,
        targetPlace: UIPlace,
        transition: UITransition,
        arcs: UIArc[],
        onComplete: () => void
    ) {
        // Find all input and output arcs for this transition
        const inputArcs = arcs.filter(arc => 
            arc.outgoingId === transition.id && 
            arc.type !== 'INHIBITOR'
        );
        const outputArcs = arcs.filter(arc => 
            arc.incomingId === transition.id
        );

        const now = performance.now();

        // Create consumption animations
        inputArcs.forEach(inputArc => {
            if (inputArc.incomingId === sourcePlace.id) {
                const consumePath = this.getDirectPath(sourcePlace, transition, inputArc, arcs);
                const pathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                pathElement.setAttribute('d', consumePath);
                const pathLength = pathElement.getTotalLength();
                
                this.animations.push({
                    sourceId: sourcePlace.id,
                    targetId: transition.id,
                    arcPath: consumePath,
                    progress: 0,
                    startTime: now,
                    duration: calculateDuration(pathLength),
                    type: 'consume'
                });
            }
        });

        // Create production animations
        if (outputArcs.length > 0) {
            outputArcs.forEach(outputArc => {
                if (outputArc.outgoingId === targetPlace.id) {
                    const producePath = this.getDirectPath(transition, targetPlace, outputArc, arcs);
                    const pathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                    pathElement.setAttribute('d', producePath);
                    const pathLength = pathElement.getTotalLength();

                    const consumeDuration = this.animations[this.animations.length - 1]?.duration || 0;
                    
                    this.animations.push({
                        sourceId: transition.id,
                        targetId: targetPlace.id,
                        arcPath: producePath,
                        progress: 0,
                        startTime: now + consumeDuration + TokenAnimator.TRANSITION_DELAY,
                        duration: calculateDuration(pathLength),
                        type: 'produce',
                        onComplete
                    });
                }
            });
        }

        if (!this.animationFrameId) {
            this.animationFrameId = requestAnimationFrame(this.animate);
        }

        // Calculate total animation duration for completion callback
        const lastAnim = this.animations[this.animations.length - 1];
        const totalDuration = lastAnim 
            ? (lastAnim.startTime - now) + lastAnim.duration + 100 // Add small buffer
            : 0;
        
        setTimeout(onComplete, totalDuration);
    }

    private animate(timestamp: number) {
        // Calculate time since last frame
        const deltaTime = timestamp - this.lastFrameTime;

        // Only update if enough time has passed for next frame at 120fps
        if (deltaTime >= this.targetFrameTime) {
            this.lastFrameTime = timestamp;

            let hasActiveAnimations = false;

            this.animations = this.animations.filter(anim => {
                if (timestamp < anim.startTime) {
                    hasActiveAnimations = true;
                    return true;
                }

                const elapsed = timestamp - anim.startTime;
                const rawProgress = Math.min(elapsed / anim.duration, 1);
                
                // Use more precise easing for smoother 120fps animation
                anim.progress = customNodeEasing(rawProgress);

                // Trigger completion callback at 85% of the animation
                if (rawProgress >= 0.85 && anim.type === 'produce' && anim.onComplete) {
                    anim.onComplete();
                    anim.onComplete = undefined;
                }

                if (rawProgress < 1) {
                    hasActiveAnimations = true;
                    return true;
                }

                return false;
            });

            if (!hasActiveAnimations) {
                this.animationFrameId = null;
                return;
            }
        }

        // Request next frame as soon as possible
        this.animationFrameId = requestAnimationFrame(this.animate);
    }

    private getDirectPath(
        source: UIPlace | UITransition,
        target: UIPlace | UITransition,
        currentArc: UIArc,
        allArcs: UIArc[]
    ): string {
        const sourceCenter = { x: source.x, y: source.y };
        const targetCenter = { x: target.x, y: target.y };

        // Calculate anchor points
        const sourceAnchor = getElementAnchorPoint(source, targetCenter);
        const targetAnchor = getElementAnchorPoint(target, sourceCenter);

        // Calculate direction vector
        const dx = targetAnchor.x - sourceAnchor.x;
        const dy = targetAnchor.y - sourceAnchor.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        
        if (length === 0) return '';

        const ndx = dx / length;
        const ndy = dy / length;

        // Calculate offset
        const OFFSET_AMOUNT = 18;
        let offset = 0;

        // Find parallel arcs
        const siblings = allArcs.filter(a => {
            const keyA = [a.incomingId, a.outgoingId].sort().join('-');
            const keyCurrent = [currentArc.incomingId, currentArc.outgoingId].sort().join('-');
            return keyA === keyCurrent;
        });

        const n = siblings.length;
        if (n > 1) {
            // Sort siblings by ID for consistent ordering
            siblings.sort((a, b) => a.id.localeCompare(b.id));
            const index = siblings.findIndex(a => a.id === currentArc.id);
            
            if (index !== -1) {
                const startFactor = -(n - 1) / 2.0;
                const factor = startFactor + index;
                offset = factor * OFFSET_AMOUNT;

                // Determine canonical direction and flip offset if necessary
                const sortedIds = [currentArc.incomingId, currentArc.outgoingId].sort();
                const canonicalSourceId = sortedIds[0];
                if (currentArc.incomingId !== canonicalSourceId) {
                    offset *= -1;
                }
            }
        }

        // Calculate perpendicular vector for offset
        const perpDx = -ndy;
        const perpDy = ndx;

        // Apply offset to anchor points
        let adjustedSourceX = sourceAnchor.x;
        let adjustedSourceY = sourceAnchor.y;
        let adjustedTargetX = targetAnchor.x;
        let adjustedTargetY = targetAnchor.y;

        if (offset !== 0) {
            adjustedSourceX += perpDx * offset;
            adjustedSourceY += perpDy * offset;
            adjustedTargetX += perpDx * offset;
            adjustedTargetY += perpDy * offset;
        }

        // Extend the path into the nodes for smoother animation
        const EXTENSION_FACTOR = 0.5; // How far into the node to extend (0.5 = halfway to center)
        
        // Extend source point towards source center
        const sourceExtensionX = sourceCenter.x - adjustedSourceX;
        const sourceExtensionY = sourceCenter.y - adjustedSourceY;
        adjustedSourceX += sourceExtensionX * EXTENSION_FACTOR;
        adjustedSourceY += sourceExtensionY * EXTENSION_FACTOR;

        // Extend target point towards target center
        const targetExtensionX = targetCenter.x - adjustedTargetX;
        const targetExtensionY = targetCenter.y - adjustedTargetY;
        adjustedTargetX += targetExtensionX * EXTENSION_FACTOR;
        adjustedTargetY += targetExtensionY * EXTENSION_FACTOR;

        // Use straight line path
        return `M ${adjustedSourceX},${adjustedSourceY} L ${adjustedTargetX},${adjustedTargetY}`;
    }

    public getAnimationState(): AnimationState[] {
        return this.animations;
    }

    public clear() {
        this.animations = [];
        if (this.animationFrameId !== null) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }
} 