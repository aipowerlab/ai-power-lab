import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';
import { setAccessToken, getAccessToken, setRefreshToken, getRefreshToken, initAuth } from '../utils/api';

interface User {
  user_id: string;
  email: string;
  name: string;
  role: string;
  subscription_status: string;
  subscription_plan: string | null;
  tool_uses: number;
  picture?: string;
  wallet_balance?: number;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  refreshUser: async () => {},
  setUser: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      // Load token from native storage (AsyncStorage) on startup
      await initAuth();
      if (getAccessToken()) {
        const data = await api.getMe();
        setUser(data);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
      setAccessToken(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (email: string, password: string) => {
    const data = await api.login(email, password);
    // Store both tokens from login response
    if (data.access_token) {
      setAccessToken(data.access_token);
    }
    if (data.refresh_token) {
      setRefreshToken(data.refresh_token);
    }
    setUser(data);
  };

  const register = async (email: string, password: string, name: string) => {
    const data = await api.register(email, password, name);
    if (data.access_token) {
      setAccessToken(data.access_token);
    }
    if (data.refresh_token) {
      setRefreshToken(data.refresh_token);
    }
    setUser(data);
  };

  const logout = async () => {
    try { await api.logout(); } catch {}
    setAccessToken(null);
    setRefreshToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const data = await api.getMe();
      setUser(data);
    } catch {
      // ignore
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
