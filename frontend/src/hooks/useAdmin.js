import { useState, useEffect, useCallback } from 'react';
import { adminApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

/**
 * Generic hook for admin CRUD operations
 */
export function useAdminData(fetchFn, dependencies = []) {
  const { isAuthenticated } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const result = await fetchFn();
      setData(result);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, fetchFn, ...dependencies]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return {
    data,
    loading,
    error,
    refetch: fetch,
    setData,
  };
}

/**
 * Hook for admin dashboard data
 */
export function useDashboard() {
  return useAdminData(adminApi.getDashboard);
}

/**
 * Hook for admin categories
 */
export function useAdminCategories() {
  const { data, loading, error, refetch, setData } = useAdminData(adminApi.getCategories);

  const createCategory = useCallback(async (categoryData) => {
    try {
      const result = await adminApi.createCategory(categoryData);
      await refetch();
      return result;
    } catch (err) {
      throw new Error(err.response?.data?.error || err.message);
    }
  }, [refetch]);

  const updateCategory = useCallback(async (id, categoryData) => {
    try {
      const result = await adminApi.updateCategory(id, categoryData);
      await refetch();
      return result;
    } catch (err) {
      throw new Error(err.response?.data?.error || err.message);
    }
  }, [refetch]);

  const deleteCategory = useCallback(async (id) => {
    try {
      await adminApi.deleteCategory(id);
      await refetch();
    } catch (err) {
      throw new Error(err.response?.data?.error || err.message);
    }
  }, [refetch]);

  return {
    categories: data,
    loading,
    error,
    refetch,
    createCategory,
    updateCategory,
    deleteCategory,
  };
}

/**
 * Hook for admin dishes
 */
export function useAdminDishes() {
  const { data, loading, error, refetch } = useAdminData(adminApi.getDishes);

  const createDish = useCallback(async (formData) => {
    try {
      const result = await adminApi.createDish(formData);
      await refetch();
      return result;
    } catch (err) {
      throw new Error(err.response?.data?.error || err.message);
    }
  }, [refetch]);

  const updateDish = useCallback(async (id, formData) => {
    try {
      const result = await adminApi.updateDish(id, formData);
      await refetch();
      return result;
    } catch (err) {
      throw new Error(err.response?.data?.error || err.message);
    }
  }, [refetch]);

  const deleteDish = useCallback(async (id) => {
    try {
      await adminApi.deleteDish(id);
      await refetch();
    } catch (err) {
      throw new Error(err.response?.data?.error || err.message);
    }
  }, [refetch]);

  return {
    dishes: data,
    loading,
    error,
    refetch,
    createDish,
    updateDish,
    deleteDish,
  };
}

/**
 * Hook for admin ingredients
 */
export function useAdminIngredients() {
  const { data, loading, error, refetch } = useAdminData(adminApi.getIngredients);

  const createIngredient = useCallback(async (ingredientData) => {
    try {
      const result = await adminApi.createIngredient(ingredientData);
      await refetch();
      return result;
    } catch (err) {
      throw new Error(err.response?.data?.error || err.message);
    }
  }, [refetch]);

  const updateIngredient = useCallback(async (id, ingredientData) => {
    try {
      const result = await adminApi.updateIngredient(id, ingredientData);
      await refetch();
      return result;
    } catch (err) {
      throw new Error(err.response?.data?.error || err.message);
    }
  }, [refetch]);

  const deleteIngredient = useCallback(async (id) => {
    try {
      await adminApi.deleteIngredient(id);
      await refetch();
    } catch (err) {
      throw new Error(err.response?.data?.error || err.message);
    }
  }, [refetch]);

  return {
    ingredients: data,
    loading,
    error,
    refetch,
    createIngredient,
    updateIngredient,
    deleteIngredient,
  };
}

/**
 * Hook for admin settings
 */
export function useAdminSettings() {
  const { data, loading, error, refetch } = useAdminData(adminApi.getSettings);
  const [saving, setSaving] = useState(false);

  const updateSettings = useCallback(async (settingsData) => {
    try {
      setSaving(true);
      const result = await adminApi.updateSettings(settingsData);
      await refetch();
      return result;
    } catch (err) {
      throw new Error(err.response?.data?.error || err.message);
    } finally {
      setSaving(false);
    }
  }, [refetch]);

  return {
    settings: data,
    loading,
    saving,
    error,
    refetch,
    updateSettings,
  };
}

export default useAdminData;
