import type { ProjectData, PageData, ElementBase } from '../types/common';
import type { Element } from '../types/domain';

export type ProjectSnapshot = ProjectData & {
  pages: Array<PageData & { elements: Element[] }>;
};

const cloneElements = (elements: Array<Element | ElementBase> = []): Element[] =>
  elements.map((element) => ({ ...element })) as Element[];

/**
 * Merge the project metadata and the in-memory elements map into a serializable snapshot.
 */
export const buildProjectSnapshot = (
  project: ProjectData,
  elementsByPage: Record<string, Element[]>
): ProjectSnapshot => {
  const pagesWithElements = project.pages.map((page) => ({
    ...page,
    elements: cloneElements(elementsByPage[page.id] || []),
  }));

  return {
    ...project,
    pages: pagesWithElements,
  };
};

/**
 * Split a snapshot back into store-ready project metadata and an elements map.
 */
export const splitProjectSnapshot = (
  snapshot: ProjectSnapshot
): {
  project: ProjectData;
  elementsByPage: Record<string, Element[]>;
} => {
  const elementsByPage: Record<string, Element[]> = {};

  const pagesWithoutElements = snapshot.pages.map((page) => {
    const clonedElements = cloneElements(page.elements || []);
    elementsByPage[page.id] = clonedElements;

    return {
      ...page,
      elements: [],
    };
  });

  return {
    project: {
      ...snapshot,
      pages: pagesWithoutElements,
    },
    elementsByPage,
  };
};

