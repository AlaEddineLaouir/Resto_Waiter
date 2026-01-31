import { useState } from 'react';
import styles from './MessageInput.module.css';

function MessageInput({ onSend, disabled = false }) {
  const [message, setMessage] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!message.trim() || disabled) return;

    onSend(message);
    setMessage('');
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <input
        type="text"
        className={styles.input}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Ask about our menu..."
        disabled={disabled}
        autoComplete="off"
      />
      <button type="submit" className={styles.button} disabled={disabled || !message.trim()}>
        Send
      </button>
    </form>
  );
}

export default MessageInput;
