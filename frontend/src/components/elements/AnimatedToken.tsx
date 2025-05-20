import React from 'react';

interface AnimatedTokenProps {
    arcPath: string;
    progress: number;
    type: 'consume' | 'produce';
    isBackground: boolean;
    phase: 'source' | 'middle' | 'target';
}

export const AnimatedToken: React.FC<AnimatedTokenProps> = ({ arcPath, progress, type, phase }) => {
    // Get point along the path at current progress
    const getPointAtLength = (path: SVGPathElement, progress: number) => {
        const length = path.getTotalLength();
        const point = path.getPointAtLength(length * progress);
        return { x: point.x, y: point.y };
    };

    const pathRef = React.useRef<SVGPathElement>(null);
    const [position, setPosition] = React.useState({ x: 0, y: 0 });

    React.useEffect(() => {
        if (pathRef.current) {
            const point = getPointAtLength(pathRef.current, progress);
            setPosition(point);
        }
    }, [progress]);

    // Only render if it's a consume animation, or if it's a produce animation and progress has started
    if (type === 'produce' && progress === 0) {
        return null;
    }

    // Handle visibility based on animation phase
    if (phase === 'source') {
        // Only show when emerging from source (first 30% of animation)
        if (progress > 0.3) {
            return null;
        }
    } else if (phase === 'target') {
        // Only show when entering target (last 30% of animation)
        if (progress < 0.7) {
            return null;
        }
    } else { // middle phase
        // Only show in the middle section
        if (progress <= 0.3 || progress >= 0.7) {
            return null;
        }
    }

    return (
        <g>
            {/* Hidden path for calculation */}
            <path
                ref={pathRef}
                d={arcPath}
                style={{ visibility: 'hidden' }}
            />
            
            {/* token circle */}
            <circle
                cx={position.x}
                cy={position.y}
                r={10}
                fill="#ffffff"
                stroke="#ffffff"
                strokeWidth={1.5}
            />
        </g>
    );
}; 