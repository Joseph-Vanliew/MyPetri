import React from 'react';
import PetriNetEditor from './components/PetriNetEditor';
import './App.css';

function App() {
  return (
      <div className="App">
        <header className="App-header">
          <h1>Petri Net Simulator</h1>
        </header>
        <PetriNetEditor />
      </div>
  );
}

export default App;
