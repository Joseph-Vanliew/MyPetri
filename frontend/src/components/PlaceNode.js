import React, { useState } from 'react';
import '../styles/PlaceNode.css'; // Import the CSS file

const PlaceNode = ({ id, size, onTokenChange }) => {
    // Initial token count is set to zero when the PlaceNode is first created
    const [tokens, setTokens] = useState(0);

    // Function to handle adding tokens
    const handleTokenAdd = () => {
        const newTokenCount = tokens + 1;
        setTokens(newTokenCount);
        onTokenChange(id, newTokenCount); // Notify parent about token change
    };

    // Function to handle removing tokens (cannot go below zero)
    const handleTokenRemove = () => {
        if (tokens > 0) {
            const newTokenCount = tokens - 1;
            setTokens(newTokenCount);
            onTokenChange(id, newTokenCount); // Notify parent about token change
        }
    };

    return (
        <div className="place-node" style={{ width: size, height: size }}>
            {/* Addition button for adding tokens */}
            <div className="place-node-add" onClick={handleTokenAdd}>
                ➕
            </div>

            {/* Subtraction button for removing tokens */}
            <div className="place-node-remove" onClick={handleTokenRemove}>
                ➖
            </div>

            {/* Token visualization */}
            <div className="place-node-tokens">
                {tokens > 4 ? (
                    <span>{`x${tokens}`}</span>
                ) : (
                    Array(tokens)
                        .fill(0)
                        .map((_, index) => (
                            <div key={index} className="token" />
                        ))
                )}
            </div>
        </div>
    );
};

export default PlaceNode;
