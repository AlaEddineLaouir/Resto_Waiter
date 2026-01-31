import { createContext, useContext, useState, useCallback } from 'react';
import { chatApi } from '../services/api';

const ChatContext = createContext(null);

export function ChatProvider({ children }) {
  const [messages, setMessages] = useState([
    {
      id: 1,
      content: `Welcome to La Bella Cucina! 🇮🇹

I'm your AI assistant. Ask me about our menu, dishes, ingredients, or get recommendations!

Try asking:
- "What's on the menu?"
- "Do you have vegetarian options?"
- "What's in the Carbonara?"
- "I'm allergic to gluten, what can I eat?"`,
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const sendMessage = useCallback(async (content) => {
    if (!content.trim()) return;

    // Add user message
    const userMessage = {
      id: Date.now(),
      content: content.trim(),
      isUser: true,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    try {
      const response = await chatApi.sendMessage(content.trim());

      // Add bot response
      const botMessage = {
        id: Date.now() + 1,
        content: response.message,
        isUser: false,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to send message';
      setError(errorMessage);

      // Add error message to chat
      const errorBotMessage = {
        id: Date.now() + 1,
        content: `Sorry, there was an error: ${errorMessage}`,
        isUser: false,
        isError: true,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, errorBotMessage]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([
      {
        id: 1,
        content: `Welcome back! How can I help you with our menu today?`,
        isUser: false,
        timestamp: new Date(),
      },
    ]);
    setError(null);
  }, []);

  const value = {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}

export default ChatContext;
