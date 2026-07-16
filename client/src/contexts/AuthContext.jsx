import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api.js';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchUser = useCallback(async () => {
    const token = localStorage.getItem('ams-token');
    if (!token) { setLoading(false); return; }
    try {
      const res = await api.get('/auth/me');
      setUser(res.data.user);
    } catch {
      localStorage.removeItem('ams-token');
      localStorage.removeItem('ams-refresh-token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUser(); }, [fetchUser]);

  const login = async (credentials) => {
    const res = await api.post('/auth/login', credentials);
    const { token, refreshToken, user: userData } = res.data;
    localStorage.setItem('ams-token', token);
    if (refreshToken) localStorage.setItem('ams-refresh-token', refreshToken);
    setUser(userData);
    toast.success(`Welcome back, ${userData.name}!`);
    const roleRoutes = {
      admin: '/admin/dashboard',
      teacher: '/teacher/dashboard',
      student: '/student/dashboard',
    };
    navigate(roleRoutes[userData.role] || '/login');
    return userData;
  };

  const register = async (data) => {
    const res = await api.post('/auth/register', data);
    const { token, refreshToken, user: userData } = res.data;
    localStorage.setItem('ams-token', token);
    if (refreshToken) localStorage.setItem('ams-refresh-token', refreshToken);
    setUser(userData);
    toast.success('Account created successfully!');
    const roleRoutes = {
      admin: '/admin/dashboard',
      teacher: '/teacher/dashboard',
      student: '/student/dashboard',
    };
    navigate(roleRoutes[userData.role] || '/login');
    return userData;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {}
    localStorage.removeItem('ams-token');
    localStorage.removeItem('ams-refresh-token');
    setUser(null);
    toast.success('Logged out successfully');
    navigate('/login');
  };

  const updateUser = (updates) => {
    setUser(prev => ({ ...prev, ...updates }));
  };

  return (
    <AuthContext.Provider value={{
      user, loading, isAuthenticated: !!user,
      login, register, logout, fetchUser, updateUser
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export default AuthContext;
