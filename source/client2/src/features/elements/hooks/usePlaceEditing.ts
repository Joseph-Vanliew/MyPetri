import { useState, useEffect } from 'react';
import type { Place } from '../../../types/domain';

interface UsePlaceEditingProps {
  place: Place;
  onUpdate?: (place: Place, updates: Partial<Place>) => void;
}

export const usePlaceEditing = ({ place, onUpdate }: UsePlaceEditingProps) => {
  const [editingLabel, setEditingLabel] = useState(false);
  const [editingTokens, setEditingTokens] = useState(false);
  const [tempLabel, setTempLabel] = useState(place.name || '');
  const [tempTokens, setTempTokens] = useState(place.tokens.toString());

  // Update temp values when place changes
  useEffect(() => {
    setTempLabel(place.name || '');
    setTempTokens(place.tokens.toString());
  }, [place.name, place.tokens]);

  // Label editing handlers
  const handleLabelDoubleClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    setEditingLabel(true);
    setTempLabel(place.name || '');
  };

  const handleLabelChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setTempLabel(event.target.value);
  };

  const handleLabelSubmit = () => {
    if (onUpdate) {
      onUpdate(place, { name: tempLabel });
    }
    setEditingLabel(false);
  };

  const handleLabelKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleLabelSubmit();
    } else if (event.key === 'Escape') {
      setTempLabel(place.name || '');
      setEditingLabel(false);
    }
  };

  // Token editing handlers
  const handleTokenDoubleClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    setEditingTokens(true);
    setTempTokens(place.tokens.toString());
  };

  const handleTokenChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setTempTokens(event.target.value);
  };

  const handleTokenSubmit = () => {
    const newTokens = parseInt(tempTokens, 10);
    if (!isNaN(newTokens) && newTokens >= 0 && onUpdate) {
      onUpdate(place, { tokens: newTokens });
    }
    setEditingTokens(false);
  };

  const handleTokenKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleTokenSubmit();
    } else if (event.key === 'Escape') {
      setTempTokens(place.tokens.toString());
      setEditingTokens(false);
    }
  };

  return {
    // State
    editingLabel,
    editingTokens,
    tempLabel,
    tempTokens,
    
    // Label handlers
    handleLabelDoubleClick,
    handleLabelChange,
    handleLabelSubmit,
    handleLabelKeyDown,
    
    // Token handlers
    handleTokenDoubleClick,
    handleTokenChange,
    handleTokenSubmit,
    handleTokenKeyDown,
  };
};