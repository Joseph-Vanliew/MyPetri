import type { Transition } from '../../../types/domain';

interface TransitionHandlersProps {
  transition: Transition;
  onSelect?: (transition: Transition) => void;
  onDeselect?: (transition: Transition) => void;
  onDragStart?: (transition: Transition, event: React.MouseEvent) => void;
  onMouseEnterElement?: (transition: Transition, event: React.MouseEvent) => void;
  onMouseLeaveElement?: (transition: Transition, event: React.MouseEvent) => void;
}

export const createTransitionHandlers = ({
  transition,
  onSelect,
  onDeselect,
  onDragStart,
  onMouseEnterElement,
  onMouseLeaveElement,
}: TransitionHandlersProps) => ({
  handleClick: (event: React.MouseEvent) => {
    event.stopPropagation();
    if (transition.isSelected) {
      onDeselect?.(transition);
    } else {
      onSelect?.(transition);
    }
  },

  handleMouseDown: (event: React.MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
    onDragStart?.(transition, event);
  },

  handleMouseEnter: (event: React.MouseEvent) => {
    onMouseEnterElement?.(transition, event);
  },

  handleMouseLeave: (event: React.MouseEvent) => {
    onMouseLeaveElement?.(transition, event);
  },
});