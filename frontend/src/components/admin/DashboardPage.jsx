import { useDashboard } from '../../hooks';
import { LoadingSpinner } from '../common';
import styles from './Admin.module.css';

function DashboardPage() {
  const { data: dashboard, loading, error } = useDashboard();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <div className={styles.emptyState}>Error: {error}</div>;
  }

  return (
    <>
      <div className={styles.pageHeader}>
        <h1>Dashboard</h1>
        <p className={styles.pageDescription}>
          Overview of your restaurant menu management
        </p>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{dashboard?.categoryCount || 0}</div>
          <div className={styles.statLabel}>Categories</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{dashboard?.dishCount || 0}</div>
          <div className={styles.statLabel}>Dishes</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{dashboard?.ingredientCount || 0}</div>
          <div className={styles.statLabel}>Ingredients</div>
        </div>
      </div>

      <div className={styles.tableContainer}>
        <div className={styles.tableHeader}>
          <h2>Recent Activity</h2>
        </div>
        <div className={styles.emptyState}>
          No recent activity to display
        </div>
      </div>
    </>
  );
}

export default DashboardPage;
