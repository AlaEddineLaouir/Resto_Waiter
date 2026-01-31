import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { adminApi } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state from localStorage
  useEffect(() => {
    const storedToken = localStorage.getItem('adminToken');
    const storedUser = localStorage.getItem('adminUser');
    const storedTenant = localStorage.getItem('adminTenant');

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      setTenant(storedTenant ? JSON.parse(storedTenant) : null);
    }
    setLoading(false);

    // Listen for logout events from API interceptor
    const handleLogout = () => logout();
    window.addEventListener('auth:logout', handleLogout);
    return () => window.removeEventListener('auth:logout', handleLogout);
  }, []);

  const login = useCallback(async (email, password, tenantSlug = 'default') => {
    try {
      const data = await adminApi.login(email, password, tenantSlug);

      // Store auth data
      localStorage.setItem('adminToken', data.token);
      localStorage.setItem('adminUser', JSON.stringify(data.user));
      localStorage.setItem('adminTenant', JSON.stringify(data.tenant));

      setToken(data.token);
      setUser(data.user);
      setTenant(data.tenant);

      return data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Login failed');
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await adminApi.logout();
    } catch (error) {
      // Ignore logout errors
    }

    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    localStorage.removeItem('adminTenant');

    setToken(null);
    setUser(null);
    setTenant(null);
  }, []);

  const value = {
    user,
    tenant,
    token,
    loading,
    isAuthenticated: !!token && !!user,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
