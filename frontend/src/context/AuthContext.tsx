import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import api from '../api/api';
import { logger } from '../lib/logger';

/**
 * Two roles, because there are two kinds of person who sign in: someone doing
 * oversight work, and someone administering the platform. A business appears
 * in this system as a subject of the analysis, never as a caller — there is no
 * account type that represents one.
 */
export type UserRole = 'regulator' | 'admin';

interface AuthUser {
  id: string;
  name: string;
  /** Carried so the shared team account can be told apart from a person —
   *  see components/ui/Avatar.tsx. */
  email: string;
  role: UserRole;
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
  email: string;
}

interface MeResponse {
  id: string;
  email: string;
  name: string;
  role: UserRole;
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
          email: res.data.email,
          role: res.data.role,
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
      email: res.data.email,
      role: res.data.role,
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
