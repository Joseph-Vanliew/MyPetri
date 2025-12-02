import React, { useEffect } from 'react';
import { useProjectStore } from './stores/projectStore';
import { useLayoutStore } from './stores/layoutStore';
import AppLayout from './layout/AppLayout';
import { useHistoryStore, initializeHistorySubscription } from './stores/historyStore';
import { initializeAllHotkeys } from './services/hotkeys';
import './App.css';

const App: React.FC = () => {
  const { project, createProject } = useProjectStore();
  const { clear } = useHistoryStore();
  const { setDefaultLayout } = useLayoutStore();

  // Initialize the application
  useEffect(() => {
    // Create a default project if none exists
    if (!project) {
      createProject('Untitled Project');
    }

    // Set default layout
    setDefaultLayout();
    // Clear history on app init/new project
    clear();
    
    // Initialize history subscription (one-time setup)
    initializeHistorySubscription();
    
    // Initialize global hotkeys
    initializeAllHotkeys();
  }, [project, createProject, setDefaultLayout, clear]);

  // Show loading state while initializing
  if (!project) {
    return (
      <div className="app-loading">
        <div className="loading-spinner">Loading...</div>
      </div>
    );
  }

  return <AppLayout />;
};

export default App;
