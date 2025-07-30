// API types - placeholder for future implementation
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
} 