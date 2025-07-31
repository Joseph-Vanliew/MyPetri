// Project store for managing project data and pages

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { ProjectData, PageData } from '../types/common';

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

        createNewProject: (name: string) => {
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

        loadProject: (projectData: ProjectData | File) => {
          if (projectData instanceof File) {
            // Handle file upload
            const reader = new FileReader();
            reader.onload = (e) => {
              try {
                const data = JSON.parse(e.target?.result as string);
                set({ project: data });
              } catch (error) {
                console.error('Error loading project file:', error);
              }
            };
            reader.readAsText(projectData);
          } else {
            // Handle direct project data
            set({ project: projectData });
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
            
            // TODO: Implement actual file save dialog
            if (forceSaveAs) {
              // Trigger save as dialog
              const dataStr = JSON.stringify(updatedProject, null, 2);
              const dataBlob = new Blob([dataStr], { type: 'application/json' });
              const url = URL.createObjectURL(dataBlob);
              const link = document.createElement('a');
              link.href = url;
              link.download = `${project.name}.pats`;
              link.click();
              URL.revokeObjectURL(url);
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
        },

        exportProject: (format: 'json' | 'pats' | 'png' | 'svg' | 'pdf') => {
          const { project } = get();
          if (!project) return;
          
          switch (format) {
            case 'json':
              const jsonData = JSON.stringify(project, null, 2);
              const jsonBlob = new Blob([jsonData], { type: 'application/json' });
              const jsonUrl = URL.createObjectURL(jsonBlob);
              const jsonLink = document.createElement('a');
              jsonLink.href = jsonUrl;
              jsonLink.download = `${project.name}.json`;
              jsonLink.click();
              URL.revokeObjectURL(jsonUrl);
              break;
              
            case 'pats':
              const patsData = JSON.stringify(project, null, 2);
              const patsBlob = new Blob([patsData], { type: 'application/json' });
              const patsUrl = URL.createObjectURL(patsBlob);
              const patsLink = document.createElement('a');
              patsLink.href = patsUrl;
              patsLink.download = `${project.name}.pats`;
              patsLink.click();
              URL.revokeObjectURL(patsUrl);
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
            let projectData: ProjectData;
            
            switch (format) {
              case 'json':
                projectData = JSON.parse(data);
                break;
              case 'pats':
                // TODO: Implement PATS format import
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