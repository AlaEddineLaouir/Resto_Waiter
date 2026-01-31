import { NavLink, Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import styles from './Admin.module.css';

function AdminLayout() {
  const { isAuthenticated, user, tenant, logout } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  return (
    <div className={styles.adminLayout}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <h2>🍽️ Admin Panel</h2>
          <div className={styles.tenantName}>{tenant?.name || 'Restaurant'}</div>
        </div>

        <nav className={styles.sidebarNav}>
          <NavLink
            to="/admin"
            end
            className={({ isActive }) =>
              `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
            }
          >
            📊 Dashboard
          </NavLink>
          <NavLink
            to="/admin/menu"
            className={({ isActive }) =>
              `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
            }
          >
            🍽️ Menu
          </NavLink>
          <NavLink
            to="/admin/ingredients"
            className={({ isActive }) =>
              `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
            }
          >
            🥕 Ingredients
          </NavLink>
          <NavLink
            to="/admin/settings"
            className={({ isActive }) =>
              `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
            }
          >
            ⚙️ Settings
          </NavLink>
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.userInfo}>{user?.email}</div>
          <button className={styles.logoutBtn} onClick={logout}>
            Logout
          </button>
        </div>
      </aside>

      <main className={styles.mainContent}>
        <Outlet />
      </main>
    </div>
  );
}

export default AdminLayout;
