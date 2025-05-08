import { PetriNetDTO } from '../types';
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

  // Basic checks for data structure
  const numPlaces = data?.places?.length ?? 0;
  const numTransitions = data?.transitions?.length ?? 0;
  const numArcs = data?.arcs?.length ?? 0;

  const containerStyle = {
      width: width,
      height: height,
  };

  return (
    <div className="analysis-container" style={containerStyle}>
      
      {/*--------------------- TODO: Remove when done! --------------------- */}
      {/* Overlay Element */}
      <div className="analysis-overlay">
        <div className="analysis-overlay-text">Under Construction</div>
        <div className="analysis-overlay-cross">✕</div> 
      </div>
      {/*--------------------- TODO: Remove when done! --------------------- */}

      {/* Existing Content (currently covered by overlay) */}
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
            disabled 
            title="Compute all possible states (markings) the net can reach from the current state."
          >
            Reachable States
          </button>
          <button 
            disabled 
            title="Check for deadlocks or livelocks; ensure transitions can eventually fire again."
          >
            Liveness
          </button>
          <button 
            disabled 
            title="Determine if the number of tokens in any place can grow indefinitely or stays bounded."
          >
            Boundedness
          </button>
          <button 
            disabled 
            title="Find token conservation laws; relationships between place markings that always hold true."
          >
            P-Invariants
          </button>
          <button 
            disabled 
            title="Find sequences of transition firings that return the net to a previous state (cyclic behavior)."
          >
            T-Invariants
          </button>
          <button 
            disabled 
            title="Show the matrix representing the relationships between transitions and places."
          >
            Incidence Matrix
          </button>
          <button 
            disabled 
            title="Analyze potentially unbounded nets by representing infinite tokens symbolically."
          >
            Coverability Graph
          </button>
          <button 
            disabled 
            title="Analyze properties derived directly from the net structure, ignoring the initial marking."
          >
            Structural Analysis
          </button>
        </div>
        
        <div className="analysis-results-placeholder">
          Analysis results will be displayed here.
        </div>
      </div>

    </div>
  );
}
