/**
 * src/contexts/AuthContext.tsx
 * ─────────────────────────────
 * Global authentication state management using React Context + useReducer.
 *
 * Provides:
 *  - user, isAuthenticated, isLoading
 *  - login(), register(), logout()
 *  - Auto-restores session from localStorage on mount
 *  - Listens for 'auth:expired' events fired by the API utility
 */

import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import api, { setTokens, clearTokens, TOKEN_KEYS, ApiError } from '@/utils/api';
import type { User, AuthResponse } from '@/types';

// ─── State Shape ──────────────────────────────────────────────────────────────
interface AuthState {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

// ─── Actions ─────────────────────────────────────────────────────────────────
type AuthAction =
  | { type: 'HYDRATE_START' }
  | { type: 'HYDRATE_SUCCESS'; payload: { user: User; accessToken: string } }
  | { type: 'HYDRATE_FAIL' }
  | { type: 'AUTH_SUCCESS'; payload: { user: User; accessToken: string } }
  | { type: 'LOGOUT' };

// ─── Reducer ─────────────────────────────────────────────────────────────────
const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'HYDRATE_START':
      return { ...state, isLoading: true };

    case 'HYDRATE_SUCCESS':
    case 'AUTH_SUCCESS':
      return {
        user: action.payload.user,
        accessToken: action.payload.accessToken,
        isAuthenticated: true,
        isLoading: false,
      };

    case 'HYDRATE_FAIL':
    case 'LOGOUT':
      return {
        user: null,
        accessToken: null,
        isAuthenticated: false,
        isLoading: false,
      };

    default:
      return state;
  }
};

// ─── Initial State ────────────────────────────────────────────────────────────
const initialState: AuthState = {
  user: null,
  accessToken: null,
  isLoading: true, // true on mount — we check localStorage first
  isAuthenticated: false,
};

// ─── Context Interface ────────────────────────────────────────────────────────
interface AuthContextValue extends AuthState {
  login: (identifier: string, password: string) => Promise<void>;
  register: (data: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
}

interface RegisterPayload {
  handle: string;
  email: string;
  password: string;
  codeforcesHandle?: string;
}

// ─── Context ─────────────────────────────────────────────────────────────────
const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Provider ────────────────────────────────────────────────────────────────
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // ── Hydrate session from localStorage on mount ───────────────────────────
  useEffect(() => {
    const hydrateSession = async () => {
      dispatch({ type: 'HYDRATE_START' });

      const token = localStorage.getItem(TOKEN_KEYS.access);
      const cached = localStorage.getItem(TOKEN_KEYS.user);

      if (!token) {
        dispatch({ type: 'HYDRATE_FAIL' });
        return;
      }

      // Optimistically set from cache, then verify with server
      if (cached) {
        try {
          const user = JSON.parse(cached) as User;
          dispatch({ type: 'HYDRATE_SUCCESS', payload: { user, accessToken: token } });
        } catch {
          // malformed cache
        }
      }

      // Verify token is still valid
      try {
        const res = await api.get<{ user: User }>('/auth/me');
        if (res.data?.user) {
          localStorage.setItem(TOKEN_KEYS.user, JSON.stringify(res.data.user));
          dispatch({
            type: 'HYDRATE_SUCCESS',
            payload: { user: res.data.user, accessToken: token },
          });
        } else {
          clearTokens();
          dispatch({ type: 'HYDRATE_FAIL' });
        }
      } catch {
        // Token invalid — clear and fall through to login
        clearTokens();
        dispatch({ type: 'HYDRATE_FAIL' });
      }
    };

    hydrateSession();
  }, []);

  // ── Listen for session expiry fired by api.ts on 401 ─────────────────────
  useEffect(() => {
    const onExpired = () => {
      clearTokens();
      dispatch({ type: 'LOGOUT' });
    };

    window.addEventListener('auth:expired', onExpired);
    return () => window.removeEventListener('auth:expired', onExpired);
  }, []);

  // ── Login ─────────────────────────────────────────────────────────────────
  const login = useCallback(async (identifier: string, password: string) => {
    const res = await api.post<AuthResponse>(
      '/auth/login',
      { identifier, password },
      false // no auth header on login
    );

    if (!res.data) throw new ApiError('No data returned from server', 500);

    const { user, accessToken, refreshToken } = res.data;
    setTokens(accessToken, refreshToken);
    localStorage.setItem(TOKEN_KEYS.user, JSON.stringify(user));

    dispatch({ type: 'AUTH_SUCCESS', payload: { user, accessToken } });
  }, []);

  // ── Register ──────────────────────────────────────────────────────────────
  const register = useCallback(async (data: RegisterPayload) => {
    const res = await api.post<AuthResponse>('/auth/register', data, false);

    if (!res.data) throw new ApiError('No data returned from server', 500);

    const { user, accessToken, refreshToken } = res.data;
    setTokens(accessToken, refreshToken);
    localStorage.setItem(TOKEN_KEYS.user, JSON.stringify(user));

    dispatch({ type: 'AUTH_SUCCESS', payload: { user, accessToken } });
  }, []);

  // ── Logout ────────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    try {
      const refreshToken = localStorage.getItem(TOKEN_KEYS.refresh);
      await api.post('/auth/logout', { refreshToken });
    } catch {
      // Ignore server errors on logout
    } finally {
      clearTokens();
      dispatch({ type: 'LOGOUT' });
    }
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// ─── Hook ─────────────────────────────────────────────────────────────────────
export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an <AuthProvider>');
  }
  return ctx;
};

export default AuthContext;
