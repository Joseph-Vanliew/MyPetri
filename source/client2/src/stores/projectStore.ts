// Project store for managing project data and pages

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { ProjectData, PageData } from '../types/common';

interface ProjectState {
  // Project data
  project: ProjectData | null;
  
  // Actions
  createProject: (name: string) => void;
  loadProject: (projectData: ProjectData) => void;
  saveProject: () => ProjectData | null;
  updateProjectName: (name: string) => void;
  
  // Page management
  addPage: (name: string) => void;
  removePage: (pageId: string) => void;
  updatePageName: (pageId: string, name: string) => void;
  setActivePage: (pageId: string) => void;
  getActivePage: () => PageData | null;
  
  // Project operations
  clearProject: () => void;
  exportProject: (format: 'json' | 'pats' | 'pnml') => string;
  importProject: (data: string, format: 'json' | 'pats' | 'pnml') => void;
}

const initialProject: ProjectData = {
  id: '',
  name: 'Untitled Project',
  pages: [],
  activePageId: '',
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

export const useProjectStore = create<ProjectState>()(
  devtools(
    persist(
      (set, get) => ({
        project: null,

        createProject: (name: string) => {
          const newProject: ProjectData = {
            ...initialProject,
            id: `project_${Date.now()}`,
            name,
            pages: [
              {
                id: `page_${Date.now()}`,
                name: 'Page 1',
                elements: [],
                createdAt: Date.now(),
                updatedAt: Date.now(),
              }
            ],
            activePageId: `page_${Date.now()}`,
          };
          set({ project: newProject });
        },

        loadProject: (projectData: ProjectData) => {
          set({ project: projectData });
        },

        saveProject: () => {
          const { project } = get();
          if (project) {
            const updatedProject = {
              ...project,
              updatedAt: Date.now(),
            };
            set({ project: updatedProject });
            return updatedProject;
          }
          return null;
        },

        updateProjectName: (name: string) => {
          const { project } = get();
          if (project) {
            set({
              project: {
                ...project,
                name,
                updatedAt: Date.now(),
              }
            });
          }
        },

        addPage: (name: string) => {
          const { project } = get();
          if (project) {
            const newPage: PageData = {
              id: `page_${Date.now()}`,
              name,
              elements: [],
              createdAt: Date.now(),
              updatedAt: Date.now(),
            };
            set({
              project: {
                ...project,
                pages: [...project.pages, newPage],
                activePageId: newPage.id,
                updatedAt: Date.now(),
              }
            });
          }
        },

        removePage: (pageId: string) => {
          const { project } = get();
          if (project && project.pages.length > 1) {
            const updatedPages = project.pages.filter(page => page.id !== pageId);
            const newActivePageId = project.activePageId === pageId 
              ? updatedPages[0]?.id || ''
              : project.activePageId;
            
            set({
              project: {
                ...project,
                pages: updatedPages,
                activePageId: newActivePageId,
                updatedAt: Date.now(),
              }
            });
          }
        },

        updatePageName: (pageId: string, name: string) => {
          const { project } = get();
          if (project) {
            const updatedPages = project.pages.map((page: PageData) =>
              page.id === pageId 
                ? { ...page, name, updatedAt: Date.now() }
                : page
            );
            set({
              project: {
                ...project,
                pages: updatedPages,
                updatedAt: Date.now(),
              }
            });
          }
        },

        setActivePage: (pageId: string) => {
          const { project } = get();
          if (project) {
            set({
              project: {
                ...project,
                activePageId: pageId,
                updatedAt: Date.now(),
              }
            });
          }
        },

        getActivePage: () => {
          const { project } = get();
          if (project) {
            return project.pages.find((page: PageData) => page.id === project.activePageId) || null;
          }
          return null;
        },

        clearProject: () => {
          set({ project: null });
        },

        exportProject: (format: 'json' | 'pats' | 'pnml') => {
          const { project } = get();
          if (!project) return '';
          
          switch (format) {
            case 'json':
              return JSON.stringify(project, null, 2);
            case 'pats':
              // TODO: Implement PATS format export
              return JSON.stringify(project, null, 2);
            case 'pnml':
              // TODO: Implement PNML format export
              return JSON.stringify(project, null, 2);
            default:
              return JSON.stringify(project, null, 2);
          }
        },

        importProject: (data: string, format: 'json' | 'pats' | 'pnml') => {
          try {
            let projectData: ProjectData;
            
            switch (format) {
              case 'json':
                projectData = JSON.parse(data);
                break;
              case 'pats':
                // TODO: Implement PATS format import
                projectData = JSON.parse(data);
                break;
              case 'pnml':
                // TODO: Implement PNML format import
                projectData = JSON.parse(data);
                break;
              default:
                projectData = JSON.parse(data);
            }
            
            set({ project: projectData });
          } catch (error) {
            console.error('Failed to import project:', error);
            throw new Error('Invalid project file format');
          }
        },
      }),
      {
        name: 'project-store',
        partialize: (state) => ({ project: state.project }),
      }
    ),
    {
      name: 'project-store',
    }
  )
); 