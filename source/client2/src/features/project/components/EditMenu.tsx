import React, { useState, useRef, useEffect } from 'react';
import './EditMenu.css';

interface SubMenuProps {
  label: string;
  children: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
}

const SubMenu: React.FC<SubMenuProps> = ({ label, children, isOpen, onToggle }) => {
  return (
    <div className="submenu-container">
      <button className="submenu-trigger" onClick={onToggle}>
        {label}
        <span className={`submenu-arrow ${isOpen ? 'open' : ''}`}>▶</span>
      </button>
      {isOpen && (
        <div className="submenu-content">
          {children}
        </div>
      )}
    </div>
  );
};

const EditMenu: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [openSubMenus, setOpenSubMenus] = useState<Set<string>>(new Set());
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setOpenSubMenus(new Set());
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const toggleSubMenu = (subMenuName: string) => {
    const newOpenMenus = new Set(openSubMenus);
    if (newOpenMenus.has(subMenuName)) {
      newOpenMenus.delete(subMenuName);
    } else {
      newOpenMenus.add(subMenuName);
    }
    setOpenSubMenus(newOpenMenus);
  };

  const handleUndo = () => {
    // TODO: Implement undo functionality
    console.log('Undo action');
    setIsOpen(false);
    setOpenSubMenus(new Set());
  };

  const handleRedo = () => {
    // TODO: Implement redo functionality
    console.log('Redo action');
    setIsOpen(false);
    setOpenSubMenus(new Set());
  };

  const handleCut = () => {
    // TODO: Implement cut functionality
    console.log('Cut action');
    setIsOpen(false);
    setOpenSubMenus(new Set());
  };

  const handleCopy = () => {
    // TODO: Implement copy functionality
    console.log('Copy action');
    setIsOpen(false);
    setOpenSubMenus(new Set());
  };

  const handlePaste = () => {
    // TODO: Implement paste functionality
    console.log('Paste action');
    setIsOpen(false);
    setOpenSubMenus(new Set());
  };

  const handleDelete = () => {
    // TODO: Implement delete functionality
    console.log('Delete action');
    setIsOpen(false);
    setOpenSubMenus(new Set());
  };

  const handleSelectAll = () => {
    // TODO: Implement select all functionality
    console.log('Select All action');
    setIsOpen(false);
    setOpenSubMenus(new Set());
  };

  return (
    <div className="edit-menu-container" ref={menuRef}>
      <button 
        className="edit-menu-trigger"
        onClick={() => setIsOpen(!isOpen)}
      >
        Edit
      </button>
      
      {isOpen && (
        <div className="edit-menu-dropdown">
          {/* History Operations */}
          <div className="menu-section">
            <button 
              className="menu-item"
              onClick={handleUndo}
              disabled={false} // TODO: Check if undo is available
            >
              Undo
            </button>
            <button 
              className="menu-item"
              onClick={handleRedo}
              disabled={false} // TODO: Check if redo is available
            >
              Redo
            </button>
          </div>

          {/* Clipboard Operations */}
          <div className="menu-section">
            <button 
              className="menu-item"
              onClick={handleCut}
            >
              Cut
            </button>
            <button 
              className="menu-item"
              onClick={handleCopy}
            >
              Copy
            </button>
            <button 
              className="menu-item"
              onClick={handlePaste}
            >
              Paste
            </button>
            <button 
              className="menu-item"
              onClick={handleDelete}
            >
              Delete
            </button>
          </div>

          {/* Selection Operations */}
          <div className="menu-section">
            <button 
              className="menu-item"
              onClick={handleSelectAll}
            >
              Select All
            </button>
          </div>

          {/* Advanced Operations Submenu */}
          <SubMenu
            label="Advanced"
            isOpen={openSubMenus.has('advanced')}
            onToggle={() => toggleSubMenu('advanced')}
          >
            <button 
              className="submenu-item"
              onClick={() => console.log('Duplicate')}
            >
              Duplicate
            </button>
            <button 
              className="submenu-item"
              onClick={() => console.log('Group')}
            >
              Group
            </button>
            <button 
              className="submenu-item"
              onClick={() => console.log('Ungroup')}
            >
              Ungroup
            </button>
          </SubMenu>

          {/* Transform Operations Submenu */}
          <SubMenu
            label="Transform"
            isOpen={openSubMenus.has('transform')}
            onToggle={() => toggleSubMenu('transform')}
          >
            <button 
              className="submenu-item"
              onClick={() => console.log('Bring to Front')}
            >
              Bring to Front
            </button>
            <button 
              className="submenu-item"
              onClick={() => console.log('Send to Back')}
            >
              Send to Back
            </button>
            <button 
              className="submenu-item"
              onClick={() => console.log('Flip Horizontal')}
            >
              Flip Horizontal
            </button>
            <button 
              className="submenu-item"
              onClick={() => console.log('Flip Vertical')}
            >
              Flip Vertical
            </button>
          </SubMenu>
        </div>
      )}
    </div>
  );
};

export default EditMenu; 