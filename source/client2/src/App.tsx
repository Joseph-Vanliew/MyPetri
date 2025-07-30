import React, { useEffect } from 'react';
import { useProjectStore, useLayoutStore } from './stores/index.js';
import AppLayout from './components/layout/AppLayout.js';
import './App.css';

const App: React.FC = () => {
  const { project, createProject } = useProjectStore();
  const { setDefaultLayout } = useLayoutStore();

  // Initialize the application
  useEffect(() => {
    // Create a default project if none exists
    if (!project) {
      createProject('Untitled Project');
    }

    // Set default layout
    setDefaultLayout();
  }, [project, createProject, setDefaultLayout]);

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
