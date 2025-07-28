import { useState } from 'react';
import { PetriNetDTO, AnalysisResultDTO } from '../types';
import { analysisAPI } from '../utils/api';
import './styles/AnalysisTool.css';

interface AnalysisToolProps {
  data: PetriNetDTO;
  width?: string | number;
  height?: string | number;
}

export function AnalysisTool({
  data,
  width = 'auto',
  height = 'auto'
}: AnalysisToolProps) {
  const [results, setResults] = useState<AnalysisResultDTO | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Basic checks for data structure
  const numPlaces = data?.places?.length ?? 0;
  const numTransitions = data?.transitions?.length ?? 0;
  const numArcs = data?.arcs?.length ?? 0;

  const containerStyle = {
    width: width,
    height: height,
  };

  const handleAnalysis = async (analysisType: string, analysisFunction: () => Promise<AnalysisResultDTO>) => {
    setLoading(analysisType);
    setError(null);
    setResults(null);

    try {
      const result = await analysisFunction();
      setResults(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setLoading(null);
    }
  };

  const renderResults = () => {
    if (loading) {
      return <div className="analysis-loading">Running {loading} analysis...</div>;
    }

    if (error) {
      return <div className="analysis-error">Error: {error}</div>;
    }

    if (!results) {
      return <div className="analysis-results-placeholder">Analysis results will be displayed here.</div>;
    }

    return (
      <div className="analysis-results">
        <h4 className="analysis-results-title">{results.analysisType}</h4>
        <div className="analysis-results-content">
          <p className="analysis-details">{results.details}</p>
          
          {results.hasDeadlock !== undefined && (
            <p><strong>Deadlock:</strong> {results.hasDeadlock ? 'Yes' : 'No'}</p>
          )}
          
          {results.reachableStatesCount !== undefined && (
            <p><strong>Reachable States:</strong> {results.reachableStatesCount}</p>
          )}
          
          {results.exploredStatesCount !== undefined && (
            <p><strong>Explored States:</strong> {results.exploredStatesCount}</p>
          )}
          
          {results.enabledTransitionsCount !== undefined && (
            <p><strong>Enabled Transitions:</strong> {results.enabledTransitionsCount}</p>
          )}
          
          {results.boundedPlacesCount !== undefined && (
            <p><strong>Bounded Places:</strong> {results.boundedPlacesCount}</p>
          )}
          
          {results.unboundedPlacesCount !== undefined && (
            <p><strong>Unbounded Places:</strong> {results.unboundedPlacesCount}</p>
          )}
          
          {results.incidenceMatrix && (
            <div className="incidence-matrix">
              <h5>Incidence Matrix:</h5>
              <table>
                <tbody>
                  {results.incidenceMatrix.map((row, i) => (
                    <tr key={i}>
                      {row.map((cell, j) => (
                        <td key={j}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {results.reachableStates && results.reachableStates.length > 0 && (
            <div className="reachable-states">
              <h5>Reachable States:</h5>
              <ul>
                {results.reachableStates.slice(0, 10).map((state, index) => (
                  <li key={index}>{state}</li>
                ))}
                {results.reachableStates.length > 10 && (
                  <li>... and {results.reachableStates.length - 10} more</li>
                )}
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="analysis-container" style={containerStyle}>
      <h3 className="analysis-title">Analysis Tool</h3>
      
      <div className="analysis-section">
        <h4 className="analysis-section-title">Petri Net Overview</h4>
        <ul className="analysis-overview">
          <li>Places: {numPlaces}</li>
          <li>Transitions: {numTransitions}</li>
          <li>Arcs: {numArcs}</li>
        </ul>
      </div>

      <div className="analysis-section">
        <h4 className="analysis-section-title">Analysis Options</h4>
        
        <div className="analysis-button-group">
          <button 
            onClick={() => handleAnalysis('Reachable States', () => analysisAPI.analyzeReachableStates(data))}
            disabled={loading !== null}
            title="Compute all possible states (markings) the net can reach from the current state."
          >
            {loading === 'Reachable States' ? 'Running...' : 'Reachable States'}
          </button>
          
          <button 
            onClick={() => handleAnalysis('Liveness', () => analysisAPI.analyzeLiveness(data))}
            disabled={loading !== null}
            title="Check for deadlocks or livelocks; ensure transitions can eventually fire again."
          >
            {loading === 'Liveness' ? 'Running...' : 'Liveness'}
          </button>
          
          <button 
            onClick={() => handleAnalysis('Boundedness', () => analysisAPI.analyzeBoundedness(data))}
            disabled={loading !== null}
            title="Determine if the number of tokens in any place can grow indefinitely or stays bounded."
          >
            {loading === 'Boundedness' ? 'Running...' : 'Boundedness'}
          </button>
          
          <button 
            onClick={() => handleAnalysis('Incidence Matrix', () => analysisAPI.computeIncidenceMatrix(data))}
            disabled={loading !== null}
            title="Show the matrix representing the relationships between transitions and places."
          >
            {loading === 'Incidence Matrix' ? 'Running...' : 'Incidence Matrix'}
          </button>
          
          <button 
            onClick={() => handleAnalysis('Structural Analysis', () => analysisAPI.performStructuralAnalysis(data))}
            disabled={loading !== null}
            title="Analyze properties derived directly from the net structure, ignoring the initial marking."
          >
            {loading === 'Structural Analysis' ? 'Running...' : 'Structural Analysis'}
          </button>
        </div>
        
        {renderResults()}
      </div>
    </div>
  );
}
