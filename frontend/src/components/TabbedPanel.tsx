import { useState } from 'react';
import { JSONViewer } from './JSONViewer';
import { ValidatorTool } from './ValidatorTool';
import { AnalysisTool } from './AnalysisTool';
import { PetriNetDTO, ValidationResult, ValidatorPageConfig } from '../types';
import './styles/TabbedPanel.css';

type Tab = 'json' | 'validator' | 'analysis';

interface TabbedPanelProps {
  data: PetriNetDTO;
  width?: string | number;
  height?: string | number;
  selectedElements?: string[];
  autoScrollEnabled?: boolean;
  onAutoScrollToggle?: (enabled: boolean) => void;
  currentMode?: string;
  onValidationResult?: (result: ValidationResult) => void;
  activePageId?: string | null;
  validatorConfigs?: ValidatorPageConfig;
  onValidatorConfigsChange?: (newConfigs: Partial<ValidatorPageConfig>) => void;
}

export function TabbedPanel({
  data,
  width = 400,
  height = 600,
  selectedElements = [],
  autoScrollEnabled = true,
  onAutoScrollToggle,
  currentMode = '',
  onValidationResult,
  activePageId,
  validatorConfigs,
  onValidatorConfigsChange
}: TabbedPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>('validator');
  
  // Use provided configs or a default if somehow not passed (shouldn't happen with App.tsx changes)
  const currentValidatorConfigs = validatorConfigs || {
      inputConfigs: [],
      outputConfigs: [],
      validationResult: null,
      emptyInputFields: {},
      emptyOutputFields: {},
  };

  const handleFullValidate = (result: ValidationResult) => {
    if (onValidatorConfigsChange) {
        onValidatorConfigsChange({ validationResult: result });
    }
    // If App.tsx still has a direct onValidationResult, call it.
    // This might be redundant if App.tsx only cares about the config object changing.
    if (onValidationResult) {
        onValidationResult(result);
    }
  };

  // Calculate panel dimensions
  const panelStyle = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
    maxWidth: "100%",
  };

  return (
    <div className="tabbed-panel" style={panelStyle}>
      {/* Tab header */}
      <div className="tab-header">
        <TabButton 
          label="Verifier" 
          isActive={activeTab === 'validator'} 
          onClick={() => setActiveTab('validator')}
        />
        <TabButton 
          label="Viewer" 
          isActive={activeTab === 'json'} 
          onClick={() => setActiveTab('json')}
        />
        <TabButton 
          label="Analysis" 
          isActive={activeTab === 'analysis'} 
          onClick={() => setActiveTab('analysis')}
        />
      </div>
      
      {/* Tab content */}
      <div className="tab-content">
        {activeTab === 'json' && (
          <JSONViewer
            data={data}
            width="100%" 
            height="100%"
            selectedElements={selectedElements}
            autoScrollEnabled={autoScrollEnabled}
            onAutoScrollToggle={onAutoScrollToggle}
            currentMode={currentMode}
          />
        )}
        
        {activeTab === 'validator' && (
          <ValidatorTool
            data={data}
            width="100%"
            height="100%"
            onValidate={handleFullValidate}
            inputConfigs={currentValidatorConfigs.inputConfigs}
            setInputConfigs={(updater) => {
                if (onValidatorConfigsChange) {
                    const newValues = typeof updater === 'function' ? updater(currentValidatorConfigs.inputConfigs) : updater;
                    onValidatorConfigsChange({ inputConfigs: newValues });
                }
            }}
            outputConfigs={currentValidatorConfigs.outputConfigs}
            setOutputConfigs={(updater) => {
                if (onValidatorConfigsChange) {
                    const newValues = typeof updater === 'function' ? updater(currentValidatorConfigs.outputConfigs) : updater;
                    onValidatorConfigsChange({ outputConfigs: newValues });
                }
            }}
            persistedValidationResult={currentValidatorConfigs.validationResult}
            setValidationResult={(updater) => {
                if (onValidatorConfigsChange) {
                    const newValues = typeof updater === 'function' ? updater(currentValidatorConfigs.validationResult) : updater;
                    onValidatorConfigsChange({ validationResult: newValues });
                }
            }}
            emptyInputFields={currentValidatorConfigs.emptyInputFields}
            setEmptyInputFields={(updater) => {
                if (onValidatorConfigsChange) {
                    const newValues = typeof updater === 'function' ? updater(currentValidatorConfigs.emptyInputFields) : updater;
                    onValidatorConfigsChange({ emptyInputFields: newValues });
                }
            }}
            emptyOutputFields={currentValidatorConfigs.emptyOutputFields}
            setEmptyOutputFields={(updater) => {
                if (onValidatorConfigsChange) {
                    const newValues = typeof updater === 'function' ? updater(currentValidatorConfigs.emptyOutputFields) : updater;
                    onValidatorConfigsChange({ emptyOutputFields: newValues });
                }
            }}
            activePageId={activePageId}
          />
        )}
        {activeTab === 'analysis' && (
          <AnalysisTool
            data={data}
            width="100%"
            height="100%"
          />
        )}
      </div>
    </div>
  );
}

// Helper component for tab buttons
interface TabButtonProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
}

function TabButton({ label, isActive, onClick }: TabButtonProps) {
  return (
    <button
      className={`tab-button ${isActive ? 'active' : ''}`}
      onClick={onClick}
    >
      {label}
    </button>
  );
} 