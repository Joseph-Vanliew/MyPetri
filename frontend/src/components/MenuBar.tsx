import React from 'react';
import { FileMenu } from './FileMenu';
import { PetriNetDTO } from '../types';

interface MenuBarProps {
  petriNetData: PetriNetDTO;
  onImport: (data: PetriNetDTO) => void;
}

export const MenuBar: React.FC<MenuBarProps> = ({ petriNetData, onImport }) => {
  return (
    <div className="menu-bar" style={{ 
      display: 'flex', 
      alignItems: 'center', 
      padding: '5px 10px', 
      backgroundColor: '#252525', 
      borderBottom: '1px solid #333',
      height: '30px'
    }}>
      <FileMenu 
        petriNetData={petriNetData}
        onImport={onImport}
      />
    </div>
  );
}; 