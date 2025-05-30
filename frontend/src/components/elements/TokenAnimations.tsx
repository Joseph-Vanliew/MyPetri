import React from 'react';
import { AnimatedToken } from './AnimatedToken';
import { TokenAnimator } from '../../animations/TokenAnimator';
import { UIPlace, UITransition, UIArc } from '../../types';

// Animation timing constants
const ANIMATION_CONSTANTS = {
    SOURCE_MASK_THRESHOLD: 0.4,   // When token exits source node (increased from 0.3)
    MAIN_PATH_START: 0.0,          // When token becomes visible on main path
    MAIN_PATH_END: 0.89,           // When token leaves main path
    TARGET_MASK_THRESHOLD: 0.6    // When token enters target node (decreased from 0.7)
} as const;

interface TokenAnimationsProps {
    places: UIPlace[];
    transitions: UITransition[];
    arcs: UIArc[];
    tokenAnimator: TokenAnimator;
}

export const TokenAnimations: React.FC<TokenAnimationsProps> = ({
    places,
    transitions,
    tokenAnimator
}) => {
    const [, forceUpdate] = React.useReducer(x => x + 1, 0);

    // Helper function to determine if a node is a place
    const isPlace = (node: UIPlace | UITransition): node is UIPlace => {
        return 'radius' in node;
    };

    // Subscribing to animation updates
    React.useEffect(() => {
        const frameCallback = () => {
            forceUpdate();
            requestAnimationFrame(frameCallback);
        };
        const frameId = requestAnimationFrame(frameCallback);
        return () => cancelAnimationFrame(frameId);
    }, []);

    // Render all active animations
    const animations = tokenAnimator.getAnimationState();
    
    return (
        <>
            {/* Define masks for nodes */}
            <defs>
                {places.map(place => (
                    <mask key={`mask-${place.id}`} id={`node-mask-${place.id}`}>
                        <rect x="-5000" y="-5000" width="10000" height="10000" fill="white"/>
                        <circle
                            cx={place.x}
                            cy={place.y}
                            r={place.radius + 2} 
                            fill="black"
                        />
                    </mask>
                ))}
                {transitions.map(transition => (
                    <mask key={`mask-${transition.id}`} id={`node-mask-${transition.id}`}>
                        <rect x="-5000" y="-5000" width="10000" height="10000" fill="white"/>
                        <rect
                            x={transition.x - transition.width / 2 - 2}
                            y={transition.y - transition.height / 2 - 2}
                            width={transition.width + 4}
                            height={transition.height + 4}
                            rx="8"
                            fill="black"
                        />
                    </mask>
                ))}
            </defs>

            {/* Render each animation */}
            {animations.map((anim, index) => {
                const sourceNode = [...places, ...transitions].find(node => node.id === anim.sourceId);
                const targetNode = [...places, ...transitions].find(node => node.id === anim.targetId);
                
                if (!sourceNode || !targetNode) return null;

                // Which parts of the animation to show based on progress
                const showSourceMask = anim.progress < ANIMATION_CONSTANTS.SOURCE_MASK_THRESHOLD;
                const showMainPath = anim.progress >= ANIMATION_CONSTANTS.MAIN_PATH_START && 
                                    anim.progress <= ANIMATION_CONSTANTS.MAIN_PATH_END;
                const showTargetMask = anim.progress > ANIMATION_CONSTANTS.TARGET_MASK_THRESHOLD;

                return (
                    <g key={`${anim.sourceId}-${anim.targetId}-${index}`}>
                        {/* Layer 1: Inside source node */}
                        {showSourceMask && (
                            <g mask={`url(#node-mask-${sourceNode.id})`}>
                                <AnimatedToken
                                    arcPath={anim.arcPath}
                                    progress={anim.progress}
                                    type={anim.type}
                                    isBackground={true}
                                />
                            </g>
                        )}

                        {/* Layer 2: Main path (outside nodes) */}
                        <g>
                            <defs>
                                <mask id={`path-mask-${index}`}>
                                    <rect x="-5000" y="-5000" width="10000" height="10000" fill="white"/>
                                    {showSourceMask && (
                                        isPlace(sourceNode) ? 
                                        <circle
                                            cx={sourceNode.x}
                                            cy={sourceNode.y}
                                            r={sourceNode.radius + 2}
                                            fill="black"
                                        /> :
                                        <rect
                                            x={sourceNode.x - sourceNode.width / 2 - 2}
                                            y={sourceNode.y - sourceNode.height / 2 - 2}
                                            width={sourceNode.width + 4}
                                            height={sourceNode.height + 4}
                                            rx="8"
                                            fill="black"
                                        />
                                    )}
                                    {showTargetMask && (
                                        isPlace(targetNode) ? 
                                        <circle
                                            cx={targetNode.x}
                                            cy={targetNode.y}
                                            r={targetNode.radius + 2}
                                            fill="black"
                                        /> :
                                        <rect
                                            x={targetNode.x - targetNode.width / 2 - 2}
                                            y={targetNode.y - targetNode.height / 2 - 2}
                                            width={targetNode.width + 4}
                                            height={targetNode.height + 4}
                                            rx="8"
                                            fill="black"
                                        />
                                    )}
                                </mask>
                            </defs>
                            {showMainPath && (
                                <g mask={`url(#path-mask-${index})`}>
                                    <AnimatedToken
                                        arcPath={anim.arcPath}
                                        progress={anim.progress}
                                        type={anim.type}
                                        isBackground={false}
                                    />
                                </g>
                            )}
                        </g>

                        {/* Layer 3: Inside target node */}
                        {showTargetMask && (
                            <g mask={`url(#node-mask-${targetNode.id})`}>
                                <AnimatedToken
                                    arcPath={anim.arcPath}
                                    progress={anim.progress}
                                    type={anim.type}
                                    isBackground={true}
                                />
                            </g>
                        )}
                    </g>
                );
            })}
        </>
    );
}; 