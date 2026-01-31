import { useState, useEffect } from 'react';
import styles from './Notification.module.css';

function Notification({ message, type = 'info', duration = 3000, onClose }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Trigger animation
    setTimeout(() => setShow(true), 10);

    // Auto close
    const timer = setTimeout(() => {
      setShow(false);
      setTimeout(() => onClose?.(), 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const handleClose = () => {
    setShow(false);
    setTimeout(() => onClose?.(), 300);
  };

  return (
    <div className={`${styles.notification} ${styles[type]} ${show ? styles.show : ''}`}>
      <span>{message}</span>
      <button className={styles.closeButton} onClick={handleClose}>
        ×
      </button>
    </div>
  );
}

export default Notification;
