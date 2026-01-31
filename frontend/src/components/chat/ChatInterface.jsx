import { useRef, useEffect } from 'react';
import { useChat, useTenant } from '../../contexts';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import TypingIndicator from './TypingIndicator';
import styles from './ChatInterface.module.css';

function ChatInterface() {
  const { messages, isLoading, sendMessage } = useChat();
  const { hasApiKey, tenantId } = useTenant();
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  return (
    <div className={styles.chatContainer}>
      <div className={styles.messagesContainer}>
        <MessageList messages={messages} />
        {isLoading && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      <div className={styles.inputContainer}>
        <div className={`${styles.apiStatus} ${hasApiKey ? styles.apiStatusSuccess : styles.apiStatusError}`}>
          {hasApiKey ? (
            <>✓ Connected ({tenantId})</>
          ) : (
            <>⚠️ API key not configured. <a href="/settings">Go to Settings</a></>
          )}
        </div>
        <MessageInput onSend={sendMessage} disabled={isLoading} />
      </div>
    </div>
  );
}

export default ChatInterface;
