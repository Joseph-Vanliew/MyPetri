import { UIPlace, UITransition } from '../../../types';

/**
 * Gets the anchor point on an element's boundary
 */
export function getElementAnchorPoint(
  element: UIPlace | UITransition, 
  otherCenter: { x: number; y: number }
): { x: number; y: number } {
  const center = { x: element.x, y: element.y };
  if (element.id.startsWith('place')) {
    return getCircleAnchorPoint(center, (element as UIPlace).radius, otherCenter);
  } else if (element.id.startsWith('trans')) {
    return getRectAnchorPoint(
      center, 
      (element as UITransition).width, 
      (element as UITransition).height, 
      otherCenter
    );
  }
  return center;
}

/**
 * Gets the anchor point on a circle's boundary
 */
export function getCircleAnchorPoint(
  center: { x: number; y: number }, 
  radius: number, 
  target: { x: number; y: number }
): { x: number; y: number } {
  const dx = target.x - center.x;
  const dy = target.y - center.y;
  const angle = Math.atan2(dy, dx);
  return {
    x: center.x + radius * Math.cos(angle),
    y: center.y + radius * Math.sin(angle),
  };
}

/**
 * Gets the anchor point on a rectangle's boundary
 */
export function getRectAnchorPoint(
  center: { x: number; y: number }, 
  width: number, 
  height: number, 
  target: { x: number; y: number }
): { x: number; y: number } {
  const dx = target.x - center.x;
  const dy = target.y - center.y;
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  if (dx === 0 && dy === 0) return center;

  const scaleX = halfWidth / Math.abs(dx);
  const scaleY = halfHeight / Math.abs(dy);
  const scale = Math.min(scaleX, scaleY);
  return {
    x: center.x + dx * scale,
    y: center.y + dy * scale,
  };
} 