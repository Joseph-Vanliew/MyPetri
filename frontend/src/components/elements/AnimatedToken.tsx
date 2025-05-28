import React from 'react';

interface AnimatedTokenProps {
    arcPath: string;
    progress: number;
    type: 'consume' | 'produce';
    isBackground: boolean;
}

export const AnimatedToken: React.FC<AnimatedTokenProps> = ({ arcPath, progress, type, isBackground }) => {
    const pathRef = React.useRef<SVGPathElement>(null);

    // Calculate position 
    const getPosition = () => {
        if (!pathRef.current) return null;
        
        try {
            const length = pathRef.current.getTotalLength();
            if (isNaN(length) || length === 0) return null;
            
            const point = pathRef.current.getPointAtLength(length * progress);
            return { x: point.x, y: point.y };
        } catch (error) {
            console.error("Error calculating token position:", error);
            return null;
        }
    };

    // Skip completely empty token 
    if (type === 'produce' && progress === 0) {
        return null;
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
            {pathRef.current && (
                <circle
                    cx={getPosition()?.x}
                    cy={getPosition()?.y}
                    r={10}
                    fill={isBackground ? "#f0f0f0" : "#ffffff"}
                    stroke={isBackground ? "#f0f0f0" : "#ffffff"}
                    strokeWidth={1.5}
                />
            )}
        </g>
    );
}; 