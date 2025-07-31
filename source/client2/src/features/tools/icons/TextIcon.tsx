import React from 'react';

interface IconProps {
  size?: number;
  color?: string;
}

const TextIcon: React.FC<IconProps> = ({ size = 14, color = '#ffffff' }) => {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <text 
        x="12" 
        y="16" 
        textAnchor="middle" 
        fill={color} 
        fontSize="12"
        fontFamily="Arial, sans-serif"
      >
        T
      </text>
    </svg>
  );
};

export default TextIcon; 