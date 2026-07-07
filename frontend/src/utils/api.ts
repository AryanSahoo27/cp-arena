/**
 * src/utils/api.ts
 * ─────────────────
 * Typed fetch wrapper for the CP Arena backend.
 *
 * Features:
 *  - Auto-attaches Bearer JWT from localStorage
 *  - Fires a custom 'auth:expired' event on 401 → AuthContext handles logout
 *  - Typed generic responses
 *  - Centralised error class for upstream catch blocks
 */

import type { ApiResponse } from '@/types';

// ─── Base URL ─────────────────────────────────────────────────────────────────
// In dev: Vite proxy forwards /api → http://localhost:5000/api
// In prod: set VITE_API_URL to the deployed backend URL
const BASE_URL = import.meta.env.VITE_API_URL || '/api';

// ─── Custom API Error ────────────────────────────────────────────────────────
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly data?: ApiResponse
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ─── Token Helpers ────────────────────────────────────────────────────────────
export const TOKEN_KEYS = {
  access: 'cp_access_token',
  refresh: 'cp_refresh_token',
  user: 'cp_user',
} as const;

export const getAccessToken = (): string | null =>
  localStorage.getItem(TOKEN_KEYS.access);

export const setTokens = (
  accessToken: string,
  refreshToken: string
): void => {
  localStorage.setItem(TOKEN_KEYS.access, accessToken);
  localStorage.setItem(TOKEN_KEYS.refresh, refreshToken);
};

export const clearTokens = (): void => {
  localStorage.removeItem(TOKEN_KEYS.access);
  localStorage.removeItem(TOKEN_KEYS.refresh);
  localStorage.removeItem(TOKEN_KEYS.user);
};

// ─── Headers Builder ─────────────────────────────────────────────────────────
const buildHeaders = (auth: boolean): HeadersInit => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (auth) {
    const token = getAccessToken();
    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }
  }

  return headers;
};

// ─── Response Handler ────────────────────────────────────────────────────────
const handleResponse = async <T>(response: Response): Promise<ApiResponse<T>> => {
  let data: ApiResponse<T>;

  try {
    data = await response.json();
  } catch {
    throw new ApiError('Invalid server response', response.status);
  }

  // Session expired — notify app-wide
  if (response.status === 401) {
    clearTokens();
    window.dispatchEvent(new CustomEvent('auth:expired'));
  }

  if (!response.ok) {
    throw new ApiError(
      data.message || `Request failed with status ${response.status}`,
      response.status,
      data
    );
  }

  return data;
};

// ─── HTTP Methods ─────────────────────────────────────────────────────────────

/**
 * GET request
 * @param path - API path (e.g. '/auth/me')
 * @param auth - Whether to include the Bearer token (default: true)
 */
export const get = async <T = unknown>(
  path: string,
  auth = true
): Promise<ApiResponse<T>> => {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'GET',
    headers: buildHeaders(auth),
  });
  return handleResponse<T>(response);
};

/**
 * POST request
 * @param path - API path
 * @param body - Request payload (will be JSON.stringify-ed)
 * @param auth - Whether to include the Bearer token (default: true)
 */
export const post = async <T = unknown>(
  path: string,
  body: unknown,
  auth = true
): Promise<ApiResponse<T>> => {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: buildHeaders(auth),
    body: JSON.stringify(body),
  });
  return handleResponse<T>(response);
};

/**
 * PUT request
 */
export const put = async <T = unknown>(
  path: string,
  body: unknown,
  auth = true
): Promise<ApiResponse<T>> => {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'PUT',
    headers: buildHeaders(auth),
    body: JSON.stringify(body),
  });
  return handleResponse<T>(response);
};

/**
 * PATCH request
 */
export const patch = async <T = unknown>(
  path: string,
  body: unknown,
  auth = true
): Promise<ApiResponse<T>> => {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'PATCH',
    headers: buildHeaders(auth),
    body: JSON.stringify(body),
  });
  return handleResponse<T>(response);
};

/**
 * DELETE request
 */
export const del = async <T = unknown>(
  path: string,
  auth = true
): Promise<ApiResponse<T>> => {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'DELETE',
    headers: buildHeaders(auth),
  });
  return handleResponse<T>(response);
};

// ─── Named export object (convenience) ───────────────────────────────────────
const api = { get, post, put, patch, delete: del };
export default api;
