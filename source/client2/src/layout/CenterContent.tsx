import React from 'react';
import Canvas from '../features/canvas/components/Canvas.tsx';
import PagesSection from './PagesSection.tsx';

const CenterContent: React.FC = () => {
  return (
    <div className="center-content">
      {/* Canvas Area */}
      <div className="canvas-container">
        <Canvas />
      </div>
      
      {/* Pages Section */}
      <PagesSection />
    </div>
  );
};

export default CenterContent; 