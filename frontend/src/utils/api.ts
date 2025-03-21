/**
 * Utility for API endpoints
 * Automatically detects if we're in development or production
 * and returns the appropriate base URL
 */

// In development, we use localhost:8080
// In production, we use relative URLs
export const getApiBaseUrl = (): string => {
          console.log("Hostname:", window.location.hostname);
          const baseUrl = window.location.hostname === 'localhost' ? 'http://localhost:8080' : '';
          console.log("Chosen baseUrl:", baseUrl);
          return baseUrl;
        };

// Endpoint constants
export const API_ENDPOINTS = {
          PROCESS: window.location.hostname === 'localhost' 
            ? 'http://localhost:8080/api/process' 
            : '/api/process',
          RESOLVE: window.location.hostname === 'localhost' 
            ? 'http://localhost:8080/api/process/resolve' 
            : '/api/process/resolve',
        };