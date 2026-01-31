import styles from './LoadingSpinner.module.css';

function LoadingSpinner({ size = 'normal' }) {
  return (
    <div className={styles.spinnerContainer}>
      <div 
        className={`${styles.spinner} ${size === 'small' ? styles.spinnerSmall : ''}`}
      />
    </div>
  );
}

export default LoadingSpinner;
