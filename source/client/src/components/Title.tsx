import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import GithubIcon from '../assets/github.svg';
import './styles/Title.css';

interface EditableTitleProps {
    title: string;
    onTitleChange: (newTitle: string) => void;
}

export interface EditableTitleRef {
    startEditing: () => void;
}

export const EditableTitle = forwardRef<EditableTitleRef, EditableTitleProps>(({ title, onTitleChange }, ref) => {
    const [isEditing, setIsEditing] = useState(false);
    const [tempTitle, setTempTitle] = useState(title);
    const [showNotification, setShowNotification] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    
    const DEFAULT_TITLE = "Untitled Petri Net";
    
    const notificationTimerRef = useRef<number | null>(null);

    useEffect(() => {
        setTempTitle(title);
    }, [title]);
    
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
            setTempTitle(title); 
            setShowNotification(false);
        }
    };

    return (
        <div className="title-container">
            {/* Use class names from styles/Title.css */}
            <div
                // Apply conditional class for editing state, using 'title-content'
                className={`title-content ${isEditing ? 'editing' : ''}`}
                onClick={isEditing ? undefined : startEditing}
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
                        className="title-input" 
                        placeholder={DEFAULT_TITLE}
                    />
                ) : (
                    // View mode 
                    <h2 className="title-text">
                        {title}
                    </h2>
                )}
            </div>

            {/* GitHub Project Link */}
            <a
                href="https://github.com/Joseph-Vanliew/PATS"
                target="_blank"
                rel="noopener noreferrer"
                className="github-link"
                title="View Project on GitHub"
            >
                <img
                    src={GithubIcon}
                    alt="GitHub Icon"
                    className="github-link-icon"
                />
            </a>

            {/* Notification message */}
            {showNotification && (
                <div className="title-notification">
                    Please name your file before saving!
                </div>
            )}
        </div>
    );
}); 