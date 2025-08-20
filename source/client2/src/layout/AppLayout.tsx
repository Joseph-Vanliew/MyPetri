import React, { useEffect } from 'react';
import { useLayoutStore } from '../stores/index.js';
import TitleSection from './TitleSection.tsx';
import Ribbon from './Ribbon.tsx';
import { Toolbar } from '../features/tools/ToolsIndex.js';
import MainContent from './MainContent.tsx';
import StatusBar from './StatusBar.tsx';
import DragPreview from '../features/tools/components/DragPreview.js';
import './layout.css';
import { ensureHistoryHotkeysInstalled } from '../stores/historyStore.js';
import { ensureClipboardHotkeysInstalled } from '../stores/clipboardStore.js';

const AppLayout: React.FC = () => {
  const { leftSidebarWidth, rightSidebarWidth, leftSidebarCollapsed, rightSidebarCollapsed } = useLayoutStore();

  // Ensure a single, centralized hotkey handler is installed
  useEffect(() => {
    ensureHistoryHotkeysInstalled();
    ensureClipboardHotkeysInstalled();
  }, []);

  return (
    <div className="app-layout">
      {/* Title Section - Project title + file menu */}
      <TitleSection />
      
      {/* Ribbon - File operations and other commands */}
      <Ribbon />
      
      {/* Main Content Area */}
      <MainContent 
        leftSidebarWidth={leftSidebarCollapsed ? 0 : leftSidebarWidth}
        rightSidebarWidth={rightSidebarCollapsed ? 0 : rightSidebarWidth}
        leftSidebarContent={<Toolbar />}
      />
      
      {/* Status Bar - Simulation controls */}
      <StatusBar />
      
      {/* Drag Preview - Renders globally when dragging from toolbar */}
      <DragPreview />
    </div>
  );
};

export default AppLayout; 