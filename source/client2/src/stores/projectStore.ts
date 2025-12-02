// Project store for managing project data and pages

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { ProjectData, PageData } from '../types/common';
import { useElementsStore } from './elementsStore';
import { useHistoryStore } from './historyStore';
import { buildProjectSnapshot, splitProjectSnapshot, type ProjectSnapshot } from '../services/projectSnapshot';
import { readTextFromFile, downloadTextFile } from '../services/projectIO';

interface ProjectState {
  // Project data
  project: ProjectData | null;
  
  // Actions
  createProject: (name: string) => void;
  createNewProject: (name: string) => void; // Alias for createProject
  loadProject: (projectData: ProjectData | File) => void;
  saveProject: (forceSaveAs?: boolean) => ProjectData | null;
  updateProjectName: (name: string) => void;
  
  // Page management
  addPage: (name: string) => void;
  removePage: (pageId: string) => void;
  updatePageName: (pageId: string, name: string) => void;
  setActivePage: (pageId: string) => void;
  getActivePage: () => PageData | null;
  
  // Project operations
  clearProject: () => void;
  exportProject: (format: 'json' | 'pats' | 'png' | 'svg' | 'pdf') => void;
  importProject: (data: string, format: 'json' | 'pats') => void;
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
      (set, get) => {
        const applySnapshotToStores = (snapshot: ProjectSnapshot) => {
          const { project: projectWithoutElements, elementsByPage } = splitProjectSnapshot(snapshot);
          set({ project: projectWithoutElements });
          useElementsStore.getState().loadElements(elementsByPage);
          useHistoryStore.getState().clear();
        };

        const resetStoresForNewProject = (pageId: string) => {
          useElementsStore.getState().loadElements({ [pageId]: [] });
          useHistoryStore.getState().clear();
        };

        const getSnapshotForProject = (project: ProjectData) =>
          buildProjectSnapshot(project, useElementsStore.getState().elementsByPage);

        return {
        project: null,

        createProject: (name: string) => {
          const pageId = `page_${Date.now()}`;
          const newProject: ProjectData = {
            ...initialProject,
            id: `project_${Date.now()}`,
            name,
            pages: [
              {
                id: pageId,
                name: 'Page 1',
                elements: [],
                createdAt: Date.now(),
                updatedAt: Date.now(),
              }
            ],
            activePageId: pageId,
          };
          set({ project: newProject });
          resetStoresForNewProject(pageId);
        },

        createNewProject: (name: string) => {
          const pageId = `page_${Date.now()}`;
          const newProject: ProjectData = {
            ...initialProject,
            id: `project_${Date.now()}`,
            name,
            pages: [
              {
                id: pageId,
                name: 'Page 1',
                elements: [],
                createdAt: Date.now(),
                updatedAt: Date.now(),
              }
            ],
            activePageId: pageId,
          };
          set({ project: newProject });
          resetStoresForNewProject(pageId);
        },

        loadProject: (projectData: ProjectData | File) => {
          const handleSnapshot = (snapshot: ProjectSnapshot) => {
            try {
              applySnapshotToStores(snapshot);
            } catch (error) {
              console.error('Error applying project snapshot:', error);
            }
          };

          if (projectData instanceof File) {
            readTextFromFile(projectData)
              .then((text) => {
                const data = JSON.parse(text) as ProjectSnapshot;
                handleSnapshot(data);
              })
              .catch((error) => {
                console.error('Error loading project file:', error);
              });
          } else {
            handleSnapshot(projectData as ProjectSnapshot);
          }
        },

        saveProject: (forceSaveAs = false) => {
          const { project } = get();
          if (project) {
            const updatedProject = {
              ...project,
              updatedAt: Date.now(),
            };
            set({ project: updatedProject });

            const snapshot = getSnapshotForProject(updatedProject);
            
            if (forceSaveAs) {
              downloadTextFile(`${project.name}.pats`, JSON.stringify(snapshot, null, 2), 'application/json');
            }
            
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
          useElementsStore.getState().loadElements({});
          useHistoryStore.getState().clear();
        },

        exportProject: (format: 'json' | 'pats' | 'png' | 'svg' | 'pdf') => {
          const { project } = get();
          if (!project) return;

          const snapshot = getSnapshotForProject(project);
          
          switch (format) {
            case 'json':
              downloadTextFile(`${project.name}.json`, JSON.stringify(snapshot, null, 2), 'application/json');
              break;
              
            case 'pats':
              downloadTextFile(`${project.name}.pats`, JSON.stringify(snapshot, null, 2), 'application/json');
              break;
              
            case 'png':
              // TODO: Implement PNG export (canvas to image)
              console.log('PNG export not yet implemented');
              break;
              
            case 'svg':
              // TODO: Implement SVG export
              console.log('SVG export not yet implemented');
              break;
              
            case 'pdf':
              // TODO: Implement PDF export
              console.log('PDF export not yet implemented');
              break;
              
            default:
              console.warn('Unknown export format:', format);
          }
        },

        importProject: (data: string, format: 'json' | 'pats') => {
          try {
            let snapshotData: ProjectSnapshot;
            
            switch (format) {
              case 'json':
                snapshotData = JSON.parse(data) as ProjectSnapshot;
                break;
              case 'pats':
                // TODO: Implement PATS format import
                snapshotData = JSON.parse(data) as ProjectSnapshot;
                break;
              default:
                snapshotData = JSON.parse(data) as ProjectSnapshot;
            }
            
            applySnapshotToStores(snapshotData);
          } catch (error) {
            console.error('Failed to import project:', error);
            throw new Error('Invalid project file format');
          }
        },
        };
      },
      {
        name: 'project-store',
        partialize: (state: ProjectState) => ({ project: state.project }),
      }
    ),
    {
      name: 'project-store',
    }
  )
); 