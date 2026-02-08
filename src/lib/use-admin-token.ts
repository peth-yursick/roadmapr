/**
 * Client-side hook for admin token management
 * Generates, stores, and provides JWT tokens for admin operations
 */

import { useState, useCallback } from "react";

interface AdminTokenResponse {
  token: string;
  expiresIn: string;
}

const TOKEN_STORAGE_KEY = 'roadmapr_admin_token';
const TOKEN_CACHE_DURATION = 50 * 60 * 1000; // 50 minutes (tokens last 1 hour)

/**
 * Check if a stored token is still valid
 */
function isTokenValid(stored: { timestamp: number; token: string }): boolean {
  return Date.now() - stored.timestamp < TOKEN_CACHE_DURATION;
}

/**
 * Get stored token if still valid
 */
function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!stored) return null;

    const parsed = JSON.parse(stored) as { timestamp: number; token: string };

    if (isTokenValid(parsed)) {
      return parsed.token;
    }

    // Token expired, remove it
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    return null;
  } catch {
    return null;
  }
}

/**
 * Store token with timestamp
 */
function storeToken(token: string): void {
  if (typeof window === 'undefined') return;

  localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify({
    timestamp: Date.now(),
    token,
  }));
}

/**
 * Clear stored token
 */
export function clearAdminToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_STORAGE_KEY);
}

/**
 * Hook for managing admin authentication tokens
 *
 * @returns Object with token, loading state, error, and functions
 *
 * @example
 * const { token, getAdminToken, isAdmin, isLoading } = useAdminToken();
 *
 * // Check if user is admin
 * if (isAdmin) {
 *   // Do admin things with token
 * }
 */
export function useAdminToken() {
  const [token, setToken] = useState<string | null>(getStoredToken);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Generate a new admin token
   */
  const getAdminToken = useCallback(async () => {
    // Return cached token if valid
    const cached = getStoredToken();
    if (cached) {
      setToken(cached);
      return cached;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/generate-token', {
        method: 'POST',
        credentials: 'include', // Include cookies for Privy session
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to generate admin token');
      }

      const data = await response.json() as AdminTokenResponse;
      setToken(data.token);
      storeToken(data.token);
      return data.token;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Get Authorization header value for fetch requests
   */
  const getAuthHeader = useCallback(() => {
    if (!token) {
      throw new Error('No admin token available. Call getAdminToken() first.');
    }
    return `Bearer ${token}`;
  }, [token]);

  /**
   * Make authenticated admin request
   */
  const adminFetch = useCallback(async (
    url: string,
    options?: RequestInit
  ) => {
    const authHeader = await getAuthHeader();

    return fetch(url, {
      ...options,
      headers: {
        ...options?.headers,
        Authorization: authHeader,
      },
    });
  }, [getAuthHeader]);

  return {
    token,
    isAdmin: !!token,
    isLoading,
    error,
    getAdminToken,
    getAuthHeader,
    adminFetch,
    clearToken: clearAdminToken,
  };
}
