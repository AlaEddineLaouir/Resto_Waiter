import { useState, useCallback } from 'react';
import { configApi } from '../services/api';
import { useTenant } from '../contexts/TenantContext';

/**
 * Hook for managing settings/config
 */
export function useSettings() {
  const { config, refreshConfig } = useTenant();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const saveSettings = useCallback(async (settings) => {
    try {
      setSaving(true);
      setError(null);
      await configApi.saveConfig(settings);
      await refreshConfig();
      return { success: true };
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message;
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setSaving(false);
    }
  }, [refreshConfig]);

  const testConnection = useCallback(async () => {
    try {
      setError(null);
      const { chatApi } = await import('../services/api');
      await chatApi.sendMessage('Hello, what is on the menu?');
      return { success: true };
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message;
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, []);

  return {
    config,
    saving,
    error,
    saveSettings,
    testConnection,
    clearError: () => setError(null),
  };
}

export default useSettings;
