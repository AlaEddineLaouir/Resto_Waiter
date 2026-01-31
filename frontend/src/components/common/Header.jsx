import { NavLink } from 'react-router-dom';
import { useTenant } from '../../contexts/TenantContext';
import styles from './Header.module.css';

function Header({ subtitle = 'Your AI Restaurant Assistant' }) {
  const { restaurantName } = useTenant();

  return (
    <header className={styles.header}>
      <h1>🍽️ {restaurantName}</h1>
      <p>{subtitle}</p>
      <nav className={styles.nav}>
        <NavLink 
          to="/" 
          className={({ isActive }) => 
            `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`
          }
        >
          Chat
        </NavLink>
        <NavLink 
          to="/menu" 
          className={({ isActive }) => 
            `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`
          }
        >
          Menu
        </NavLink>
        <NavLink 
          to="/settings" 
          className={({ isActive }) => 
            `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`
          }
        >
          ⚙️ Settings
        </NavLink>
        <NavLink 
          to="/admin" 
          className={({ isActive }) => 
            `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`
          }
        >
          🔐 Admin
        </NavLink>
      </nav>
    </header>
  );
}

export default Header;
