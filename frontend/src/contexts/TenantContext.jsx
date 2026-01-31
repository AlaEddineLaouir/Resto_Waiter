import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { configApi } from '../services/api';

const TenantContext = createContext(null);

export function TenantProvider({ children }) {
  const [tenant, setTenant] = useState(null);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadTenantData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [tenantData, configData] = await Promise.all([
        configApi.getTenant().catch(() => null),
        configApi.getConfig().catch(() => null),
      ]);

      setTenant(tenantData);
      setConfig(configData);

      // Apply tenant branding
      if (tenantData?.branding?.primaryColor) {
        document.documentElement.style.setProperty(
          '--primary-color',
          tenantData.branding.primaryColor
        );
      }

      // Update document title
      if (tenantData?.branding?.restaurantName) {
        document.title = `${tenantData.branding.restaurantName} Chat`;
      }
    } catch (err) {
      setError(err.message);
      console.error('Failed to load tenant data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTenantData();
  }, [loadTenantData]);

  const refreshConfig = useCallback(async () => {
    try {
      const configData = await configApi.getConfig();
      setConfig(configData);
      return configData;
    } catch (err) {
      console.error('Failed to refresh config:', err);
      throw err;
    }
  }, []);

  const value = {
    tenant,
    config,
    loading,
    error,
    refreshConfig,
    reload: loadTenantData,
    // Computed values
    restaurantName: tenant?.branding?.restaurantName || 'Restaurant',
    hasApiKey: config?.hasApiKey || false,
    tenantId: config?.tenantId || tenant?.id || 'default',
  };

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}

export default TenantContext;
