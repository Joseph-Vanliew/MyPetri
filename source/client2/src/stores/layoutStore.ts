// Layout store for managing UI layout state

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { LayoutState } from '../types/ui';

interface LayoutStoreState extends LayoutState {
  // Actions
  setLeftSidebarWidth: (width: number) => void;
  setRightSidebarWidth: (width: number) => void;
  toggleLeftSidebar: () => void;
  toggleRightSidebar: () => void;
  setStatusBarHeight: (height: number) => void;
  
  // Layout presets
  setDefaultLayout: () => void;
  setFullscreenLayout: () => void;
  setCompactLayout: () => void;
  
  // Responsive helpers
  isMobile: boolean;
  setIsMobile: (isMobile: boolean) => void;
}

const defaultLayout: LayoutState = {
  leftSidebarWidth: 300,
  rightSidebarWidth: 350,
  leftSidebarCollapsed: false,
  rightSidebarCollapsed: false,
  statusBarHeight: 40,
};

const fullscreenLayout: LayoutState = {
  leftSidebarWidth: 0,
  rightSidebarWidth: 0,
  leftSidebarCollapsed: true,
  rightSidebarCollapsed: true,
  statusBarHeight: 0,
};

const compactLayout: LayoutState = {
  leftSidebarWidth: 200,
  rightSidebarWidth: 250,
  leftSidebarCollapsed: false,
  rightSidebarCollapsed: false,
  statusBarHeight: 30,
};

export const useLayoutStore = create<LayoutStoreState>()(
  devtools(
    persist(
      (set, get) => ({
        ...defaultLayout,
        isMobile: false,

        setLeftSidebarWidth: (width: number) => {
          set({ leftSidebarWidth: Math.max(200, Math.min(500, width)) });
        },

        setRightSidebarWidth: (width: number) => {
          set({ rightSidebarWidth: Math.max(250, Math.min(600, width)) });
        },

        toggleLeftSidebar: () => {
          const { leftSidebarCollapsed } = get();
          set({ leftSidebarCollapsed: !leftSidebarCollapsed });
        },

        toggleRightSidebar: () => {
          const { rightSidebarCollapsed } = get();
          set({ rightSidebarCollapsed: !rightSidebarCollapsed });
        },

        setStatusBarHeight: (height: number) => {
          set({ statusBarHeight: Math.max(0, Math.min(100, height)) });
        },

        setDefaultLayout: () => {
          set(defaultLayout);
        },

        setFullscreenLayout: () => {
          set(fullscreenLayout);
        },

        setCompactLayout: () => {
          set(compactLayout);
        },

        setIsMobile: (isMobile: boolean) => {
          set({ isMobile });
          
          // Auto-adjust layout for mobile
          if (isMobile) {
            set({
              leftSidebarWidth: 0,
              rightSidebarWidth: 0,
              leftSidebarCollapsed: true,
              rightSidebarCollapsed: true,
              statusBarHeight: 0,
            });
          } else {
            set(defaultLayout);
          }
        },
      }),
      {
        name: 'layout-store',
        partialize: (state) => ({
          leftSidebarWidth: state.leftSidebarWidth,
          rightSidebarWidth: state.rightSidebarWidth,
          leftSidebarCollapsed: state.leftSidebarCollapsed,
          rightSidebarCollapsed: state.rightSidebarCollapsed,
          statusBarHeight: state.statusBarHeight,
        }),
      }
    ),
    {
      name: 'layout-store',
    }
  )
); 