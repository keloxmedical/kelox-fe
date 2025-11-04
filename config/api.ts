/**
 * API Configuration
 * Central configuration for backend API endpoints
 */

export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080',
} as const;

// Export for easier imports
export const { BASE_URL: BACKEND_API } = API_CONFIG;

