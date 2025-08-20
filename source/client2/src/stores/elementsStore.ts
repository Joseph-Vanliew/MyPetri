// Elements store for managing all element data across pages

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type { Element, Place, Transition, Arc, TextElement, ShapeElement } from '../types/domain';
import { ELEMENT_TYPES, ELEMENT_DEFAULT_SIZES } from '../features/elements/registry/ElementTypes.js';


interface ElementsState {
  // Element data by page
  elementsByPage: Record<string, Element[]>;
  
  // Actions
  addElement: (pageId: string, element: Element) => void;
  updateElement: (pageId: string, elementId: string, updates: Partial<Element>) => void;
  removeElement: (pageId: string, elementId: string) => void;
  removeElements: (pageId: string, elementIds: string[]) => void;
  
  // Element queries
  getElements: (pageId: string) => Element[];
  getElement: (pageId: string, elementId: string) => Element | null;
  getElementsByType: (pageId: string, type: Element['type']) => Element[];
  
  // Selection
  selectedElementIds: Record<string, string[]>; // pageId -> elementIds
  selectElement: (pageId: string, elementId: string, multiSelect?: boolean) => void;
  selectElements: (pageId: string, elementIds: string[]) => void;
  clearSelection: (pageId: string) => void;
  getSelectedElements: (pageId: string) => Element[];
  
  // Element creation helpers
  createPlace: (pageId: string, x: number, y: number, radius?: number) => Place;
  createTransition: (pageId: string, x: number, y: number, width?: number, height?: number) => Transition;
  createArc: (pageId: string, sourceId: string, targetId: string, weight?: number, arcType?: Arc['arcType']) => Arc;
  createTextElement: (pageId: string, x: number, y: number, text?: string) => TextElement;
  createShapeElement: (pageId: string, x: number, y: number, shapeType?: ShapeElement['shapeType']) => ShapeElement;
  
  // Page management
  initializePage: (pageId: string) => void;
  removePage: (pageId: string) => void;
}

export const useElementsStore = create<ElementsState>()(
  devtools(
    persist(
      (set, get) => ({
        elementsByPage: {},
        selectedElementIds: {},

        addElement: (pageId: string, element: Element) => {
          const { elementsByPage } = get();
          const pageElements = elementsByPage[pageId] || [];
          
          set({
            elementsByPage: {
              ...elementsByPage,
              [pageId]: [...pageElements, element]
            }
          });
        },

        updateElement: (pageId: string, elementId: string, updates: Partial<Element>) => {
          const { elementsByPage } = get();
          const pageElements = elementsByPage[pageId] || [];
          
          const updatedElements = pageElements.map(element =>
            element.id === elementId
              ? { ...element, ...updates, updatedAt: Date.now() } as Element
              : element
          );
          
          set({
            elementsByPage: {
              ...elementsByPage,
              [pageId]: updatedElements
            }
          });
        },

        removeElement: (pageId: string, elementId: string) => {
          const { elementsByPage } = get();
          const pageElements = elementsByPage[pageId] || [];
          
          const updatedElements = pageElements.filter(element => element.id !== elementId);
          
          set({
            elementsByPage: {
              ...elementsByPage,
              [pageId]: updatedElements
            }
          });
        },

        removeElements: (pageId: string, elementIds: string[]) => {
          const { elementsByPage } = get();
          const pageElements = elementsByPage[pageId] || [];
          
          const updatedElements = pageElements.filter(element => !elementIds.includes(element.id));
          
          set({
            elementsByPage: {
              ...elementsByPage,
              [pageId]: updatedElements
            }
          });
        },

        getElements: (pageId: string) => {
          const { elementsByPage } = get();
          return elementsByPage[pageId] || [];
        },

        getElement: (pageId: string, elementId: string) => {
          const { elementsByPage } = get();
          const pageElements = elementsByPage[pageId] || [];
          return pageElements.find(element => element.id === elementId) || null;
        },

        getElementsByType: (pageId: string, type: Element['type']) => {
          const { elementsByPage } = get();
          const pageElements = elementsByPage[pageId] || [];
          return pageElements.filter(element => element.type === type);
        },

        selectElement: (pageId: string, elementId: string, multiSelect = false) => {
          const { selectedElementIds } = get();
          const currentSelected = selectedElementIds[pageId] || [];
          
          let newSelected: string[];
          if (multiSelect) {
            if (currentSelected.includes(elementId)) {
              newSelected = currentSelected.filter(id => id !== elementId);
            } else {
              newSelected = [...currentSelected, elementId];
            }
          } else {
            newSelected = [elementId];
          }
          
          set({
            selectedElementIds: {
              ...selectedElementIds,
              [pageId]: newSelected
            }
          });
        },

        selectElements: (pageId: string, elementIds: string[]) => {
          const { selectedElementIds } = get();
          set({
            selectedElementIds: {
              ...selectedElementIds,
              [pageId]: elementIds
            }
          });
        },

        clearSelection: (pageId: string) => {
          const { selectedElementIds } = get();
          const updated = { ...selectedElementIds };
          delete updated[pageId];
          set({ selectedElementIds: updated });
        },

        getSelectedElements: (pageId: string) => {
          const { elementsByPage, selectedElementIds } = get();
          const pageElements = elementsByPage[pageId] || [];
          const selectedIds = selectedElementIds[pageId] || [];
          return pageElements.filter(element => selectedIds.includes(element.id));
        },

        createPlace: (pageId: string, x: number, y: number, radius = ELEMENT_DEFAULT_SIZES[ELEMENT_TYPES.PLACE].width / 2) => {
          const place: Place = {
            id: uuidv4(),
            type: 'place',
            name: '',
            x,
            y,
            width: radius * 2,
            height: radius * 2,
            tokens: 0,
            capacity: undefined,
            bounded: false,
            radius,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
          
          get().addElement(pageId, place);
          return place;
        },

        createTransition: (pageId: string, x: number, y: number, width = ELEMENT_DEFAULT_SIZES[ELEMENT_TYPES.TRANSITION].width, height = ELEMENT_DEFAULT_SIZES[ELEMENT_TYPES.TRANSITION].height) => {
          const transition: Transition = {
            id: uuidv4(),
            type: 'transition',
            name: '',
            x,
            y,
            width,
            height,
            enabled: false,
            arcIds: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
          
          get().addElement(pageId, transition);
          return transition;
        },

        createArc: (pageId: string, sourceId: string, targetId: string, weight = 1, arcType: Arc['arcType'] = 'normal') => {
          const arc: Arc = {
            id: uuidv4(),
            type: 'arc',
            name: '',
            x: 0,
            y: 0,
            width: 0,
            height: 0,
            sourceId,
            targetId,
            weight,
            arcType,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
          
          get().addElement(pageId, arc);
          return arc;
        },

        createTextElement: (pageId: string, x: number, y: number, text = 'Text') => {
          const textElement: TextElement = {
            id: uuidv4(),
            type: 'text',
            name: '',
            x,
            y,
            width: 200,
            height: 100,
            text,
            fontSize: 16,
            fontFamily: 'sans-serif',
            color: '#ffffff',
            backgroundColor: 'transparent',
            borderColor: 'transparent',
            borderWidth: 2,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
          
          get().addElement(pageId, textElement);
          return textElement;
        },

        createShapeElement: (pageId: string, x: number, y: number, shapeType: ShapeElement['shapeType'] = 'rectangle') => {
          const shapeElement: ShapeElement = {
            id: uuidv4(),
            type: 'shape',
            name: '',
            x,
            y,
            width: 100,
            height: 100,
            shapeType,
            fillColor: 'rgba(255, 255, 255, 0.1)',
            strokeColor: 'rgba(255, 255, 255, 0.8)',
            strokeWidth: 2,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
          
          get().addElement(pageId, shapeElement);
          return shapeElement;
        },

        initializePage: (pageId: string) => {
          const { elementsByPage } = get();
          if (!elementsByPage[pageId]) {
            set({
              elementsByPage: {
                ...elementsByPage,
                [pageId]: []
              }
            });
          }
        },

        removePage: (pageId: string) => {
          const { elementsByPage, selectedElementIds } = get();
          const updatedElements = { ...elementsByPage };
          const updatedSelection = { ...selectedElementIds };
          
          delete updatedElements[pageId];
          delete updatedSelection[pageId];
          
          set({
            elementsByPage: updatedElements,
            selectedElementIds: updatedSelection
          });
        },
      }),
      {
        name: 'elements-store',
        partialize: (state) => ({ 
          elementsByPage: state.elementsByPage,
          selectedElementIds: state.selectedElementIds 
        }),
      }
    ),
    {
      name: 'elements-store',
    }
  )
); 