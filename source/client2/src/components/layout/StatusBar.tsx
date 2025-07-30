import React from 'react';
import { useSimulationStore } from '../../stores/index.js';

const StatusBar: React.FC = () => {
  const { isRunning, currentStep, speed, startSimulation, stopSimulation, setSpeed } = useSimulationStore();

  return (
    <div className="status-bar">
      <div className="simulation-controls">
        <button
          className={`simulation-btn ${isRunning ? 'stop' : 'start'}`}
          onClick={isRunning ? stopSimulation : startSimulation}
        >
          {isRunning ? '⏸️ Stop' : '▶️ Start'}
        </button>
        <button className="simulation-btn" onClick={stopSimulation}>
          🔄 Reset
        </button>
        <div className="speed-control">
          <label>Speed:</label>
          <input
            type="range"
            min="0.1"
            max="5"
            step="0.1"
            value={speed}
            onChange={(e) => setSpeed(parseFloat(e.target.value))}
          />
          <span>{speed}x</span>
        </div>
        <div className="step-counter">
          Step: {currentStep}
        </div>
      </div>
    </div>
  );
};

export default StatusBar; 