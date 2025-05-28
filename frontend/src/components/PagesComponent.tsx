import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { PetriNetPageData } from '../types'; // Assuming types.ts is in the parent directory
import './styles/PagesComponent.css'; // Import the CSS file

// Define structure for context menu state
interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  pageId: string;
  positionAdjusted?: boolean; // Flag to prevent re-adjustment loops
}

interface PagesComponentProps {
  pages: Record<string, PetriNetPageData>;
  pageOrder: string[];
  activePageId: string | null;
  onSelectPage: (pageId: string) => void;
  onCreatePage: () => void;
  onRenamePage: (pageId: string, newTitle: string) => void;
  onDeletePage: (pageId: string) => void;
  onReorderPages: (newPageOrder: string[]) => void;
  onCreatePageWithData: (pageData: PetriNetPageData) => void;
}

export const PagesComponent: React.FC<PagesComponentProps> = ({
  pages,
  pageOrder,
  activePageId,
  onSelectPage,
  onCreatePage,
  onRenamePage,
  onDeletePage,
  onReorderPages,
  onCreatePageWithData,
}) => {
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null); // Ref for the context menu
  // State for context menu
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const dragItem = useRef<string | null>(null);
  const dragOverItem = useRef<string | null>(null);

  useEffect(() => {
    if (editingTabId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingTabId]);

  const handleDoubleClick = (pageId: string, currentTitle: string) => {
    setContextMenu(null); // Close context menu if open
    setEditingTabId(pageId);
    setEditValue(currentTitle);
  };

  const handleRename = () => {
    if (editingTabId && editValue.trim()) {
      onRenamePage(editingTabId, editValue.trim());
    }
    setEditingTabId(null);
    setEditValue('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditValue(e.target.value);
  };

  const handleInputBlur = () => {
    handleRename();
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleRename();
    } else if (e.key === 'Escape') {
      setEditingTabId(null);
      setEditValue('');
    }
  };

  // --- Context Menu Handlers ---
  const handleContextMenu = (event: React.MouseEvent, pageId: string) => {
    event.preventDefault(); 

    // Get the clicked element's position
    const targetElement = event.currentTarget as HTMLElement;
    const rect = targetElement.getBoundingClientRect();

    // Set initial position - y will be adjusted by useLayoutEffect
    setContextMenu({
      visible: true,
      x: rect.right,       // x is the left edge of the menu, aligned with tab's right
      y: rect.top,         // y is the top edge of the menu, initially at tab's top
      pageId: pageId,
      positionAdjusted: false // Mark that position needs adjustment
    });
    setEditingTabId(null); // Ensure not in edit mode
  };

  useLayoutEffect(() => {
    // Adjust position once the menu is visible, rendered, and not yet adjusted
    if (contextMenu?.visible && contextMenuRef.current && !contextMenu.positionAdjusted) {
      const menuHeight = contextMenuRef.current.offsetHeight;
      setContextMenu(prev => {
        if (!prev) return null;
        return {
          ...prev,
          y: prev.y - menuHeight, // Adjust y so bottom of menu is at the original prev.y (tab's top)
          positionAdjusted: true   // Mark as adjusted to prevent loop
        };
      });
    }
    // Dependencies: run when menu becomes visible for a page or when positionAdjusted changes
  }, [contextMenu?.visible, contextMenu?.pageId, contextMenu?.positionAdjusted]);

  const closeContextMenu = () => {
    setContextMenu(null);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contextMenu?.visible) {
        // Basic check, a ref on the menu div itself would be more robust
        const target = event.target as Element;
        if (!target.closest('.context-menu')) {
          closeContextMenu();
        }
      }
    };

    if (contextMenu?.visible) {
      document.addEventListener('mousedown', handleClickOutside, true);
      document.addEventListener('contextmenu', handleClickOutside, true); 
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
      document.removeEventListener('contextmenu', handleClickOutside, true);
    };
  }, [contextMenu]);

  const handleRenameFromMenu = () => {
    if (contextMenu) {
      handleDoubleClick(contextMenu.pageId, pages[contextMenu.pageId]?.title || '');
    }
    closeContextMenu();
  };

  const handleDeleteFromMenu = () => {
    if (contextMenu) {
      const page = pages[contextMenu.pageId];
      const hasElements = page.places.length > 0 || page.transitions.length > 0 || page.arcs.length > 0;
      
      if (!hasElements || window.confirm(`Are you sure you want to delete page "${page.title}"?`)) {
        onDeletePage(contextMenu.pageId);
      }
    }
    closeContextMenu();
  };

  const handleDuplicateFromMenu = () => {
    if (contextMenu) {
      const page = pages[contextMenu.pageId];
      const newPageId = `page_${Date.now()}`;
      
      // Create a deep copy of the page data
      const newPage: PetriNetPageData = {
        ...JSON.parse(JSON.stringify(page)), // Deep copy all properties
        id: newPageId,
        title: `${page.title} (copy)`,
        selectedElements: [], // Reset selected elements for the new page
      };
      
      // Create the new page with the copied data
      onCreatePageWithData(newPage);
      closeContextMenu();
    }
  };

  // --- Drag and Drop Handlers ---
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, pageId: string) => {
    dragItem.current = pageId;
    e.currentTarget.style.opacity = '0.5'; 
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', pageId); // Store pageId

    
    // Create a minimal (invisible) element to use as the drag image
    const dragImage = document.createElement('div');
    dragImage.style.position = "absolute";
    dragImage.style.top = "-9999px"; // Position off-screen
    dragImage.style.width = "1px";
    dragImage.style.height = "1px";
    dragImage.style.overflow = "hidden";
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 0, 0);
    // Schedule removal of the temporary element
    setTimeout(() => {
      document.body.removeChild(dragImage);
    }, 0);
    // --- End Hide Ghost Image ---
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>, pageId: string) => {
    e.preventDefault(); // Necessary to allow dropping
    dragOverItem.current = pageId;
    e.currentTarget.style.backgroundColor = '#555'; 
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
      e.currentTarget.style.backgroundColor = ''; // Reset background on leave
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); // Prevent default drop behavior
    e.currentTarget.style.backgroundColor = ''; // Reset background on drop
    
    if (!dragItem.current || !dragOverItem.current || dragItem.current === dragOverItem.current) {
        // No valid drag/drop happened
        dragItem.current = null;
        dragOverItem.current = null;
        return;
    }

    const dragItemIndex = pageOrder.indexOf(dragItem.current);
    const dragOverItemIndex = pageOrder.indexOf(dragOverItem.current);

    if (dragItemIndex === -1 || dragOverItemIndex === -1) {
        console.error("Error finding dragged items in pageOrder");
        dragItem.current = null;
        dragOverItem.current = null;
        return;
    }

    const newPageOrder = [...pageOrder];
    // Remove the dragged item
    const [draggedItem] = newPageOrder.splice(dragItemIndex, 1);
    // Insert it at the position of the item it was dragged over
    newPageOrder.splice(dragOverItemIndex, 0, draggedItem);

    onReorderPages(newPageOrder);

    // Clearing refs
    dragItem.current = null;
    dragOverItem.current = null;
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    // Reset opacity and clear refs
    e.currentTarget.style.opacity = '1'; 
    dragItem.current = null;
    dragOverItem.current = null;
     // Reset background in case drag ended outside a valid target
    e.currentTarget.style.backgroundColor = ''; 
  };

  return (
    <div className="pages-component-container" onDragOver={(e) => e.preventDefault()} >
      {pageOrder.map((pageId) => {
        const pageData = pages[pageId];
        if (!pageData) return null; // Should not happen if state is consistent

        return (
          <div
            key={pageId}
            className={`page-tab ${pageId === activePageId ? 'active' : ''}`}
            onClick={() => { closeContextMenu(); onSelectPage(pageId); }}
            onDoubleClick={() => handleDoubleClick(pageId, pageData.title)}
            onContextMenu={(e) => handleContextMenu(e, pageId)}
            title={pageData.title}
            draggable="true"
            onDragStart={(e) => handleDragStart(e, pageId)}
            onDragEnter={(e) => handleDragEnter(e, pageId)}
            onDragLeave={handleDragLeave}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onDragEnd={handleDragEnd}
          >
            {editingTabId === pageId ? (
              <input
                ref={inputRef}
                type="text"
                value={editValue}
                onChange={handleInputChange}
                onBlur={handleInputBlur}
                onKeyDown={handleInputKeyDown}
                className="page-tab-edit-input"
                maxLength={50}
              />
            ) : (
              pageData.title || `Page ${pageId.substring(0, 4)}`
            )}
          </div>
        );
      })}
      <button
        className="add-page-button"
        onClick={onCreatePage}
        title="Create New Page"
      >
        +
      </button>

      {contextMenu?.visible && (
        <div
          ref={contextMenuRef} // Assign the ref to the menu div
          className="context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onMouseDown={(e) => e.stopPropagation()}
          onContextMenu={(e) => e.stopPropagation()}
        >
          <div className="context-menu-item" onClick={handleRenameFromMenu}>Rename</div>
          <div className="context-menu-item" onClick={handleDuplicateFromMenu}>Duplicate</div>
          {Object.keys(pages).length > 1 && (
            <div className="context-menu-item" onClick={handleDeleteFromMenu}>Delete</div>
          )}
        </div>
      )}
    </div>
  );
}; 