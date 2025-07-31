import React from 'react';

interface IconProps {
  size?: number;
  color?: string;
}

const ArcIcon: React.FC<IconProps> = ({ size = 14, color = '#ffffff' }) => {
  const strokeWidth = Math.max(1, size / 14);

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path 
        d="M 4,12 L 20,12" 
        stroke={color} 
        strokeWidth={strokeWidth}
        fill="none"
        markerEnd="url(#arrowhead)"
      />
      <defs>
        <marker 
          id="arrowhead" 
          markerWidth="6" 
          markerHeight="4" 
          refX="5" 
          refY="2" 
          orient="auto"
        >
          <polygon 
            points="0 0, 6 2, 0 4" 
            fill={color}
          />
        </marker>
      </defs>
    </svg>
  );
};

export default ArcIcon; 