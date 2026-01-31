import { useState, useCallback } from 'react';
import { useMenu } from '../../hooks';
import { LoadingSpinner } from '../common';
import MenuCategory from './MenuCategory';
import styles from './MenuPage.module.css';

function MenuPage() {
  const { menu, loading, error, searchDishes } = useMenu();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTimeout, setSearchTimeout] = useState(null);

  const handleSearch = useCallback((value) => {
    setSearchQuery(value);
    
    // Debounce search
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    const timeout = setTimeout(() => {
      searchDishes(value.trim());
    }, 300);
    
    setSearchTimeout(timeout);
  }, [searchTimeout, searchDishes]);

  if (loading && !menu) {
    return <LoadingSpinner />;
  }

  return (
    <div className={styles.container}>
      <div className={styles.searchBar}>
        <input
          type="text"
          className={styles.searchInput}
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search dishes or ingredients..."
          autoComplete="off"
        />
      </div>

      {error && !menu?.categories?.length && (
        <div className={styles.error}>{error}</div>
      )}

      <div className={styles.menuContent}>
        {menu?.categories?.length > 0 ? (
          menu.categories.map((category) => (
            <MenuCategory key={category.name} category={category} />
          ))
        ) : (
          !loading && !error && (
            <div className={styles.noResults}>No dishes found</div>
          )
        )}
      </div>
    </div>
  );
}

export default MenuPage;
