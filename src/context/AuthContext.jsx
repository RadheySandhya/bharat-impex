import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('bharat_impex_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('bharat_impex_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen to unauthorized global events
    const handleUnauthorized = () => {
      logout();
    };
    window.addEventListener('auth:unauthorized', handleUnauthorized);

    async function checkAuth() {
      if (token) {
        try {
          const res = await api.auth.me();
          if (res?.data) {
            setUser(res.data);
            localStorage.setItem('bharat_impex_user', JSON.stringify(res.data));
          }
        } catch (err) {
          console.warn('Session expired or invalid token:', err);
          logout();
        }
      }
      setLoading(false);
    }

    checkAuth();

    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, [token]);

  const login = async (username, password) => {
    const res = await api.auth.login(username, password);
    if (res?.data?.token) {
      setToken(res.data.token);
      setUser(res.data.user);
      localStorage.setItem('bharat_impex_token', res.data.token);
      localStorage.setItem('bharat_impex_user', JSON.stringify(res.data.user));
      return res.data;
    }
    throw new Error('Invalid response from login API');
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('bharat_impex_token');
    localStorage.removeItem('bharat_impex_user');
  };

  const hasPermission = (permission) => {
    if (!user) return false;
    // Admin user has complete unrestricted access to all modules, actions, and features
    const roleCode = String(user.role_code || '').toUpperCase();
    const roleName = String(user.role_name || '').toUpperCase();
    if (roleCode === 'ADMIN' || roleCode === 'SUPERADMIN' || roleName.includes('ADMIN') || user.is_admin) {
      return true;
    }
    if (user.permissions?.includes('ALL') || user.permissions?.includes('*')) return true;
    return user.permissions?.includes(permission);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, hasPermission, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
