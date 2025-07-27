import { useState, useEffect, Dispatch, SetStateAction } from 'react';
import { PetriNetDTO, PlaceConfig, ValidationResult } from '../types';
import './styles/ValidatorTool.css';

interface ValidatorToolProps {
  data: PetriNetDTO;
  width?: string | number;
  height?: string | number;
  onValidate?: (result: ValidationResult) => void;
  // Props for persisting state
  inputConfigs?: PlaceConfig[];
  setInputConfigs?: Dispatch<SetStateAction<PlaceConfig[]>>;
  outputConfigs?: PlaceConfig[];
  setOutputConfigs?: Dispatch<SetStateAction<PlaceConfig[]>>;
  persistedValidationResult?: ValidationResult | null;
  setValidationResult?: Dispatch<SetStateAction<ValidationResult | null>>;
  emptyInputFields?: {[index: number]: boolean};
  setEmptyInputFields?: Dispatch<SetStateAction<{[index: number]: boolean}>>;
  emptyOutputFields?: {[index: number]: boolean};
  setEmptyOutputFields?: Dispatch<SetStateAction<{[index: number]: boolean}>>;
  activePageId?: string | null;
}

export function ValidatorTool({
  data,
  onValidate,
  // Persisted state from parent
  inputConfigs: externalInputConfigs,
  setInputConfigs: externalSetInputConfigs,
  outputConfigs: externalOutputConfigs,
  setOutputConfigs: externalSetOutputConfigs,
  persistedValidationResult,
  setValidationResult: externalSetValidationResult,
  emptyInputFields: externalEmptyInputFields,
  setEmptyInputFields: externalSetEmptyInputFields,
  emptyOutputFields: externalEmptyOutputFields,
  setEmptyOutputFields: externalSetEmptyOutputFields,
  activePageId
}: ValidatorToolProps) {
  // Use local state if no external state is provided (backwards compatibility)
  const [localInputConfigs, setLocalInputConfigs] = useState<PlaceConfig[]>([]);
  const [localOutputConfigs, setLocalOutputConfigs] = useState<PlaceConfig[]>([]);
  const [localValidationResult, setLocalValidationResult] = useState<ValidationResult | null>(null);
  const [localEmptyInputFields, setLocalEmptyInputFields] = useState<{[index: number]: boolean}>({});
  const [localEmptyOutputFields, setLocalEmptyOutputFields] = useState<{[index: number]: boolean}>({});
  
  // Determine which state and state setters to use
  const inputConfigs = externalInputConfigs !== undefined ? externalInputConfigs : localInputConfigs;
  const setInputConfigs = externalSetInputConfigs || setLocalInputConfigs;
  const outputConfigs = externalOutputConfigs !== undefined ? externalOutputConfigs : localOutputConfigs;
  const setOutputConfigs = externalSetOutputConfigs || setLocalOutputConfigs;
  const validationResult = persistedValidationResult !== undefined ? persistedValidationResult : localValidationResult;
  const setValidationResult = externalSetValidationResult || setLocalValidationResult;
  const emptyInputFields = externalEmptyInputFields !== undefined ? externalEmptyInputFields : localEmptyInputFields;
  const setEmptyInputFields = externalSetEmptyInputFields || setLocalEmptyInputFields;
  const emptyOutputFields = externalEmptyOutputFields !== undefined ? externalEmptyOutputFields : localEmptyOutputFields;
  const setEmptyOutputFields = externalSetEmptyOutputFields || setLocalEmptyOutputFields;
  
  const [isValidating, setIsValidating] = useState(false);

  // Filter places with names for selection
  const namedPlaces = data.places.filter(place => place.name && place.name.trim() !== '');

  // Sync with canvas - remove configurations for places that no longer exist
  useEffect(() => {
    // Get current place IDs from the data
    const currentPlaceIds = new Set(data.places.map(place => place.id));
    
    // Filter out input configs with places that no longer exist
    const newInputConfigs = inputConfigs.filter(config => currentPlaceIds.has(config.placeId));
    if (newInputConfigs.length !== inputConfigs.length) {
      setInputConfigs(newInputConfigs);
    }
    
    // Filter out output configs with places that no longer exist
    const newOutputConfigs = outputConfigs.filter(config => currentPlaceIds.has(config.placeId));
    if (newOutputConfigs.length !== outputConfigs.length) {
      setOutputConfigs(newOutputConfigs);
    }
    
    // If validation result exists, clear it when places change
    if (validationResult && (newInputConfigs.length !== inputConfigs.length || newOutputConfigs.length !== outputConfigs.length)) {
      setValidationResult(null);
    }
  }, [data.places, inputConfigs, outputConfigs, validationResult]);

  // Update dropdown selections only for places that exist but have no name
  useEffect(() => {
    if (namedPlaces.length === 0) {
      // If there are no named places left, clear all configurations
      if (inputConfigs.length > 0) {
        setInputConfigs([]);
      }
      if (outputConfigs.length > 0) {
        setOutputConfigs([]);
      }
      return;
    }

    // Get IDs of places that exist but have no names
    const allPlaceIds = new Set(data.places.map(place => place.id));
    const namedPlaceIds = new Set(namedPlaces.map(place => place.id));
    
    // Get IDs of places that exist but have no name
    const placesWithoutNames = [...allPlaceIds].filter(id => !namedPlaceIds.has(id));
    
    // Check if any input configs use places that exist but have no name
    let inputConfigsNeedUpdate = false;
    const updatedInputs = inputConfigs.filter(config => {
      // Keep only configs for places that exist
      if (!allPlaceIds.has(config.placeId)) {
        return false;
      }
      
      // If the place exists but has no name, flag for update
      if (placesWithoutNames.includes(config.placeId)) {
        inputConfigsNeedUpdate = true;
        return false; // Remove configs for places without names
      }
      
      return true; // Keep configs for named places
    });
    
    // Check if any output configs use places that exist but have no name
    let outputConfigsNeedUpdate = false;
    const updatedOutputs = outputConfigs.filter(config => {
      // Keep only configs for places that exist
      if (!allPlaceIds.has(config.placeId)) {
        return false;
      }
      
      // If the place exists but has no name, flag for update
      if (placesWithoutNames.includes(config.placeId)) {
        outputConfigsNeedUpdate = true;
        return false; // Remove configs for places without names
      }
      
      return true; // Keep configs for named places
    });
    
    // Only update state if changes were made
    if (inputConfigsNeedUpdate || updatedInputs.length !== inputConfigs.length) {
      setInputConfigs(updatedInputs);
    }
    
    if (outputConfigsNeedUpdate || updatedOutputs.length !== outputConfigs.length) {
      setOutputConfigs(updatedOutputs);
    }
    
    // Clear validation result if configurations changed
    if ((inputConfigsNeedUpdate || updatedInputs.length !== inputConfigs.length || 
         outputConfigsNeedUpdate || updatedOutputs.length !== outputConfigs.length) && 
        validationResult) {
      setValidationResult(null);
    }
  }, [namedPlaces, data.places, inputConfigs, outputConfigs, validationResult]);

  // Add a place to input configurations
  const addInputPlace = () => {
    if (namedPlaces.length === 0) return;

    const usedPlaceIds = new Set([
      ...inputConfigs.map(c => c.placeId),
      ...outputConfigs.map(c => c.placeId)
    ]);
    
    const availablePlaces = namedPlaces.filter(p => !usedPlaceIds.has(p.id));
    
    let placeIdToAdd: string;
    if (availablePlaces.length > 0) {
      // Prioritize places starting with 'input' (case-insensitive)
      const priorityPlace = availablePlaces.find(p => 
        p.name?.toLowerCase().startsWith('input')
      );
      // Fallback to the first available place if no priority place found
      placeIdToAdd = priorityPlace ? priorityPlace.id : availablePlaces[0].id;
    } else {
      // Fallback to the very first named place if no places are available
      placeIdToAdd = namedPlaces[0].id;
    }

    const newInput: PlaceConfig = {
      placeId: placeIdToAdd,
      tokens: 0
    };
    
    const newIndex = inputConfigs.length;
    setInputConfigs([...inputConfigs, newInput]);
    setEmptyInputFields({ ...emptyInputFields, [newIndex]: false });
  };

  // Add a place to output configurations
  const addOutputPlace = () => {
    if (namedPlaces.length === 0) return;

    const usedPlaceIds = new Set([
      ...inputConfigs.map(c => c.placeId),
      ...outputConfigs.map(c => c.placeId)
    ]);
    
    const availablePlaces = namedPlaces.filter(p => !usedPlaceIds.has(p.id));
    
    let placeIdToAdd: string;
    if (availablePlaces.length > 0) {
      // Prioritize places starting with 'output' (case-insensitive)
      const priorityPlace = availablePlaces.find(p => 
        p.name?.toLowerCase().startsWith('output')
      );
      // Fallback to the first available place if no priority place found
      placeIdToAdd = priorityPlace ? priorityPlace.id : availablePlaces[0].id;
    } else {
      // Fallback to the very first named place if no places are available
      placeIdToAdd = namedPlaces[0].id;
    }

    const newOutput: PlaceConfig = {
      placeId: placeIdToAdd,
      tokens: 0
    };
    
    const newIndex = outputConfigs.length;
    setOutputConfigs([...outputConfigs, newOutput]);
    setEmptyOutputFields({ ...emptyOutputFields, [newIndex]: false });
  };

  // Update input configuration
  const updateInputConfig = (index: number, field: keyof PlaceConfig, value: string | number) => {
    const updatedInputs = inputConfigs.map((item, idx) => {
      if (idx === index) {
        if (field === 'placeId') {
          return { ...item, placeId: value as string };
        } else if (field === 'tokens') {
          const newTokens = value === '' ? 0 : parseInt(value as string, 10) || 0;
          return { ...item, tokens: newTokens };
        }
      }
      return item;
    });
    setInputConfigs(updatedInputs);
  };

  // Update output configuration
  const updateOutputConfig = (index: number, field: keyof PlaceConfig, value: string | number) => {
    const updatedOutputs = outputConfigs.map((item, idx) => {
      if (idx === index) {
        if (field === 'placeId') {
          return { ...item, placeId: value as string };
        } else if (field === 'tokens') {
          const newTokens = value === '' ? 0 : parseInt(value as string, 10) || 0;
          return { ...item, tokens: newTokens };
        }
      }
      return item;
    });
    setOutputConfigs(updatedOutputs);
  };

  // Handle token increment for input
  const incrementInputTokens = (index: number) => {
    const updatedInputs = inputConfigs.map((item, idx) => {
      if (idx === index) {
        return { ...item, tokens: item.tokens + 1 };
      }
      return item;
    });
    setInputConfigs(updatedInputs);
    setEmptyInputFields({ ...emptyInputFields, [index]: false });
  };

  // Handle token decrement for input
  const decrementInputTokens = (index: number) => {
    const updatedInputs = inputConfigs.map((item, idx) => {
      if (idx === index && item.tokens > 0) {
        return { ...item, tokens: item.tokens - 1 };
      }
      return item;
    });
    setInputConfigs(updatedInputs);
  };

  // Handle token increment for output
  const incrementOutputTokens = (index: number) => {
    const updatedOutputs = outputConfigs.map((item, idx) => {
      if (idx === index) {
        return { ...item, tokens: item.tokens + 1 };
      }
      return item;
    });
    setOutputConfigs(updatedOutputs);
    setEmptyOutputFields({ ...emptyOutputFields, [index]: false });
  };

  // Handle token decrement for output
  const decrementOutputTokens = (index: number) => {
    const updatedOutputs = outputConfigs.map((item, idx) => {
      if (idx === index && item.tokens > 0) {
        return { ...item, tokens: item.tokens - 1 };
      }
      return item;
    });
    setOutputConfigs(updatedOutputs);
  };

  // Remove input configuration
  const removeInputConfig = (index: number) => {
    const updatedInputs = [...inputConfigs];
    updatedInputs.splice(index, 1);
    setInputConfigs(updatedInputs);
    
    // Update the empty fields state
    const newEmptyFields = { ...emptyInputFields };
    delete newEmptyFields[index];
    
    // Shift higher indices down
    Object.keys(newEmptyFields).forEach(key => {
      const keyNum = parseInt(key);
      if (keyNum > index) {
        newEmptyFields[keyNum - 1] = newEmptyFields[keyNum];
        delete newEmptyFields[keyNum];
      }
    });
    
    setEmptyInputFields(newEmptyFields);
  };

  // Remove output configuration
  const removeOutputConfig = (index: number) => {
    const updatedOutputs = [...outputConfigs];
    updatedOutputs.splice(index, 1);
    setOutputConfigs(updatedOutputs);
    
    // Update the empty fields state
    const newEmptyFields = { ...emptyOutputFields };
    delete newEmptyFields[index];
    
    // Shift higher indices down
    Object.keys(newEmptyFields).forEach(key => {
      const keyNum = parseInt(key);
      if (keyNum > index) {
        newEmptyFields[keyNum - 1] = newEmptyFields[keyNum];
        delete newEmptyFields[keyNum];
      }
    });
    
    setEmptyOutputFields(newEmptyFields);
  };

  // Run validation
  const runValidation = async () => {
    if (!activePageId) {
      setValidationResult({
        valid: false,
        message: 'Cannot validate: Active page ID is missing.',
        errors: ['Active page ID is missing.']
      });
      return;
    }
    if (inputConfigs.length === 0 || outputConfigs.length === 0) {
      setValidationResult({
        valid: false,
        message: 'You must specify at least one input and one expected output.',
        errors: ['Input or expected output is missing.']
      });
      return;
    }

    if (!data) {
      setValidationResult({
        valid: false,
        message: 'Cannot validate: Petri net data is missing.',
        errors: ['Petri net data is missing.']
      });
      return;
    }

    setIsValidating(true);
    try {
      //console.log('Incoming Petri net data:', data);

      // Ensure we have a valid PetriNetDTO with all required fields
      const petriNetData: PetriNetDTO = {
        places: data.places.map(place => ({
          id: place.id,
          tokens: place.tokens,
          name: place.name || '',
          x: place.x || 0,
          y: place.y || 0,
          radius: place.radius || 46,
          bounded: place.bounded || false,
          capacity: place.capacity || null
        })),
        transitions: data.transitions.map(transition => ({
          id: transition.id,
          enabled: transition.enabled,
          arcIds: transition.arcIds || [],
          name: transition.name || '',
          x: transition.x || 0,
          y: transition.y || 0,
          width: transition.width || 120,
          height: transition.height || 54
        })),
        arcs: data.arcs.map(arc => ({
          id: arc.id,
          type: arc.type,
          incomingId: arc.incomingId,
          outgoingId: arc.outgoingId
        })),
        deterministicMode: data.deterministicMode ?? false,
        title: data.title || ''
      };

      //console.log('Constructed PetriNetDTO:', petriNetData);

      const requestBody = {
        places: petriNetData.places,
        transitions: petriNetData.transitions,
        arcs: petriNetData.arcs,
        deterministicMode: petriNetData.deterministicMode,
        title: petriNetData.title,
        inputConfigs: inputConfigs.map(config => ({
          placeId: config.placeId,
          tokens: config.tokens
        })),
        expectedOutputs: outputConfigs.map(config => ({
          placeId: config.placeId,
          tokens: config.tokens
        }))
      };

      // Log the full request body for debugging
      console.log('Validation request body:', requestBody);

      const response = await fetch(`/api/page/${activePageId}/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Validation request failed: ${response.status} ${errorBody}`);
      }

      const result: ValidationResult = await response.json();
      setValidationResult(result);
      
      if (onValidate) {
        onValidate(result);
      }
    } catch (error) {
      console.error('Error validating Petri net:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const validationErrorResult: ValidationResult = {
        valid: false,
        message: `Error: ${errorMessage}`,
        errors: [errorMessage]
      };
      setValidationResult(validationErrorResult);
      if (onValidate) {
        onValidate(validationErrorResult);
      }
    } finally {
      setIsValidating(false);
    }
  };

  // Reset validation
  const resetValidation = () => {
    setInputConfigs([]);
    setOutputConfigs([]);
    setValidationResult(null);
    setEmptyInputFields({});
    setEmptyOutputFields({});
  };

  // Find place name by ID for display
  const getPlaceName = (id: string) => {
    const place = data.places.find(p => p.id === id);
    return place?.name || id;
  };

  // Find transition name by ID for display
  const getTransitionName = (id: string) => {
    const transition = data.transitions.find(t => t.id === id);
    return transition?.name && transition.name.trim() !== '' ? transition.name : id;
  };

  return (
    <div className="validator-container">
      <h3 className="validator-title">Petri Net Verifier</h3>
      
      {/* Input Configuration Section */}
      <div className="validator-section">
        <div className="validator-section-header">
          <h4 className="validator-section-title">Input Places</h4>
          <button 
            className="validator-button-add green"
            onClick={addInputPlace}
            disabled={namedPlaces.length === 0 || isValidating}
          >
            Add Input
          </button>
        </div>
        
        {inputConfigs.length === 0 ? (
          <p className="validator-empty-message">No input places named, please name your places.</p>
        ) : (
          <div>
            {inputConfigs.map((config, index) => {
              // Determine available places for this specific dropdown
              const otherInputPlaceIds = new Set(
                inputConfigs
                  .filter((_, i) => i !== index) // Exclude current row
                  .map(c => c.placeId)
              );
              const availableInputPlaces = namedPlaces.filter(
                p => p.id === config.placeId || !otherInputPlaceIds.has(p.id)
              );
              
              return (
                <div key={`input-${index}`} className="validator-config-item">
                  <select
                    className="validator-select"
                    value={config.placeId}
                    onChange={(e) => updateInputConfig(index, 'placeId', e.target.value)}
                    disabled={isValidating}
                  >
                    {availableInputPlaces.map(place => {
                      const displayText = place.name || place.id;
                      return (
                        <option key={place.id} value={place.id}>
                          {displayText}
                        </option>
                      );
                    })}
                  </select>
                  
                  <div className="validator-tokens-control">
                    <input
                      className="validator-input"
                      type="text"
                      value={emptyInputFields[index] ? '' : config.tokens}
                      onChange={(e) => {
                        const value = e.target.value;
                        updateInputConfig(index, 'tokens', value);
                        if (value === '') {
                          setEmptyInputFields({ ...emptyInputFields, [index]: true });
                        } else {
                          setEmptyInputFields({ ...emptyInputFields, [index]: false });
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.currentTarget.blur();
                        }
                      }}
                      min="0"
                      disabled={isValidating}
                    />
                    <div className="validator-button-controls">
                      <button
                        className="validator-button-increment"
                        onClick={() => incrementInputTokens(index)}
                        disabled={isValidating}
                        title="Increase tokens"
                      >
                        +
                      </button>
                      <button
                        className="validator-button-decrement"
                        onClick={() => decrementInputTokens(index)}
                        disabled={isValidating || config.tokens <= 0}
                        title="Decrease tokens"
                      >
                        -
                      </button>
                    </div>
                  </div>
                  
                  <button
                    className="validator-button-remove"
                    onClick={() => removeInputConfig(index)}
                    disabled={isValidating}
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Output Configuration Section */}
      <div className="validator-section">
        <div className="validator-section-header">
          <h4 className="validator-section-title">Expected Outputs</h4>
          <button 
            className="validator-button-add blue"
            onClick={addOutputPlace}
            disabled={namedPlaces.length === 0 || isValidating}
          >
            Add Output
          </button>
        </div>
        
        {outputConfigs.length === 0 ? (
          <p className="validator-empty-message">No expected outputs named, please name your places.</p>
        ) : (
          <div>
            {outputConfigs.map((output, index) => {
              // Determine available places for this specific dropdown
              const otherOutputPlaceIds = new Set(
                outputConfigs
                  .filter((_, i) => i !== index) // Exclude current row
                  .map(o => o.placeId)
              );
              const availableOutputPlaces = namedPlaces.filter(
                p => p.id === output.placeId || !otherOutputPlaceIds.has(p.id)
              );
              
              return (
                <div key={`output-${index}`} className="validator-config-item">
                  <select
                    className="validator-select"
                    value={output.placeId}
                    onChange={(e) => updateOutputConfig(index, 'placeId', e.target.value)}
                    disabled={isValidating}
                  >
                    {availableOutputPlaces.map(place => {
                      const displayText = place.name || place.id;
                      return (
                        <option key={place.id} value={place.id}>
                          {displayText}
                        </option>
                      );
                    })}
                  </select>
                  
                  <div className="validator-tokens-control">
                    <input
                      className="validator-input"
                      type="text"
                      value={emptyOutputFields[index] ? '' : output.tokens}
                      onChange={(e) => {
                        const value = e.target.value;
                        updateOutputConfig(index, 'tokens', value);
                        if (value === '') {
                          setEmptyOutputFields({ ...emptyOutputFields, [index]: true });
                        } else {
                          setEmptyOutputFields({ ...emptyOutputFields, [index]: false });
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.currentTarget.blur();
                        }
                      }}
                      min="0"
                      disabled={isValidating}
                    />
                    <div className="validator-button-controls">
                      <button
                        className="validator-button-increment"
                        onClick={() => incrementOutputTokens(index)}
                        disabled={isValidating}
                        title="Increase tokens"
                      >
                        +
                      </button>
                      <button
                        className="validator-button-decrement"
                        onClick={() => decrementOutputTokens(index)}
                        disabled={isValidating || output.tokens <= 0}
                        title="Decrease tokens"
                      >
                        -
                      </button>
                    </div>
                  </div>
                  
                  <button
                    className="validator-button-remove"
                    onClick={() => removeOutputConfig(index)}
                    disabled={isValidating}
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="validator-actions">
        <button
          className="validator-button-run"
          onClick={runValidation}
          disabled={inputConfigs.length === 0 || outputConfigs.length === 0 || isValidating}
        >
          {isValidating ? 'Validating...' : 'Run Verification'}
        </button>
        <button
          className="validator-button-reset"
          onClick={resetValidation}
          disabled={isValidating}
        >
          Reset
        </button>
      </div>

      {/* Validation Result Display */}
      {validationResult && (
        <div className="validator-result">
          {/* Determine overall status and message */} 
          {(() => {
            let displaySuccess = validationResult.valid; // Use the primary flag from the result
            let displayMessage = validationResult.message || '';
            
            // If outputMatches exist, use them to refine the status and message
            if (validationResult.outputMatches && Object.keys(validationResult.outputMatches).length > 0) {
              const allMatched = Object.values(validationResult.outputMatches).every(match => match);
              if (!allMatched) {
                displaySuccess = false; // Override success if any output didn't match
                displayMessage = "Output does not match expectations."; // Set specific message
              } else {
                // Only set to success if the backend also agreed (or didn't explicitly disagree)
                displaySuccess = validationResult.valid; 
                displayMessage = "Output matches expectations."; 
              }
            } else if (displaySuccess && !displayMessage) {
                // Handle case where backend says success but gives no specific message or outputMatches
                displayMessage = "Validation reported success.";
            } else if (!displaySuccess && !displayMessage) {
                // If backend failed and gave no message
                displayMessage = "Validation failed (no specific details provided).";
            }
            
            return (
              <h4 className={`validator-result-title ${displaySuccess ? 'success' : 'error'}`}>
                {/* Use the determined message, fallback to generic based on final success status */}
                {displayMessage || (displaySuccess ? 'Validation Successful' : 'Validation Failed')}
              </h4>
            );
          })()}
          
          {/* Display detailed output matches with final counts integrated */}
          {validationResult.outputMatches && Object.keys(validationResult.outputMatches).length > 0 && (
            <div>
              <h5 className="validator-result-section-title">Output Comparison:</h5>
              <ul className="validator-result-list">
                {Object.entries(validationResult.outputMatches).map(([placeId, matched], index) => {
                  // Get the place name
                  const placeName = getPlaceName(placeId);
                  const matchStatus = matched ? 'Matched' : 'Did not match';
                  const listItemClass = `validator-result-list-item ${matched ? 'success' : 'error'}`;

                  const finalPlace = validationResult.finalState?.places?.find((p: any) => p.id === placeId);
                  const finalTokens = finalPlace?.tokens ?? 'N/A';
                  
          
                  const expectedConfig = outputConfigs.find(eo => eo.placeId === placeId);
                  const expectedTokens = expectedConfig?.tokens ?? 'N/A';

                  return (
                    <li 
                      key={index} 
                      className={listItemClass}
                      title={`Expected: ${expectedTokens}`}
                    >
                      {`${placeName}: ${matchStatus} (Tokens: ${finalTokens})`}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          
          {/* Display conflicting transitions if they exist */}
          {validationResult.conflictingTransitions && validationResult.conflictingTransitions.length > 0 && (
            <div>
              <h5 className="validator-result-section-title">Conflicting Transitions Detected:</h5>
              <ul className="validator-result-list warning">
                {validationResult.conflictingTransitions.map((transitionId, index) => (
                  <li key={index} className="validator-result-list-item warning">
                    {getTransitionName(transitionId)} {}
                  </li>
                ))}
              </ul>
            </div>
          )}
          
        </div>
      )}
      
      {/* Explanation */}
      <div className="validator-footer">
        <p>
          <strong>How it works:</strong> The verifier runs your Petri net with the specified input tokens and checks if it reaches the expected output state. * The verifier always runs in deterministic mode.
        </p>
        <p style={{ marginBottom: 0 }}>
          It runs until no more transitions can fire or a conflict is detected between transitions.
        </p>
      </div>
    </div>
  );
}