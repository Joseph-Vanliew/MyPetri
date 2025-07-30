src/
├── main.tsx                           # Application entry point
├── App.tsx                           # Root application component
├── index.css                         # Global styles
├── vite-env.d.ts                     # Vite environment types
│
├── stores/                           # All state management
│   ├── index.ts                      # Store exports
│   ├── storeUtils.ts                # Store utility functions
│   ├── layoutStore.ts               # Layout state (sidebar widths, collapsed states)
│   ├── tabStore.ts                 # Multi-tab support (multiple projects)
│   ├── projectStore.ts             # Project state management
│   ├── elementsStore.ts            # All element data across all pages
│   ├── canvasStore.ts              # Canvas UI state only
│   ├── toolbarStore.ts             # Tool selection state
│   ├── leftSidebarStore.ts         # Tool options state
│   ├── validatorStore.ts           # Validation state
│   ├── analyzerStore.ts            # Analysis state
│   ├── fileManagerStore.ts         # File operations state
│   └── simulationStore.ts          # Simulation state
│
├── layout/                           # Layout management
│   ├── components/
│   │   ├── AppLayout.tsx             # Main layout orchestrator
│   │   ├── TitleSection.tsx          # Project title + file menu
│   │   ├── Ribbon.tsx               # Tool selection + file operations
│   │   ├── MainContent.tsx          # Left + Center + Right layout
│   │   ├── CenterContent.tsx        # Canvas + Pages layout
│   │   ├── PagesSection.tsx         # Page tabs at bottom
│   │   ├── LeftSidebar.tsx          # Tool options panel
│   │   ├── RightSidebar.tsx         # Analysis tools panel
│   │   └── StatusBar.tsx            # Simulation controls
│   ├── hooks/
│   │   └── useLayout.ts            # Layout-specific hooks
│   └── layout.css                  # Layout styles
│
├── project/                         # Project and file management
│   ├── components/
│   │   ├── ProjectManager.tsx       # Project operations
│   │   ├── FileMenu.tsx            # File operations UI
│   │   ├── EditableTitle.tsx       # Editable project title
│   │   └── ProjectSettings.tsx     # Project settings dialog
│   ├── hooks/
│   │   ├── useProjectManagement.ts # Project management hooks
│   │   └── useFileOperations.ts    # File operations hooks
│   ├── utils/
│   │   └── projectUtils.ts         # Project utility functions
│   └── project.css                 # Project styles
│
├── elements/                        # Element data and registry
│   ├── components/
│   │   ├── ElementRenderer.tsx      # Generic element renderer
│   │   ├── ElementFactory.tsx       # Element creation factory
│   │   ├── Place.tsx               # Place element renderer
│   │   ├── Transition.tsx          # Transition element renderer
│   │   ├── Arc.tsx                # Arc element renderer
│   │   ├── TokenAnimations.tsx     # Token animation component
│   │   └── ElementPreview.tsx      # Element preview for toolbar
│   ├── registry/
│   │   ├── ElementRegistry.ts      # Element type registry
│   │   ├── ElementTypes.ts        # Element type definitions
│   │   └── ElementBehaviors.ts    # Behavior definitions
│   ├── hooks/
│   │   ├── useElementRegistry.ts  # Element registry hooks
│   │   ├── useElementBehaviors.ts # Element behavior hooks
│   │   └── useElementFactory.ts   # Element factory hooks
│   ├── utils/
│   │   └── elementUtils.ts        # Element utility functions
│   ├── elements.css               # Element styles
│   └── README.md                  # Element registry documentation
│
├── canvas/                         # Canvas UI and interactions
│   ├── components/
│   │   ├── Canvas.tsx              # Main canvas orchestrator
│   │   ├── CanvasRenderer.tsx      # SVG rendering layer
│   │   ├── InteractionLayer.tsx    # Mouse/keyboard event handling
│   │   ├── SelectionBox.tsx       # Multi-selection rectangle
│   │   ├── Grid.tsx               # Grid system
│   │   ├── AlignmentGuides.tsx    # Visual alignment helpers
│   │   ├── ZoomControls.tsx       # Zoom in/out controls
│   │   └── CanvasOverlay.tsx      # Canvas overlay elements
│   ├── hooks/
│   │   ├── useCanvasInteractions.ts # Canvas interaction hooks
│   │   ├── useCanvasCommands.ts   # Canvas command hooks
│   │   ├── useZoomAndPan.ts       # Zoom and pan hooks
│   │   ├── useSelection.ts        # Selection hooks
│   │   └── useCanvasEvents.ts     # Canvas event hooks
│   ├── utils/
│   │   ├── coordinateUtils.ts     # Coordinate transformations
│   │   └── canvasUtils.ts         # Canvas utility functions
│   └── canvas.css                 # Canvas styles
│
├── tools/                          # Tool selection and options
│   ├── toolbar/
│   │   ├── components/
│   │   │   ├── Toolbar.tsx         # Tool selection UI
│   │   │   ├── ToolButton.tsx      # Individual tool buttons
│   │   │   ├── ToolGroup.tsx       # Tool group container
│   │   │   └── ToolSeparator.tsx   # Visual separator
│   │   ├── hooks/
│   │   │   └── useToolbar.ts      # Toolbar hooks
│   │   └── toolbar.css            # Toolbar styles
│   │
│   ├── options/
│   │   ├── components/
│   │   │   ├── PlaceOptions.tsx    # Place-specific options
│   │   │   ├── TransitionOptions.tsx # Transition-specific options
│   │   │   ├── ArcOptions.tsx      # Arc-specific options
│   │   │   ├── TextOptions.tsx     # Text-specific options
│   │   │   └── ShapeOptions.tsx    # Shape-specific options
│   │   ├── hooks/
│   │   │   └── useLeftSidebar.ts   # Left sidebar hooks
│   │   └── leftSidebar.css         # Left sidebar styles
│   │
│   ├── validator/
│   │   ├── components/
│   │   │   ├── ValidatorTool.tsx   # Main validator component
│   │   │   ├── InputConfigEditor.tsx # Input place configuration
│   │   │   ├── OutputConfigEditor.tsx # Output place configuration
│   │   │   ├── ValidationResults.tsx # Validation results display
│   │   │   └── ValidationForm.tsx  # Validation form
│   │   ├── hooks/
│   │   │   └── useValidator.ts    # Validator hooks
│   │   ├── utils/
│   │   │   └── validatorUtils.ts  # Validator utilities
│   │   └── validator.css          # Validator styles
│   │
│   ├── analyzer/
│   │   ├── components/
│   │   │   ├── AnalysisTool.tsx    # Main analysis component
│   │   │   ├── AnalysisResults.tsx # Analysis results display
│   │   │   ├── AnalysisForm.tsx    # Analysis form
│   │   │   └── AnalysisTypes.tsx   # Analysis type selection
│   │   ├── hooks/
│   │   │   └── useAnalyzer.ts     # Analyzer hooks
│   │   ├── utils/
│   │   │   └── analyzerUtils.ts   # Analysis utilities
│   │   └── analyzer.css           # Analysis styles
│   │
│   ├── jsonViewer/
│   │   ├── components/
│   │   │   ├── JSONViewer.tsx      # Main JSON viewer component
│   │   │   ├── ObjectTree.tsx      # Object tree view
│   │   │   ├── PropertyViewer.tsx  # Property viewer
│   │   │   └── SearchFilter.tsx    # Search and filter
│   │   ├── hooks/
│   │   │   └── useJSONViewer.ts   # JSON viewer hooks
│   │   ├── utils/
│   │   │   └── jsonViewerUtils.ts # JSON viewer utilities
│   │   └── jsonViewer.css         # JSON viewer styles
│   │
│   └── fileManager/
│       ├── components/
│       │   ├── FileManager.tsx     # File operations component
│       │   ├── SaveDialog.tsx      # Save dialog
│       │   ├── LoadDialog.tsx      # Load dialog
│       │   └── ExportDialog.tsx    # Export dialog
│       ├── hooks/
│       │   └── useFileManager.ts   # File manager hooks
│       ├── utils/
│       │   └── fileUtils.ts        # File utility functions
│       └── fileManager.css         # File manager styles
│
├── simulation/                      # Simulation logic and state
│   ├── components/
│   │   ├── SimulationControls.tsx  # Simulation UI controls
│   │   ├── TokenAnimator.tsx       # Token animation component
│   │   ├── SimulationPanel.tsx     # Simulation panel
│   │   ├── StepControls.tsx        # Step-by-step controls
│   │   └── SimulationStatus.tsx    # Simulation status display
│   ├── services/
│   │   └── simulationService.ts    # Pure simulation logic
│   ├── hooks/
│   │   ├── useSimulation.ts        # Main simulation hook
│   │   ├── useSimulationAPI.ts     # Backend communication
│   │   ├── useAnimationManager.ts  # Animation coordination
│   │   └── useConflictResolution.ts # Conflict resolution
│   ├── utils/
│   │   └── simulationUtils.ts      # Simulation utility functions
│   ├── types/
│   │   └── simulation.ts           # Simulation types
│   └── simulation.css              # Simulation styles
│
├── ui/                             # Shared UI components
│   ├── components/
│   │   ├── Button.tsx              # Reusable button component
│   │   ├── Input.tsx               # Reusable input component
│   │   ├── Select.tsx              # Reusable select component
│   │   ├── Modal.tsx               # Modal dialog component
│   │   ├── Tooltip.tsx             # Tooltip component
│   │   ├── Dropdown.tsx            # Dropdown component
│   │   ├── Loading.tsx             # Loading component
│   │   ├── ResizablePanel.tsx      # Resizable panel component
│   │   ├── SplitPane.tsx           # Split pane component
│   │   ├── Draggable.tsx           # Draggable component
│   │   ├── ErrorBoundary.tsx       # Error boundary component
│   │   ├── Portal.tsx              # Portal component
│   │   └── ContextMenu.tsx         # Context menu component
│   └── ui.css                      # UI component styles
│
├── hooks/                          # Shared hooks
│   ├── useAppState.ts             # Global app state hook
│   ├── useKeyboardShortcuts.ts    # Keyboard shortcuts
│   ├── useLocalStorage.ts         # Local storage persistence
│   ├── useDebounce.ts             # Debounce utility
│   └── usePrevious.ts             # Previous value hook
│
├── types/                          # Type definitions
│   ├── index.ts                    # Type exports
│   ├── common.ts                   # Common types
│   ├── api.ts                      # API types
│   ├── domain.ts                   # Domain types
│   ├── ui.ts                       # UI types
│   └── validation.ts              # Validation types
│
├── utils/                          # Utility functions
│   ├── api.ts                      # API utilities
│   ├── petriNetUtils.ts           # Petri net utilities
│   ├── coordinateUtils.ts         # Coordinate utilities
│   ├── validationUtils.ts         # Validation utilities
│   ├── fileUtils.ts               # File utilities
│   ├── mathUtils.ts               # Math utilities
│   └── stringUtils.ts             # String utilities
│
├── styles/                         # Global styles
│   ├── global.css                  # Global styles
│   ├── variables.css              # CSS variables
│   ├── animations.css             # Animation styles
│   ├── light.css                  # Light theme
│   └── dark.css                   # Dark theme
│
├── constants/                      # Application constants
│   ├── index.ts                    # Constant exports
│   ├── colors.ts                   # Color constants
│   ├── dimensions.ts              # Dimension constants
│   ├── keys.ts                    # Keyboard key constants
│   └── messages.ts                # Message constants
│
└── assets/                         # Static assets
    ├── icons/                      # Icon assets
    ├── images/                     # Image assets
    └── fonts/                      # Font assets