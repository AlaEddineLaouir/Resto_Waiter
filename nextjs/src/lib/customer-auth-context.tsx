'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface CustomerUser {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  isGuest: boolean;
}

interface CustomerAuthContextValue {
  customer: CustomerUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: { email: string; password: string; name?: string; phone?: string }) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const CustomerAuthContext = createContext<CustomerAuthContextValue | undefined>(undefined);

export function CustomerAuthProvider({
  children,
  tenantSlug,
}: {
  children: React.ReactNode;
  tenantSlug: string;
}) {
  const [customer, setCustomer] = useState<CustomerUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/t/${tenantSlug}/customer/me`);
      if (res.ok) {
        const data = await res.json();
        setCustomer(data.customer);
      } else {
        setCustomer(null);
      }
    } catch {
      setCustomer(null);
    } finally {
      setLoading(false);
    }
  }, [tenantSlug]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(
    async (email: string, password: string) => {
      try {
        const res = await fetch(`/api/t/${tenantSlug}/customer/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok) {
          return { success: false, error: data.error || 'Login failed' };
        }
        setCustomer(data.customer);
        return { success: true };
      } catch {
        return { success: false, error: 'Network error' };
      }
    },
    [tenantSlug]
  );

  const register = useCallback(
    async (data: { email: string; password: string; name?: string; phone?: string }) => {
      try {
        const res = await fetch(`/api/t/${tenantSlug}/customer/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        const result = await res.json();
        if (!res.ok) {
          return { success: false, error: result.error || 'Registration failed' };
        }
        setCustomer(result.customer);
        return { success: true };
      } catch {
        return { success: false, error: 'Network error' };
      }
    },
    [tenantSlug]
  );

  const logout = useCallback(async () => {
    try {
      await fetch(`/api/t/${tenantSlug}/customer/me`, { method: 'DELETE' });
    } catch {
      // ignore
    }
    setCustomer(null);
  }, [tenantSlug]);

  return (
    <CustomerAuthContext.Provider
      value={{ customer, loading, login, register, logout, refresh }}
    >
      {children}
    </CustomerAuthContext.Provider>
  );
}

export function useCustomerAuth(): CustomerAuthContextValue {
  const ctx = useContext(CustomerAuthContext);
  if (!ctx) {
    throw new Error('useCustomerAuth must be used within a CustomerAuthProvider');
  }
  return ctx;
}
