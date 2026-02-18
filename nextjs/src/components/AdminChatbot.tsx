'use client';

import { useState, useRef, useEffect } from 'react';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  toolCall?: {
    name: string;
    result: string;
    success: boolean;
  };
}

interface AdminChatbotProps {
  tenantId: string;
  userPermissions: string[];
}

// Format content with proper styling for lists and sections
function formatContent(content: string): React.ReactNode {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];

  lines.forEach((line, idx) => {
    const trimmedLine = line.trim();

    // Empty lines = spacing
    if (trimmedLine === '') {
      elements.push(<div key={idx} className="h-2" />);
      return;
    }

    // Section headers with emoji (📋 MENU ITEMS, 📊 STATISTICS, etc.)
    if (trimmedLine.match(/^[📋📊📝⚠️✅❌🍽️🥗🍕🍝]/)) {
      const isHeader = trimmedLine === trimmedLine.toUpperCase() || trimmedLine.match(/^[📋📊📝⚠️✅❌]\s*[A-Z]/);
      
      if (trimmedLine.startsWith('✅')) {
        elements.push(
          <div key={idx} className="bg-green-50 border-l-4 border-green-500 p-2 my-2 rounded-r text-green-800 font-medium">
            {trimmedLine}
          </div>
        );
        return;
      }
      
      if (trimmedLine.startsWith('❌')) {
        elements.push(
          <div key={idx} className="bg-red-50 border-l-4 border-red-500 p-2 my-2 rounded-r text-red-800 font-medium">
            {trimmedLine}
          </div>
        );
        return;
      }
      
      if (trimmedLine.startsWith('⚠️')) {
        elements.push(
          <div key={idx} className="bg-amber-50 border-l-4 border-amber-500 p-2 my-2 rounded-r text-amber-800 font-medium">
            {trimmedLine}
          </div>
        );
        return;
      }

      if (isHeader) {
        elements.push(
          <div key={idx} className="font-bold text-gray-900 mt-3 mb-2 text-sm border-b border-gray-200 pb-1">
            {trimmedLine}
          </div>
        );
        return;
      }
    }

    // Bullet points with • or -
    if (trimmedLine.startsWith('•') || trimmedLine.startsWith('-')) {
      const text = trimmedLine.replace(/^[•\-]\s*/, '');
      // Check for bold text
      const formattedText = text.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold">$1</strong>');
      elements.push(
        <div key={idx} className="flex gap-2 my-1 ml-2">
          <span className="text-indigo-500 flex-shrink-0">•</span>
          <span 
            className="text-gray-700" 
            dangerouslySetInnerHTML={{ __html: formattedText }} 
          />
        </div>
      );
      return;
    }

    // Indented content (descriptions)
    if (line.startsWith('  ') && !trimmedLine.startsWith('•')) {
      elements.push(
        <div key={idx} className="text-gray-500 text-xs ml-6 -mt-1 mb-1">
          {trimmedLine}
        </div>
      );
      return;
    }

    // Regular text with possible bold
    const formattedText = trimmedLine.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold">$1</strong>');
    elements.push(
      <p 
        key={idx} 
        className="text-gray-700 my-1"
        dangerouslySetInnerHTML={{ __html: formattedText }}
      />
    );
  });

  return <div className="text-sm">{elements}</div>;
}

export default function AdminChatbot({ tenantId, userPermissions }: AdminChatbotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `👋 Hello! I'm your Admin Assistant. I can help you manage your restaurant menu, items, sections, ingredients, and more.\n\nTry asking me to:\n• "Create a new item called Margherita Pizza"\n• "List all sections"\n• "Add ingredient Mozzarella to Margherita Pizza"\n• "Update the price of Carbonara to €18.99"\n\nWhat would you like to do?`,
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/admin/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          messages: [...messages, userMessage].filter(m => m.role !== 'system'),
          tenantId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get response');
      }

      const data = await response.json();
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.message,
        toolCall: data.toolCall,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `❌ Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Check if user has admin chat permission (chatbot.read or any admin permissions)
  const hasAccess = userPermissions.includes('chatbot.read') || userPermissions.some(p => 
    ['items.create', 'items.update', 'items.delete', 'sections.create', 'sections.update', 'menus.update'].includes(p)
  );

  if (!hasAccess) return null;

  return (
    <>
      {/* Floating Chat Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 ${
          isOpen 
            ? 'bg-red-500 hover:bg-red-600 rotate-45' 
            : 'bg-indigo-600 hover:bg-indigo-700'
        }`}
        aria-label={isOpen ? 'Close chat' : 'Open admin chat'}
      >
        {isOpen ? (
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        ) : (
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-96 h-[500px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-3 flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold">Admin Assistant</h3>
              <p className="text-xs text-white/80">Manage your menu with AI</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-br-md'
                      : 'bg-white text-gray-800 shadow-sm border border-gray-100 rounded-bl-md'
                  }`}
                >
                  {message.role === 'user' ? (
                    <div className="whitespace-pre-wrap text-sm">{message.content}</div>
                  ) : (
                    formatContent(message.content)
                  )}
                  {message.toolCall && (
                    <div className={`mt-2 p-2 rounded text-xs ${
                      message.toolCall.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                    }`}>
                      <span className="font-medium">
                        {message.toolCall.success ? '✓' : '✗'} {message.toolCall.name}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white rounded-2xl rounded-bl-md px-4 py-3 shadow-sm border border-gray-100">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="p-4 bg-white border-t border-gray-100">
            <div className="flex gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask me to manage your menu..."
                className="flex-1 px-4 py-2 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                rows={1}
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
