import React from 'react';
import './SpeedControl.css';

interface SpeedControlProps {
    onChange: (multiplier: number) => void;
}

export const SpeedControl: React.FC<SpeedControlProps> = ({ onChange }) => {
    return (
        <div style={{
            position: 'absolute',
            top: '740px',
            left: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            color: 'white',
            textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
            fontWeight: 500
        }}>
            <span>Slow</span>
            <input
                type="range"
                min="0.2"
                max="3"
                step="0.01"
                defaultValue="1.5"
                onChange={(e) => {
                    const sliderValue = parseFloat(e.target.value);
                    const speedMultiplier = 3 - sliderValue;
                    onChange(speedMultiplier);
                }}
                className="speed-slider"
            />
            <span>Fast</span>
        </div>
    );
}; 