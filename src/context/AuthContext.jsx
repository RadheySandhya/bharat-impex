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

  const isAdmin = (() => {
    if (!user) return false;
    if (user.is_admin) return true;
    const roleCode = String(user.role_code || '').toUpperCase();
    return roleCode === 'ADMIN' || roleCode === 'SUPERADMIN';
  })();

  // Effective permission keys ("module.action") come from the server on login / auth/me
  const hasPermission = (permission) => {
    if (!user) return false;
    if (isAdmin) return true;
    const perms = Array.isArray(user.permissions) ? user.permissions : [];
    if (perms.includes('ALL') || perms.includes('*')) return true;
    return perms.includes(permission);
  };

  const hasAny = (list = []) => list.some((p) => hasPermission(p));

  // SKU-tracking stage access: stage object with `id` = process id (or a raw process id)
  const canStage = (stage) => {
    if (!user) return false;
    if (isAdmin) return true;
    const allowed = user.allowed_stages;
    if (allowed === undefined || allowed === null || allowed === 'ALL') return true;
    const id = typeof stage === 'object' && stage !== null ? stage.id : stage;
    return Array.isArray(allowed) && allowed.map(Number).includes(Number(id));
  };

  const refreshUser = async () => {
    try {
      const res = await api.auth.me();
      if (res?.data) {
        setUser(res.data);
        localStorage.setItem('bharat_impex_user', JSON.stringify(res.data));
      }
    } catch (e) {}
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, hasPermission, hasAny, canStage, isAdmin, refreshUser, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
