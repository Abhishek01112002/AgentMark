import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import api from '../services/api';
import { llmSettingsService } from '../services/llm-settings.service';
import toast from 'react-hot-toast';

interface User {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  signup: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    const initAuth = async () => {
      const token = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');

      if (token) {
        try {
          if (storedUser) {
            try { 
              const parsed = JSON.parse(storedUser);
              setUser(parsed);
              void llmSettingsService.fetchRemoteSettings(parsed.id);
            } catch {}
          }
          const response = await api.get('/auth/me', { signal: controller.signal });
          if (response.data?.user) {
            setUser(response.data.user);
            localStorage.setItem('user', JSON.stringify(response.data.user));
            void llmSettingsService.fetchRemoteSettings(response.data.user.id);
          }
        } catch (error: any) {
          if (error.name === 'AbortError' || error.name === 'CanceledError' || error.code === 'ERR_CANCELED') return;
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setUser(null);
        }
      }
      setLoading(false);
    };

    initAuth();

    return () => controller.abort();
  }, []);

  const login = useCallback(async (email: string, password: string, rememberMe: boolean = false) => {
    try {
      const response = await api.post('/auth/login', { email, password, rememberMe });
      const { user: userData, token } = response.data;

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);

      // Auto-hydrate user's cross-device encrypted API keys
      void llmSettingsService.fetchRemoteSettings(userData.id);

      toast.success('Login successful!');
    } catch (error: any) {
      const message = error.response?.data?.error || 'Login failed';
      toast.error(message);
      throw error;
    }
  }, []);

  const signup = useCallback(async (email: string, password: string, name?: string) => {
    try {
      const response = await api.post('/auth/signup', { email, password, name });
      const { user: userData, token } = response.data;

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);

      // Auto-hydrate user's cross-device encrypted API keys
      void llmSettingsService.fetchRemoteSettings(userData.id);

      toast.success('Account created successfully!');
    } catch (error: any) {
      const message = error.response?.data?.error || 'Signup failed';
      toast.error(message);
      throw error;
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    toast.success('Logged out successfully');
  }, []);

  const updateUser = useCallback((userData: Partial<User>) => {
    const updatedUser = { ...user, ...userData } as User;
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  }, [user]);

  const refreshUser = useCallback(async () => {
    try {
      const response = await api.get('/auth/me');
      const { user: freshUser } = response.data;
      setUser(freshUser);
      localStorage.setItem('user', JSON.stringify(freshUser));
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, signup, logout, updateUser, refreshUser }),
    [user, loading, login, signup, logout, updateUser, refreshUser],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
