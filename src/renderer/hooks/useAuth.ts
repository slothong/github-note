import { useState, useEffect, useCallback } from 'react';
import type { GitHubUser } from '../types';

interface AuthState {
  user: GitHubUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  deviceCode: { userCode: string; verificationUri: string } | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
    deviceCode: null,
  });

  useEffect(() => {
    window.api.authCheck().then((user) => {
      if (user) {
        setState({
          user: user as GitHubUser,
          isLoading: false,
          isAuthenticated: true,
          deviceCode: null,
        });
      } else {
        setState((s) => ({ ...s, isLoading: false }));
      }
    });
  }, []);

  const login = useCallback(async () => {
    setState((s) => ({ ...s, isLoading: true }));
    const result = await window.api.authLogin();
    setState((s) => ({ ...s, isLoading: false, deviceCode: result }));
  }, []);

  const pollLogin = useCallback(async () => {
    setState((s) => ({ ...s, isLoading: true }));
    try {
      const result = await window.api.authPoll();
      if (result.success && result.user) {
        setState({
          user: result.user as GitHubUser,
          isLoading: false,
          isAuthenticated: true,
          deviceCode: null,
        });
      }
    } catch {
      setState((s) => ({ ...s, isLoading: false }));
    }
  }, []);

  const logout = useCallback(async () => {
    await window.api.authLogout();
    setState({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      deviceCode: null,
    });
  }, []);

  return { ...state, login, pollLogin, logout };
}
