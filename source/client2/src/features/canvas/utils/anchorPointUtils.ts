import type { Element } from '../../../types/domain.js';

export function getElementCenter(element: Element): { x: number; y: number } {
  // Elements are rendered centered at (x, y) in SVG (see Place/Transition components)
  return { x: element.x, y: element.y };
}

export function getCircleAnchorPoint(center: { x: number; y: number }, radius: number, target: { x: number; y: number }) {
  const dx = target.x - center.x;
  const dy = target.y - center.y;
  const angle = Math.atan2(dy, dx);
  return { x: center.x + radius * Math.cos(angle), y: center.y + radius * Math.sin(angle) };
}

export function getRectAnchorPoint(center: { x: number; y: number }, width: number, height: number, target: { x: number; y: number }) {
  const dx = target.x - center.x;
  const dy = target.y - center.y;
  if (dx === 0 && dy === 0) return center;
  const halfW = width / 2;
  const halfH = height / 2;
  const scaleX = halfW / Math.abs(dx);
  const scaleY = halfH / Math.abs(dy);
  const scale = Math.min(scaleX, scaleY);
  return { x: center.x + dx * scale, y: center.y + dy * scale };
}

export function getAnchorPointForElement(element: Element, otherCenter: { x: number; y: number }) {
  const center = getElementCenter(element);
  if (element.type === 'place') {
    // @ts-ignore radius exists on Place type
    const radius = (element as any).radius ?? Math.min(element.width, element.height) / 2;
    return getCircleAnchorPoint(center, radius, otherCenter);
  }
  if (element.type === 'transition') {
    return getRectAnchorPoint(center, element.width, element.height, otherCenter);
  }
  return center;
}
