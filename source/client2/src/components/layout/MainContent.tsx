import React from 'react';
import LeftSidebar from './LeftSidebar.tsx';
import CenterContent from './CenterContent.tsx';
import RightSidebar from './RightSidebar.tsx';

interface MainContentProps {
  leftSidebarWidth: number;
  rightSidebarWidth: number;
  leftSidebarContent?: React.ReactNode;
}

const MainContent: React.FC<MainContentProps> = ({ leftSidebarWidth, rightSidebarWidth, leftSidebarContent }) => {
  return (
    <div className="main-content">
      {/* Left Sidebar - Tool options */}
      <LeftSidebar width={leftSidebarWidth} content={leftSidebarContent} />
      
      {/* Center Content - Canvas + Pages */}
      <CenterContent />
      
      {/* Right Sidebar - Analysis tools */}
      <RightSidebar width={rightSidebarWidth} />
    </div>
  );
};

export default MainContent; 