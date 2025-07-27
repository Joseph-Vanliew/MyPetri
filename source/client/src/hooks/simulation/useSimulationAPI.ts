import { useCallback } from 'react';
import { PetriNetDTO } from '../../types';
import { API_ENDPOINTS } from '../../utils/api';

export const useSimulationAPI = () => {
  const simulatePetriNet = useCallback(async (pageId: string, data: PetriNetDTO): Promise<PetriNetDTO> => {
    const apiUrl = `${API_ENDPOINTS.PROCESS}/page/${pageId}/process`;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Simulation API error:', response.status, errorBody);
      throw new Error(`Simulation failed: ${response.status} ${errorBody}`);
    }

    return await response.json();
  }, []);

  const resolveConflict = useCallback(async (pageId: string, data: PetriNetDTO, selectedTransitionId: string): Promise<PetriNetDTO> => {
    const apiUrl = `${API_ENDPOINTS.RESOLVE}/page/${pageId}/resolve`;
    
    const requestBody = {
      ...data,
      selectedTransitionId
    };

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Conflict resolution API error:', response.status, errorBody);
      throw new Error(`Conflict resolution failed: ${response.status} ${errorBody}`);
    }

    return await response.json();
  }, []);

  return { simulatePetriNet, resolveConflict };
}; 