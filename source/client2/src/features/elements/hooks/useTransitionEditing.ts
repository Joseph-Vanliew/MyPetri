import { useState, useEffect } from 'react';
import type { Transition } from '../../../types/domain';

interface UseTransitionEditingProps {
  transition: Transition;
  onUpdate?: (transition: Transition, updates: Partial<Transition>) => void;
}

export const useTransitionEditing = ({ transition, onUpdate }: UseTransitionEditingProps) => {
  const [editingLabel, setEditingLabel] = useState(false);
  const [tempLabel, setTempLabel] = useState(transition.name || '');

  // Update temp values when transition changes
  useEffect(() => {
    setTempLabel(transition.name || '');
  }, [transition.name]);

  // Label editing handlers
  const handleLabelDoubleClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    setEditingLabel(true);
    setTempLabel(transition.name || '');
  };

  const handleLabelChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setTempLabel(event.target.value);
  };

  const handleLabelSubmit = () => {
    if (onUpdate) {
      onUpdate(transition, { name: tempLabel });
    }
    setEditingLabel(false);
  };

  const handleLabelKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleLabelSubmit();
    } else if (event.key === 'Escape') {
      setTempLabel(transition.name || '');
      setEditingLabel(false);
    }
  };

  return {
    // State
    editingLabel,
    tempLabel,
    
    // Label handlers
    handleLabelDoubleClick,
    handleLabelChange,
    handleLabelSubmit,
    handleLabelKeyDown,
  };
};