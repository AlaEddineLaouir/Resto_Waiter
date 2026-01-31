import { Outlet } from 'react-router-dom';
import Header from './Header';
import styles from './Layout.module.css';

function Layout({ subtitle }) {
  return (
    <div className={styles.layout}>
      <Header subtitle={subtitle} />
      <main className={styles.content}>
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;
