import React from 'react';
import { useLayoutStore } from '../../stores/index.js';
import TitleSection from './TitleSection.tsx';
import Ribbon from './Ribbon.tsx';
import MainContent from './MainContent.tsx';
import StatusBar from './StatusBar.tsx';
import './layout.css';

const AppLayout: React.FC = () => {
  const { leftSidebarWidth, rightSidebarWidth, leftSidebarCollapsed, rightSidebarCollapsed } = useLayoutStore();

  return (
    <div className="app-layout">
      {/* Title Section - Project title + file menu */}
      <TitleSection />
      
      {/* Ribbon - Tool selection + file operations */}
      <Ribbon />
      
      {/* Main Content Area */}
      <MainContent 
        leftSidebarWidth={leftSidebarCollapsed ? 0 : leftSidebarWidth}
        rightSidebarWidth={rightSidebarCollapsed ? 0 : rightSidebarWidth}
      />
      
      {/* Status Bar - Simulation controls */}
      <StatusBar />
    </div>
  );
};

export default AppLayout; 