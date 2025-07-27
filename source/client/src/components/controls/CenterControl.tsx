import React from 'react';

interface CenterControlProps {
    onCenter: () => void;
}

export const CenterControl: React.FC<CenterControlProps> = ({ onCenter }) => {
    return (
        <button
            onClick={onCenter}
            style={{
                padding: '8px 12px',
                backgroundColor: '#4a4a4a',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                position: 'absolute',
                top: '20px',
                left: '20px',
                fontSize: '14px',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
            }}
        >
            <svg 
                width="16" 
                height="16" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2"
            >
                <path d="M21 12H3M12 3v18" />
            </svg>
            Center
        </button>
    );
}; 