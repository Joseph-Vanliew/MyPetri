import type { Place } from '../../../types/domain';

interface PlaceHandlersProps {
  place: Place;
  onSelect?: (place: Place) => void;
  onDeselect?: (place: Place) => void;
  onDragStart?: (place: Place, event: React.MouseEvent) => void;
  onMouseEnterElement?: (place: Place, event: React.MouseEvent) => void;
  onMouseLeaveElement?: (place: Place, event: React.MouseEvent) => void;
}

export const createPlaceHandlers = ({
  place,
  onSelect,
  onDeselect,
  onDragStart,
  onMouseEnterElement,
  onMouseLeaveElement,
}: PlaceHandlersProps) => ({
  handleClick: (event: React.MouseEvent) => {
    event.stopPropagation();
    if (place.isSelected) {
      onDeselect?.(place);
    } else {
      onSelect?.(place);
    }
  },

  handleMouseDown: (event: React.MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
    onDragStart?.(place, event);
  },

  handleMouseEnter: (event: React.MouseEvent) => {
    onMouseEnterElement?.(place, event);
  },

  handleMouseLeave: (event: React.MouseEvent) => {
    onMouseLeaveElement?.(place, event);
  },
});