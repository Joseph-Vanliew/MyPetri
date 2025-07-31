// Common types used across the application

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ID {
  id: string;
}

export interface Timestamp {
  createdAt: number;
  updatedAt: number;
}

export interface Positioned extends Point {
  x: number;
  y: number;
}

export interface Sizable extends Size {
  width: number;
  height: number;
}

export interface PositionedAndSizable extends Positioned, Sizable {}

export type ToolType = 'NONE' | 'PLACE' | 'TRANSITION' | 'ARC' | 'ARC_INHIBITOR' | 'ARC_BIDIRECTIONAL' | 'TEXT' | 'SHAPE';

export type ElementType = 'place' | 'transition' | 'arc' | 'text' | 'shape';

export interface ElementBase extends ID, PositionedAndSizable, Timestamp {
  type: ElementType;
  name: string;
  isSelected?: boolean;
}

export interface PageData {
  id: string;
  name: string;
  elements: ElementBase[];
  createdAt: number;
  updatedAt: number;
}

export interface ProjectData {
  id: string;
  name: string;
  pages: PageData[];
  activePageId: string;
  createdAt: number;
  updatedAt: number;
} 