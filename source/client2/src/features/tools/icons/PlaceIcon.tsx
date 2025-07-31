import React from 'react';

interface IconProps {
  size?: number;
  color?: string;
}

const PlaceIcon: React.FC<IconProps> = ({ size = 14, color = '#ffffff' }) => {
  const strokeWidth = Math.max(1, size / 14);

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle 
        cx="12" 
        cy="12" 
        r="8" 
        stroke={color} 
        strokeWidth={strokeWidth}
        fill="none"
      />
    </svg>
  );
};

export default PlaceIcon; 