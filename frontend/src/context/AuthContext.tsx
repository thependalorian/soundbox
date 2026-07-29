import React, { createContext, useState, useContext, ReactNode } from 'react';

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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);

  const login = async (email: string, password: string) => {
    // Mock login - in production, call API
    if (email === 'regulator@bon.com.na' && password === 'password') {
      setUser({ id: '1', name: 'Regulator User', role: 'regulator' });
    } else if (email === 'merchant@example.com' && password === 'password') {
      setUser({ id: '2', name: 'Merchant User', role: 'merchant', merchantId: 'M-101' });
    } else if (email === 'admin@wayame.com.na' && password === 'password') {
      setUser({ id: '3', name: 'Admin User', role: 'admin' });
    } else {
      throw new Error('Invalid credentials');
    }
  };

  const logout = () => setUser(null);

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated }}>
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
