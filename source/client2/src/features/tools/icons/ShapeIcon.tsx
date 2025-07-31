import React from 'react';

interface IconProps {
  size?: number;
  color?: string;
}

const ShapeIcon: React.FC<IconProps> = ({ size = 14, color = '#ffffff' }) => {
  const strokeWidth = Math.max(1, size / 14);

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect 
        x="6" 
        y="6" 
        width="12" 
        height="12" 
        stroke={color} 
        strokeWidth={strokeWidth}
        fill="none"
        transform="rotate(45 12 12)"
      />
    </svg>
  );
};

export default ShapeIcon; 