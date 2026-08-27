// src/context/AuthContext.jsx — current-user state backed by /api/auth/me.
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  getMe,
  logout as apiLogout,
  googleLoginUrl,
} from '../lib/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setUser(await getMe());
    } finally {
      setLoading(false);
    }
  }, []);

  // Load the current user once on mount (reads the httpOnly cookie via /me).
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Redirect the whole page into the Google OAuth flow.
  const signInWithGoogle = useCallback(() => {
    window.location.href = googleLoginUrl();
  }, []);

  const signOut = useCallback(async () => {
    await apiLogout();
    setUser(null);
  }, []);

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    refresh,
    signInWithGoogle,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an <AuthProvider>.');
  return ctx;
}
