/**
 * Utility for API endpoints
 * Automatically detects if we're in development or production
 * and returns the appropriate base URL
 */

import { PetriNetDTO, AnalysisResultDTO } from '../types/api';

// In development, we use localhost:8080
// In production, we use relative URLs
export const getApiBaseUrl = (): string => {
  console.log("Hostname:", window.location.hostname);
  const baseUrl = window.location.hostname === 'localhost' ? 'http://localhost:8080' : '';
  console.log("Chosen baseUrl:", baseUrl);
  return baseUrl;
};

// Endpoint constants - using the base URL function to avoid redundancy
export const API_ENDPOINTS = {
  PROCESS: `${getApiBaseUrl()}/api/process`,
  RESOLVE: `${getApiBaseUrl()}/api/process/resolve`,
  VALIDATE: `${getApiBaseUrl()}/api/validate`,
};

// Analysis API functions
export const analysisAPI = {
  async analyzeReachableStates(petriNet: PetriNetDTO): Promise<AnalysisResultDTO> {
    const response = await fetch(`${getApiBaseUrl()}/api/analysis/reachable-states`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(petriNet),
    });
    
    if (!response.ok) {
      throw new Error(`Analysis failed: ${response.statusText}`);
    }
    
    return response.json();
  },

  async analyzeLiveness(petriNet: PetriNetDTO): Promise<AnalysisResultDTO> {
    const response = await fetch(`${getApiBaseUrl()}/api/analysis/liveness`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(petriNet),
    });
    
    if (!response.ok) {
      throw new Error(`Analysis failed: ${response.statusText}`);
    }
    
    return response.json();
  },

  async analyzeBoundedness(petriNet: PetriNetDTO): Promise<AnalysisResultDTO> {
    const response = await fetch(`${getApiBaseUrl()}/api/analysis/boundedness`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(petriNet),
    });
    
    if (!response.ok) {
      throw new Error(`Analysis failed: ${response.statusText}`);
    }
    
    return response.json();
  },

  async computeIncidenceMatrix(petriNet: PetriNetDTO): Promise<AnalysisResultDTO> {
    const response = await fetch(`${getApiBaseUrl()}/api/analysis/incidence-matrix`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(petriNet),
    });
    
    if (!response.ok) {
      throw new Error(`Analysis failed: ${response.statusText}`);
    }
    
    return response.json();
  },

  async performStructuralAnalysis(petriNet: PetriNetDTO): Promise<AnalysisResultDTO> {
    const response = await fetch(`${getApiBaseUrl()}/api/analysis/structural`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(petriNet),
    });
    
    if (!response.ok) {
      throw new Error(`Analysis failed: ${response.statusText}`);
    }
    
    return response.json();
  },
};