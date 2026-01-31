import styles from './TypingIndicator.module.css';

function TypingIndicator() {
  return (
    <div className={styles.container}>
      <div className={styles.indicator}>
        <span className={styles.dot} />
        <span className={styles.dot} />
        <span className={styles.dot} />
      </div>
    </div>
  );
}

export default TypingIndicator;
