import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';

interface EditableTitleProps {
    title: string;
    onTitleChange: (newTitle: string) => void;
}

// Define the ref type
export interface EditableTitleRef {
    startEditing: () => void;
}

export const EditableTitle = forwardRef<EditableTitleRef, EditableTitleProps>(({ title, onTitleChange }, ref) => {
    const [isEditing, setIsEditing] = useState(false);
    const [tempTitle, setTempTitle] = useState(title);
    const [hoverBackground, setHoverBackground] = useState('transparent');
    const [showNotification, setShowNotification] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    
    // constants
    const DEFAULT_TITLE = "Untitled Petri Net";
    
    // Timer for notification
    const notificationTimerRef = useRef<number | null>(null);

    // Update tempTitle when title prop changes
    useEffect(() => {
        setTempTitle(title);
    }, [title]);
    
    // Cleanup notification timer on unmount
    useEffect(() => {
        return () => {
            if (notificationTimerRef.current) {
                clearTimeout(notificationTimerRef.current);
            }
        };
    }, []);

    const startEditing = () => {
        setIsEditing(true);
        setTempTitle(title);
        // Reset hover background when entering edit mode
        setHoverBackground('transparent');
        // Show notification when prompted to edit the title
        if (title === DEFAULT_TITLE) {
            setShowNotification(true);
            // Hide notification after 3 seconds
            if (notificationTimerRef.current) {
                clearTimeout(notificationTimerRef.current);
            }
            notificationTimerRef.current = window.setTimeout(() => {
                setShowNotification(false);
            }, 3000);
        }
        // Focus the input after it renders
        setTimeout(() => {
            if (inputRef.current) {
                inputRef.current.focus();
                inputRef.current.select();
            }
        }, 10);
    };

    // Expose the startEditing method 
    useImperativeHandle(ref, () => ({
        startEditing
    }));

    const finishEditing = () => {
        setIsEditing(false);
        // If the title is empty, revert to the default title
        const finalTitle = tempTitle.trim() === '' ? DEFAULT_TITLE : tempTitle;
        onTitleChange(finalTitle);
        setTempTitle(finalTitle);
        setShowNotification(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            finishEditing();
        } else if (e.key === 'Escape') {
            setIsEditing(false);
            setTempTitle(title); // Reset to original title
            setShowNotification(false);
        }
    };

    return (
        <div className="title-container" style={{ 
            padding: '10px', 
            textAlign: 'left', 
            borderBottom: '1px solid #4a4a4a',
            display: 'flex',
            alignItems: 'center',
            height: '60px',
            minHeight: '60px',
            position: 'relative'
        }}>
            {/* Title content wrapper - consistent for both view and edit modes */}
            <div 
                style={{ 
                    cursor: isEditing ? 'default' : 'pointer',
                    padding: '5px 10px',
                    borderRadius: '4px',
                    transition: 'background-color 0.2s ease',
                    display: 'inline-block',
                    backgroundColor: isEditing ? 'transparent' : hoverBackground
                }}
                onClick={isEditing ? undefined : startEditing}
                onMouseOver={isEditing ? undefined : () => setHoverBackground('#2a2a2a')}
                onMouseOut={isEditing ? undefined : () => setHoverBackground('transparent')}
                title={isEditing ? undefined : "Click to edit the title"}
            >
                {isEditing ? (
                    // Edit mode
                    <input
                        ref={inputRef}
                        type="text"
                        value={tempTitle}
                        onChange={(e) => setTempTitle(e.target.value)}
                        onBlur={finishEditing}
                        onKeyDown={handleKeyDown}
                        style={{
                            fontSize: '1.5rem',
                            fontWeight: 'bold',
                            padding: '5px',
                            border: '1px solid #444',
                            borderRadius: '3px',
                            backgroundColor: '#333',
                            color: 'white',
                            width: '300px',
                            height: '40px',
                            boxSizing: 'border-box'
                        }}
                        placeholder={DEFAULT_TITLE}
                    />
                ) : (
                    // View mode
                    <h2 
                        style={{ 
                            margin: 0,
                            padding: 0,
                            borderRadius: '3px',
                            height: '40px',
                            display: 'flex',
                            alignItems: 'center'
                        }}
                    >
                        {title}
                        <span style={{ 
                            marginLeft: '10px', 
                            fontSize: '0.8rem', 
                            opacity: 0.6,
                            verticalAlign: 'middle'
                        }}>
                        </span>
                    </h2>
                )}
            </div>
            
            {/* Notification message */}
            {showNotification && (
                <div 
                    style={{
                        position: 'absolute',
                        left: '350px',
                        color: '#ff4d4d',
                        fontWeight: 'bold',
                        fontSize: '1rem',
                        animation: 'fadeIn 0.3s ease-in-out',
                        display: 'flex',
                        alignItems: 'center'
                    }}
                >
                    Please name your file before saving!
                </div>
            )}
        </div>
    );
}); 