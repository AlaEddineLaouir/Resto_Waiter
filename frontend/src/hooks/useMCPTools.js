import { useState, useEffect, useCallback } from 'react';
import { configApi } from '../services/api';

/**
 * Hook for fetching and managing MCP tools
 */
export function useMCPTools() {
  const [tools, setTools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTools = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await configApi.getTools();
      setTools(data);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTools();
  }, [fetchTools]);

  return {
    tools,
    loading,
    error,
    refetch: fetchTools,
  };
}

export default useMCPTools;
