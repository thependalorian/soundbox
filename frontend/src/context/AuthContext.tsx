import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import api from '../api/api';
import { logger } from '../lib/logger';

export type UserRole = 'merchant' | 'regulator' | 'admin';

interface AuthUser {
  id: string;
  name: string;
  role: UserRole;
  /** Only set for role='merchant' — scopes Devices/Transactions/Flagged
   * Alerts to this merchant's own data. */
  merchantId?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  /** True until the initial session check (GET /auth/me against a stored
   * token) resolves. Route guards should wait on this rather than treating
   * "not yet known" as "not authenticated" — otherwise a page refresh
   * always flashes to /login before the real session loads. */
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface LoginResponse {
  access_token: string;
  id: string;
  role: UserRole;
  name: string;
  merchant_id: string | null;
}

interface MeResponse {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  merchantId: string | null;
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // A page refresh loses component state but not the token -- verify it
  // against the server (not just decode it locally) before trusting it.
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setIsLoading(false);
      return;
    }
    api
      .get<MeResponse>('/auth/me')
      .then((res) => {
        setUser({
          id: res.data.id,
          name: res.data.name,
          role: res.data.role,
          merchantId: res.data.merchantId || undefined,
        });
      })
      .catch((err) => {
        logger.warn('Stored session token is no longer valid', err);
        localStorage.removeItem('token');
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.post<LoginResponse>('/auth/login', { email, password });
    localStorage.setItem('token', res.data.access_token);
    setUser({
      id: res.data.id,
      name: res.data.name,
      role: res.data.role,
      merchantId: res.data.merchant_id || undefined,
    });
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
