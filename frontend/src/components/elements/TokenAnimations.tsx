import React from 'react';
import { AnimatedToken } from './AnimatedToken';
import { TokenAnimator } from '../../animations/TokenAnimator';
import { UIPlace, UITransition, UIArc } from '../../types';

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

    // Subscribe to animation updates
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
                            r={place.radius + 2} // Slightly larger to ensure clean masking
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

                return (
                    <g key={`${anim.sourceId}-${anim.targetId}-${index}`}>
                        {/* Masked layer for source node */}
                        <g mask={`url(#node-mask-${sourceNode.id})`}>
                            <AnimatedToken
                                arcPath={anim.arcPath}
                                progress={anim.progress}
                                type={anim.type}
                                isBackground={true}
                                phase="source"
                            />
                        </g>

                        {/* Unmasked middle layer */}
                        <AnimatedToken
                            arcPath={anim.arcPath}
                            progress={anim.progress}
                            type={anim.type}
                            isBackground={false}
                            phase="middle"
                        />

                        {/* Masked layer for target node */}
                        <g mask={`url(#node-mask-${targetNode.id})`}>
                            <AnimatedToken
                                arcPath={anim.arcPath}
                                progress={anim.progress}
                                type={anim.type}
                                isBackground={true}
                                phase="target"
                            />
                        </g>
                    </g>
                );
            })}
        </>
    );
}; 