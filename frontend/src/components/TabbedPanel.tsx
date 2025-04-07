import { useState } from 'react';
import { JSONViewer } from './JSONViewer';
import { ValidatorTool } from './ValidatorTool';
import { PetriNetDTO, ValidationResult, PlaceConfig } from '../types';
import './styles/TabbedPanel.css';

type Tab = 'json' | 'validator';

interface TabbedPanelProps {
  data: PetriNetDTO;
  width?: string | number;
  height?: string | number;
  selectedElements?: string[];
  autoScrollEnabled?: boolean;
  onAutoScrollToggle?: (enabled: boolean) => void;
  currentMode?: string;
  onValidationResult?: (result: ValidationResult) => void;
}

export function TabbedPanel({
  data,
  width = 400,
  height = 600,
  selectedElements = [],
  autoScrollEnabled = true,
  onAutoScrollToggle,
  currentMode = '',
  onValidationResult
}: TabbedPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>('validator');
  
  // Maintain validator state between tab switches
  const [inputConfigs, setInputConfigs] = useState<PlaceConfig[]>([]);
  const [expectedOutputs, setExpectedOutputs] = useState<PlaceConfig[]>([]);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [emptyInputFields, setEmptyInputFields] = useState<{[index: number]: boolean}>({});
  const [emptyOutputFields, setEmptyOutputFields] = useState<{[index: number]: boolean}>({});

  // Handle validation results
  const handleValidate = (result: ValidationResult) => {
    setValidationResult(result);
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
          label="Validator" 
          isActive={activeTab === 'validator'} 
          onClick={() => setActiveTab('validator')}
        />
        <TabButton 
          label="Viewer" 
          isActive={activeTab === 'json'} 
          onClick={() => setActiveTab('json')}
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
            onValidate={handleValidate}
            inputConfigs={inputConfigs}
            setInputConfigs={setInputConfigs}
            expectedOutputs={expectedOutputs}
            setExpectedOutputs={setExpectedOutputs}
            persistedValidationResult={validationResult}
            setValidationResult={setValidationResult}
            emptyInputFields={emptyInputFields}
            setEmptyInputFields={setEmptyInputFields}
            emptyOutputFields={emptyOutputFields}
            setEmptyOutputFields={setEmptyOutputFields}
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