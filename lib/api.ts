/**
 * API utilities for making authenticated requests to the Kelox backend
 */

import { BACKEND_API as BACKEND_API_URL } from '@/config/api';

// Re-export for convenience
export const BACKEND_API = BACKEND_API_URL;

/**
 * Get the stored JWT token from localStorage
 */
export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('kelox_jwt_token');
}

/**
 * Set the JWT token in localStorage
 */
export function setAuthToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('kelox_jwt_token', token);
}

/**
 * Remove the JWT token from localStorage
 */
export function clearAuthToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('kelox_jwt_token');
}

/**
 * Make an authenticated API request
 */
export async function authenticatedFetch(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = getAuthToken();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    //@ts-ignore
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = endpoint.startsWith('http') ? endpoint : `${BACKEND_API_URL}${endpoint}`;

  return fetch(url, {
    ...options,
    headers,
  });
}

/**
 * Example usage for making API calls
 * 
 * @example
 * ```typescript
 * import { authenticatedFetch } from '@/lib/api';
 * 
 * // GET request
 * const response = await authenticatedFetch('/api/user/profile');
 * const data = await response.json();
 * 
 * // POST request
 * const response = await authenticatedFetch('/api/data', {
 *   method: 'POST',
 *   body: JSON.stringify({ key: 'value' })
 * });
 * ```
 */

