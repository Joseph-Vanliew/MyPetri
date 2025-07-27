import {useState, useEffect, useRef, useMemo} from 'react';
import { Canvas } from './components/Canvas';
import { Toolbar } from './components/Toolbar';
import {PetriNetDTO, UIArc, PetriNetPageData, ProjectDTO, ValidatorPageConfig} from './types';
import { MenuBar } from './components/MenuBar';
import { EditableTitle, EditableTitleRef } from './components/Title.tsx';
import { TabbedPanel } from './components/TabbedPanel';
import { useClipboard } from './hooks/useClipboard';
import { PagesComponent } from './components/PagesComponent';
import { loadAppState, saveAppState, PersistedAppState } from './hooks/appPersistence';
import { TokenAnimator } from './animations/TokenAnimator';
import { usePetriNetCore } from './hooks/usePetriNetCore';
import { useHistoryAndKeyboard } from './hooks/useHistoryAndKeyboard';
import { useProjectManagement } from './hooks/useProjectManagement';
import { useSimulation } from './hooks/simulation';
import { useFileOperations } from './hooks/useFileOperations';
import { useCanvasInteractions } from './hooks/useCanvasInteractions';
import { downloadJSON } from './utils/petriNetUtils';
import './App.css';
import './components/styles/LeftSidebar.css';

const defaultValidatorConfigs: ValidatorPageConfig = {
    inputConfigs: [],
    outputConfigs: [],
    validationResult: null,
    emptyInputFields: {},
    emptyOutputFields: {}
};

export default function App() {
    // =========================================================================================
    // I. STATE MANAGEMENT
    // =========================================================================================

    const isNewWindow = window.name === 'new_project';
    const initialPersistedState = isNewWindow ? null : loadAppState();
    
    // ----- Core Application State (Persisted via localStorage) -----
    const [pages, setPages] = useState<Record<string, PetriNetPageData>>( // Holds all the pages of the current project, keyed by page ID.
        initialPersistedState?.pages || {}
    );
    const [activePageId, setActivePageId] = useState<string | null>( // ID of the currently visible/active page.
        initialPersistedState?.activePageId || null
    );
    const [pageOrder, setPageOrder] = useState<string[]>( // Array of page IDs defining the order of pages in the UI.
        initialPersistedState?.pageOrder || []
    );
    const [projectTitle, setProjectTitle] = useState<string>( 
        initialPersistedState?.projectTitle || "Untitled MyPetri Project"
    );
    const [projectHasUnsavedChanges, setProjectHasUnsavedChanges] = useState<boolean>( // Flag indicating if there are unsaved changes.
        initialPersistedState?.projectHasUnsavedChanges || false
    );
    // projectFileHandle is not persisted due to its nature.
    const [projectFileHandle, setProjectFileHandle] = useState<FileSystemFileHandle | null>(null); // File system handle for the project file (if using File System Access API).
    // const [originalFileNameFromInput, setOriginalFileNameFromInput] = useState<string | null>(null); // Stores the original filename when a project is opened via a traditional file input.

    // ----- Transient UI & Interaction State (Not Persisted) -----
    const [currentFiredTransitions, setCurrentFiredTransitions] = useState<string[]>([]); // IDs of transitions that are currently visually "fired" in the simulation.
    const [selectedTool, setSelectedTool] = useState<'NONE' |'PLACE' | 'TRANSITION' | 'ARC'>('NONE'); // The currently active tool selected from the toolbar (e.g., Place, Transition, Arc).
    const [arcType, setArcType] = useState<UIArc['type']>('REGULAR'); // The type of arc to be created (e.g., Regular, Inhibitor).
    const [isTyping, setIsTyping] = useState(false); // Tracks if user is typing in an input field to prevent shortcut collisions
    const [autoScrollEnabled, setAutoScrollEnabled] = useState(true); // Controls whether the properties panel automatically scrolls to selected elements.
    const [currentMode, setCurrentMode] = useState('select'); // Represents the current interaction mode of the canvas (e.g., select, place, arc).
    const [showCapacityEditorMode, setShowCapacityEditorMode] = useState(false); // Toggles the visibility of the place capacity editor.
    const [animationMessage, setAnimationMessage] = useState<string | null>(null); // Message about animation status
    
    // ----- Refs for Direct DOM Access or Persistent Mutable Values -----
    const dragStartPositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map()); // Stores the initial {x, y} positions of elements at the beginning of a drag operation.
    const titleRef = useRef<EditableTitleRef>(null); // Ref for the main project title editor

    // token animator instance
    const tokenAnimator = useMemo(() => new TokenAnimator(), []);

    // =========================================================================================
    // II. INITIALIZATION & PERSISTENCE EFFECTS
    // =========================================================================================

    // Effect for creating an initial page if no state was loaded from localStorage
    useEffect(() => {
        if (Object.keys(pages).length === 0 && pageOrder.length === 0 && !initialPersistedState) {
            const initialPageId = `page_${Date.now()}`;
            const newPage: PetriNetPageData = {
                id: initialPageId,
                title: "Page 1",
                places: [],
                transitions: [],
                arcs: [],
                deterministicMode: false,
                conflictResolutionMode: false,
                conflictingTransitions: [],
                selectedElements: [],
                history: { places: [], transitions: [], arcs: [], title: [] },
                zoomLevel: .85,
                panOffset: { x: -880, y: -400 },
                validatorConfigs: { ...defaultValidatorConfigs } // Initialize
            };
            setPages({ [initialPageId]: newPage });
            setPageOrder([initialPageId]);
            setActivePageId(initialPageId);
            setProjectHasUnsavedChanges(false);
            setProjectFileHandle(null);
        }
    }, [initialPersistedState]); // Removed 'pages' and 'pageOrder' from deps as they are set inside

    useEffect(() => {
        const stateToSave: PersistedAppState = {
            pages,
            activePageId,
            pageOrder,
            projectTitle,
            projectHasUnsavedChanges,
        };
        saveAppState(stateToSave);
    }, [pages, activePageId, pageOrder, projectTitle, projectHasUnsavedChanges]);

    // =========================================================================================
    // III. DERIVED STATE & MEMOIZED VALUES
    // =========================================================================================
    // Memoized data for the currently active page
    const activePageData = useMemo(() => activePageId ? pages[activePageId] : null, [pages, activePageId]);
    
    // Memoized DTO for the active Petri net (e.g., for simulation, validation, export)
    const petriNetDTO: PetriNetDTO | null = useMemo(() => {
        if (!activePageData) return null;
            return {
            title: activePageData.title,
            deterministicMode: activePageData.deterministicMode,
            places: activePageData.places.map((p) => ({
                id: p.id,
                tokens: p.tokens,
                name: p.name,
                x: p.x,
                y: p.y,
                radius: p.radius,
                bounded: p.bounded,
                capacity: p.capacity
            })),
            transitions: activePageData.transitions.map((t) => ({
            id: t.id,
            enabled: t.enabled,
            arcIds: t.arcIds,
            name: t.name,
            x: t.x,
            y: t.y,
            width: t.width,
            height: t.height
        })),
            arcs: activePageData.arcs.map((a) => ({
            id: a.id,
            type: a.type,
            incomingId: a.incomingId,
            outgoingId: a.outgoingId,
        })),
    };
    }, [activePageData]);

    const currentProjectDTO: ProjectDTO | null = useMemo(() => {

        if (Object.keys(pages).length === 0 && !projectTitle) return null;

        return {
            projectTitle,
            pages,
            pageOrder,
            activePageId,
            version: '1.0.0' 
        };
    }, [projectTitle, pages, pageOrder, activePageId]);

    // =========================================================================================
    // IV. CUSTOM HOOKS
    // =========================================================================================
    
    // History and keyboard management
    const { saveToHistory, handleUndo } = useHistoryAndKeyboard({
      activePageId,
      setPages,
      setProjectHasUnsavedChanges,
      setCurrentFiredTransitions,
      isTyping,
      handleCopy: () => {}, // Will be set by useClipboard
      handlePaste: () => {}, // Will be set by useClipboard
      setSelectedTool,
      clearActivePageSelection: () => {}, // Will be set by usePetriNetCore
      activePageData
    });

    // Petri net core operations
    const {
      handleSelectElement,
      clearActivePageSelection,
      handleMultiSelectElement,
      handleCanvasClick,
      handleArcPortClick,
    } = usePetriNetCore({
      activePageId,
      setPages,
      saveToHistory,
      setProjectHasUnsavedChanges,
      setSelectedTool,
      arcType,
      selectedTool,
      activePageData,
      dragStartPositionsRef
    });

    // Project management
    const {
      handleNewProject,
      onValidatorConfigsChangeCallback,
      handleCreatePage,
      handleCreatePageWithData,
      handleRenamePage,
      handleDeletePage,
    } = useProjectManagement({
      pages,
      setPages,
      pageOrder,
      setPageOrder,
      activePageId,
      setActivePageId,
      setProjectHasUnsavedChanges,
      setCurrentFiredTransitions,
      saveToHistory,
      defaultValidatorConfigs
    });

    // Simulation operations
    const {
      handleSimulate,
      continueSimulation,
      handleCompleteAnimations,
      handleReset,
      handleValidationResult,
    } = useSimulation({
      activePageId,
      activePageData,
      setPages,
      setCurrentFiredTransitions,
      setProjectHasUnsavedChanges,
      setAnimationMessage,
      tokenAnimator,
      handleUndo
    });

    // =========================================================================================
    // V. CLIPBOARD FUNCTIONALITY (Copy, Paste)
    // =========================================================================================
    const { clearClipboard } = useClipboard({
        places: activePageData?.places || [],
        transitions: activePageData?.transitions || [],
        arcs: activePageData?.arcs || [],
        selectedElements: activePageData?.selectedElements || [],
        setPlaces: (updater) => {
            if (!activePageId) return;
            setPages(prev => {
                if (!prev[activePageId!]) return prev;
                const currentPlaces = prev[activePageId!].places;
                const newPlaces = typeof updater === 'function' ? updater(currentPlaces) : updater;
                return { ...prev, [activePageId!]: { ...prev[activePageId!], places: newPlaces } };
            });
            setProjectHasUnsavedChanges(true);
        },
        setTransitions: (updater) => {
            if (!activePageId) return;
            setPages(prev => {
                if (!prev[activePageId!]) return prev;
                const currentTransitions = prev[activePageId!].transitions;
                const newTransitions = typeof updater === 'function' ? updater(currentTransitions) : updater;
                return { ...prev, [activePageId!]: { ...prev[activePageId!], transitions: newTransitions } };
            });
            setProjectHasUnsavedChanges(true);
        },
        setArcs: (updater) => {
            if (!activePageId) return;
            setPages(prev => {
                if (!prev[activePageId!]) return prev;
                const currentArcs = prev[activePageId!].arcs;
                const newArcs = typeof updater === 'function' ? updater(currentArcs) : updater;
                return { ...prev, [activePageId!]: { ...prev[activePageId!], arcs: newArcs } };
            });
            setProjectHasUnsavedChanges(true);
        },
        setSelectedElements: (updater) => {
            if (!activePageId) return;
            setPages(prev => {
                if (!prev[activePageId!]) return prev;
                const currentSelected = prev[activePageId!].selectedElements;
                const newSelected = typeof updater === 'function' ? updater(currentSelected) : updater;
                return { ...prev, [activePageId!]: { ...prev[activePageId!], selectedElements: newSelected } };
            });
        },
        saveToHistory: () => {
            if (activePageData) {
                 saveToHistory(activePageData);
                 setProjectHasUnsavedChanges(true);
            }
        }, 
    });

    // File operations
    const {
      handleSaveProject,
      handleSaveProjectAs,
      handleExportActivePage,
      handleOpenProject,
      handleImportPages,
      handleLegacyImport,
      handleSaveSnapshot,
      handleRestoreSnapshot,
    } = useFileOperations({
      projectTitle,
      pages,
      pageOrder,
      activePageId,
      setProjectTitle,
      setPages,
      setPageOrder,
      setActivePageId,
      setCurrentFiredTransitions,
      setProjectHasUnsavedChanges,
      setProjectFileHandle,
      clearClipboard,
      activePageData,
      handleCreatePageWithData
    });

    // Canvas interactions
    const {
      updatePlaceSize,
      updateTransitionSize,
      updateElementPosition,
      handleTokenUpdate,
      handleNameUpdate,
      handleUpdatePlaceCapacity,
      handleSetDeterministicMode,
      handleViewChange,
      handleZoomLevelChange,
      handleCenterView,
      handleReorderPages,
    } = useCanvasInteractions({
      activePageId,
      activePageData,
      pages,
      setPages,
      setProjectHasUnsavedChanges,
      saveToHistory,
      pageOrder,
      setPageOrder
    });

    // =========================================================================================
    // VI. GENERAL UI HANDLERS
    // =========================================================================================
    
    const handleTypingChange = (typing: boolean) => {
        setIsTyping(typing);
    };

    // =========================================================================================
    // VII. KEYBOARD SHORTCUTS & GLOBAL EVENT LISTENERS
    // =========================================================================================
    // Keyboard shortcuts are now handled by useHistoryAndKeyboard hook

    useEffect(() => {
        if (selectedTool === 'ARC') {
            setCurrentMode('arc');
        } else if (selectedTool === 'PLACE') {
            setCurrentMode('place');
        } else if (selectedTool === 'TRANSITION') {
            setCurrentMode('transition');
        } else {
            setCurrentMode('select');
        }
    }, [selectedTool]);


    // =========================================================================================
    // XVIII. RENDER
    // =========================================================================================
    return (
        <div className="app">
            <EditableTitle 
                ref={titleRef}
                title={projectTitle} 
                onTitleChange={(newTitle) => {
                    if (newTitle !== projectTitle) {
                        setProjectTitle(newTitle);
                        setProjectHasUnsavedChanges(true);
                    }
                }}
            />
            
            <MenuBar
                projectData={currentProjectDTO}
                onNewProject={handleNewProject}
                onImport={handleLegacyImport}
                onOpenProject={handleOpenProject}
                onSaveProject={handleSaveProject}
                onSaveProjectAs={handleSaveProjectAs}
                onImportPages={handleImportPages}
                onExportActivePage={handleExportActivePage}
                onExportProject={() => { 
                    const projectToExport: ProjectDTO = { 
                        projectTitle: projectTitle,
                        pages: pages,
                        pageOrder: pageOrder,
                        activePageId: activePageId,
                        version: '1.0.0'
                    };
                    downloadJSON(projectToExport, `${projectTitle.replace(/\s+/g, '_')}_project.pats`);
                }}
                currentZoom={activePageData?.zoomLevel || 1}
                onZoomChange={handleZoomLevelChange} 
                onCreatePage={handleCreatePage}
                projectFileHandle={projectFileHandle}
                projectHasUnsavedChanges={projectHasUnsavedChanges}
                onRenameProjectTitle={(newTitle: string) => {
                    if (newTitle !== projectTitle) {
                        setProjectTitle(newTitle);
                        setProjectHasUnsavedChanges(true);
                    }
                }}
                onSaveSnapshot={handleSaveSnapshot}
                onRestoreSnapshot={handleRestoreSnapshot}
                hasSnapshot={!!activePageData?.snapshot}
                activePageTitle={activePageData?.title || 'No Page'}

            />

            <div className="main-content">
                <div className="left-sidebar">
                    <div className="toolbar-container">
                        <Toolbar
                            selectedTool={selectedTool}
                            setSelectedTool={(tool) => {
                                if (tool === 'ARC') {
                                    clearActivePageSelection();
                                }
                                setSelectedTool(tool);
                            }}
                            arcType={arcType}
                            setArcType={setArcType}
                            showCapacityEditorMode={showCapacityEditorMode}
                            onToggleCapacityEditorMode={setShowCapacityEditorMode}
                        />
                    </div>

                    <div className="controls-section">
                        {/* Deterministic Mode Switch */}
                        <div className="control-item">
                            <span className="control-label">Deterministic Mode</span>
                            <label className="switch-container" htmlFor="deterministic-mode">
                            <input
                                type="checkbox"
                                id="deterministic-mode"
                                checked={activePageData?.deterministicMode ?? false}
                                    onChange={(e) => handleSetDeterministicMode(e.target.checked)}
                                    style={{ opacity: 0, width: 0, height: 0 }}
                                />
                                <span className="switch-slider round"></span>
                            </label>
                        </div>

                        {/* Show Capacity Switch */}
                        <div className="control-item">
                            <span className="control-label">Show Capacity</span>
                            <label className="switch-container" htmlFor="capacity-mode-toggle">
                                <input
                                    type="checkbox"
                                    id="capacity-mode-toggle"
                                    checked={showCapacityEditorMode}
                                    onChange={(e) => setShowCapacityEditorMode(e.target.checked)}
                                    style={{ opacity: 0, width: 0, height: 0 }}
                                />
                                <span className="switch-slider round"></span>
                            </label>
                        </div>
                        
                        <button 
                            onClick={handleSimulate} 
                            className="next-state-button"
                            title="Advance the Petri net to the next state"
                        >
                            Next State
                        </button>
                        
                        {animationMessage && (
                            <div className="animation-message">
                                {animationMessage}
                                <button 
                                    onClick={handleCompleteAnimations}
                                    className="animation-skip-button"
                                >
                                    Skip
                                </button>
                            </div>
                        )}
                        
                        {activePageData?.conflictResolutionMode && (
                            <div className="conflict-resolution-message">
                                Select one transition to fire
                            </div>
                        )}
                    </div>
                    
                    <div className="sidebar-spacer"></div>
                    
                    <div className="reset-section">
                        <button 
                            onClick={handleReset} 
                            className="reset-canvas-button"
                            title="Clear all elements from the canvas"
                        >
                            Reset Canvas
                        </button>
                    </div>
                </div>

                <div className="center-area">
                    <div className="canvas-container-main">
                        <Canvas
                            places={activePageData?.places || []}
                            transitions={activePageData?.transitions || []}
                            arcs={activePageData?.arcs || []}
                            selectedElements={activePageData?.selectedElements || []}
                            onCanvasClick={handleCanvasClick}
                            onSelectElement={handleSelectElement}
                            onMultiSelectElement={handleMultiSelectElement}
                            onUpdatePlaceSize={updatePlaceSize}
                            onUpdateTransitionSize={updateTransitionSize}
                            onUpdateElementPosition={updateElementPosition}
                            onArcPortClick={handleArcPortClick}
                            selectedTool={selectedTool}
                            onSelectTool={setSelectedTool} 
                            arcType={arcType}
                            onUpdateToken={handleTokenUpdate}
                            onTypingChange={handleTypingChange}
                            onUpdateName={handleNameUpdate}
                            conflictResolutionMode={activePageData?.conflictResolutionMode ?? false}
                            conflictingTransitions={activePageData?.conflictingTransitions || []}
                            onConflictingTransitionSelect={continueSimulation}
                            firedTransitions={currentFiredTransitions} 
                            onUpdatePlaceCapacity={handleUpdatePlaceCapacity}
                            showCapacityEditorMode={showCapacityEditorMode}
                            zoomLevel={activePageData?.zoomLevel ?? 1}
                            panOffset={activePageData?.panOffset ?? {x: 0, y: 0}}
                            onViewChange={handleViewChange}
                            onCenterView={handleCenterView}
                            tokenAnimator={tokenAnimator}
                        />
                    </div>
                    
                    <PagesComponent 
                        pages={pages}
                        pageOrder={pageOrder}
                        activePageId={activePageId}
                        onSelectPage={setActivePageId}
                        onCreatePage={handleCreatePage}
                        onRenamePage={handleRenamePage}
                        onDeletePage={handleDeletePage}
                        onReorderPages={handleReorderPages}
                        onCreatePageWithData={handleCreatePageWithData}
                    />
                </div>

                <div className="right-panel">
                    {petriNetDTO && activePageData && (
                    <TabbedPanel
                        data={petriNetDTO}
                        onValidationResult={handleValidationResult}
                        selectedElements={activePageData?.selectedElements || []}
                        autoScrollEnabled={autoScrollEnabled}
                        onAutoScrollToggle={setAutoScrollEnabled}
                        currentMode={currentMode}
                        width="100%"
                        height="100%"
                        activePageId={activePageId}
                        validatorConfigs={activePageData.validatorConfigs || defaultValidatorConfigs}
                        onValidatorConfigsChange={onValidatorConfigsChangeCallback}
                    />
                    )}
                    {!petriNetDTO && (
                        <div className="no-active-page">
                            No active Petri net selected.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
// src/App.tsx
