import styles from './MessageItem.module.css';

/**
 * Format message content with basic markdown
 */
function formatMessage(text) {
  // Escape HTML
  let formatted = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Bold
  formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  // Italic
  formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');

  // Line breaks
  formatted = formatted.replace(/\n/g, '<br>');

  // Lists
  formatted = formatted.replace(/^- (.*?)(<br>|$)/gm, '<li>$1</li>');
  formatted = formatted.replace(/(<li>.*<\/li>)+/g, '<ul>$&</ul>');

  return formatted;
}

function MessageItem({ message }) {
  const { content, isUser, isError } = message;

  const messageClass = `${styles.message} ${
    isUser ? styles.userMessage : styles.botMessage
  } ${isError ? styles.errorMessage : ''}`;

  return (
    <div className={messageClass}>
      <div 
        className={styles.messageContent}
        dangerouslySetInnerHTML={
          isUser ? undefined : { __html: formatMessage(content) }
        }
      >
        {isUser ? content : null}
      </div>
    </div>
  );
}

export default MessageItem;
