import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    console.log('Checking auth status...');
    try {
      const response = await api.get('/api/auth/user/');
      console.log('Auth check successful:', response.data);
      setUser(response.data);
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
      // Clear any cached data if authentication fails
      localStorage.clear();
      sessionStorage.clear();
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials) => {
    console.log('Attempting login with:', credentials.username);
    try {
      const response = await api.post('/api/auth/login/', credentials);
      console.log('Login response:', response.data);
      const { user } = response.data;

      setUser(user);
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      const data = error.response?.data;
      let message = data?.message || data?.detail || error.message || 'Login failed';
      if (!data?.message && typeof data === 'object' && data) {
        const firstKey = Object.keys(data)[0];
        if (firstKey && Array.isArray(data[firstKey]) && data[firstKey][0]) {
          message = data[firstKey][0];
        }
      }
      return {
        success: false,
        error: message
      };
    }
  };

  const logout = async () => {
    console.log('Attempting logout...');
    try {
      await api.post('/api/auth/logout/');
      console.log('Logout successful');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      // Clear any cached data
      localStorage.clear();
      sessionStorage.clear();
      console.log('User state cleared');
    }
  };

  const register = async (userData) => {
    try {
      const response = await api.post('/api/auth/register/', userData);
      const { user } = response.data;

      setUser(user);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Registration failed'
      };
    }
  };

  const value = {
    user,
    loading,
    login,
    logout,
    register,
    checkAuthStatus
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

