import { useState, useEffect, useCallback } from 'react';
import { menuApi } from '../services/api';

/**
 * Hook for fetching and managing menu data
 */
export function useMenu() {
  const [menu, setMenu] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMenu = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await menuApi.getMenu();
      setMenu(data);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMenu();
  }, [fetchMenu]);

  const searchDishes = useCallback(async (query) => {
    if (!query.trim()) {
      // Return to full menu
      await fetchMenu();
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const results = await menuApi.searchDishes(query);

      if (results.dishes && results.dishes.length > 0) {
        // Group by category
        const grouped = {};
        results.dishes.forEach((dish) => {
          if (!grouped[dish.category]) {
            grouped[dish.category] = [];
          }
          grouped[dish.category].push(dish);
        });

        const searchResults = {
          ...menu,
          categories: Object.entries(grouped).map(([name, dishes]) => ({
            name,
            dishes,
          })),
        };

        setMenu(searchResults);
      } else {
        setMenu({ ...menu, categories: [] });
        setError(`No dishes found matching "${query}"`);
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }, [fetchMenu, menu]);

  return {
    menu,
    loading,
    error,
    refetch: fetchMenu,
    searchDishes,
  };
}

export default useMenu;
