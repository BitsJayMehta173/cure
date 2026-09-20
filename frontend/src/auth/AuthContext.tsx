import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export interface UserInfo {
  id: number;
  fullName: string;
  email: string;
  mobile: string;
  defaultPatientId: number;
}

interface AuthContextType {
  user: UserInfo | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (data: { fullName: string; email: string; mobile: string; password: string }) => Promise<void>;
  logout: () => void;
  updateProfile: (data: { fullName?: string; email?: string; mobile?: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const API_BASE = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api/auth` : 'http://localhost:8080/api/auth';
const STORAGE_KEY = 'medroute_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore session from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setUser(JSON.parse(stored));
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
    setLoading(false);
  }, []);

  const persistUser = (userData: UserInfo) => {
    setUser(userData);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
  };

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) {
      const msg = await res.text();
      throw new Error(msg || 'Login failed');
    }
    const data = await res.json();
    persistUser(data);
  }, []);

  const signup = useCallback(async (data: { fullName: string; email: string; mobile: string; password: string }) => {
    const res = await fetch(`${API_BASE}/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const msg = await res.text();
      throw new Error(msg || 'Signup failed');
    }
    const userData = await res.json();
    persistUser(userData);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const updateProfile = useCallback(async (data: { fullName?: string; email?: string; mobile?: string }) => {
    if (!user) throw new Error('Not logged in');
    const res = await fetch(`${API_BASE}/profile?userId=${user.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const msg = await res.text();
      throw new Error(msg || 'Update failed');
    }
    const updated = await res.json();
    persistUser(updated);
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
