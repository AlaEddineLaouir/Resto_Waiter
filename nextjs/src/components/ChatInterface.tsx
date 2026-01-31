'use client';

import { useRef, useEffect, useState } from 'react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface ChatInterfaceProps {
  tenantId: string;
  restaurantName?: string;
}

// Category icons mapping
const categoryIcons: Record<string, string> = {
  'antipasti': '🥗',
  'insalate': '🥗',
  'zuppe': '🍲',
  'pasta': '🍝',
  'risotto': '🍚',
  'pizza': '🍕',
  'pesce': '🐟',
  'carne': '🥩',
  'contorni': '🥦',
  'dolci': '🍰',
  'dessert': '🍰',
  'soft drinks': '🥤',
  'drinks': '🥤',
  'mocktails': '🍹',
  'caffè': '☕',
  'coffee': '☕',
  'digestivi': '🥃',
  'wine': '🍷',
  'vino': '🍷',
};

function getCategoryIcon(text: string): string {
  const lower = text.toLowerCase();
  for (const [key, icon] of Object.entries(categoryIcons)) {
    if (lower.includes(key)) return icon;
  }
  return '🍽️';
}

// Pre-process content to add proper line breaks for menu display
function preprocessContent(content: string): string {
  let processed = content;
  
  // Category patterns to detect
  const categoryPatterns = [
    'Antipasti', 'Insalate', 'Zuppe', 'Pasta', 'Risotto', 'Pizza', 
    'Pesce', 'Carne', 'Contorni', 'Dolci', 'Soft Drinks', 'Mocktails', 
    'Caffè e Digestivi', 'Caffè', 'Beverages', 'Desserts', 'Appetizers',
    'Main Courses', 'Sides', 'Salads', 'Soups'
  ];
  
  // First, detect if this is a wall of text (no line breaks but has category names)
  const hasMultipleCategories = categoryPatterns.filter(cat => processed.includes(cat)).length >= 2;
  const hasLineBreaks = (processed.match(/\n/g) || []).length > 5;
  
  if (hasMultipleCategories && !hasLineBreaks) {
    // This is a wall of text, we need to add line breaks
    
    // Add line breaks before each category name
    categoryPatterns.forEach(cat => {
      // Add newline before category if not at start
      const regex = new RegExp(`([^\\n])\\s+(${cat})\\s+`, 'g');
      processed = processed.replace(regex, `$1\n\n🏷️ $2\n\n`);
    });
    
    // Split menu items: find pattern "ItemName - €XX.XX - Description ItemName2"
    // and add line breaks between items
    processed = processed.replace(/(\d+\.\d{2}[^€]*?)([A-Z][a-zA-Zàèéìòù\s']+)\s+-\s+€/g, '$1\n- **$2** - €');
    
    // Handle first item in each section (doesn't have a price before it)
    processed = processed.replace(/🏷️\s+([^\n]+)\n\n([A-Z][a-zA-Zàèéìòù\s']+)\s+-\s+€/g, '🏷️ $1\n\n- **$2** - €');
  }
  
  // Clean up any double emojis or markers
  processed = processed.replace(/🏷️\s*🏷️/g, '🏷️');
  
  // Ensure there are proper line breaks before bullet points
  processed = processed.replace(/([^\n])\s+-\s+\*\*/g, '$1\n- **');
  
  return processed;
}

// Helper function to format message content with markdown-like styling
function formatContent(content: string): React.ReactNode {
  // Pre-process to fix wall-of-text issues
  const processedContent = preprocessContent(content);
  
  // Split by newlines to process line by line
  const lines = processedContent.split('\n');
  const elements: React.ReactNode[] = [];
  let currentParagraph: string[] = [];
  
  const flushParagraph = () => {
    if (currentParagraph.length > 0) {
      const text = currentParagraph.join(' ');
      elements.push(
        <p key={elements.length} className="my-2 leading-relaxed text-gray-700">
          {formatInlineText(text)}
        </p>
      );
      currentParagraph = [];
    }
  };

  lines.forEach((line, idx) => {
    const trimmedLine = line.trim();
    
    // Skip empty lines
    if (trimmedLine === '') {
      flushParagraph();
      return;
    }
    
    // Skip table separator lines (|---|---|)
    if (line.match(/^\|[\s\-:|]+\|$/)) {
      return;
    }
    
    // Skip table header lines (| Header | Header |)
    if (line.match(/^\|\s*\w+\s*\|.*\|$/) && lines[idx + 1]?.match(/^\|[\s\-:|]+\|$/)) {
      return;
    }

    // Handle category headers with emoji markers (🏷️ Category or 🍕 PIZZA)
    if (trimmedLine.match(/^[🏷️🍕🍝🥗🍲🐟🥩🥦🍰🥤🍹☕🍽️🥃🍷]\s*.+$/)) {
      flushParagraph();
      const headerText = trimmedLine.replace(/^[🏷️🍕🍝🥗🍲🐟🥩🥦🍰🥤🍹☕🍽️🥃🍷]\s*/, '');
      elements.push(
        <div key={`cat-${idx}`} className="mt-6 mb-4">
          <div className="flex items-center gap-3 bg-gradient-to-r from-red-50 to-amber-50 p-3 rounded-xl border border-red-100">
            <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-amber-500 rounded-xl flex items-center justify-center shadow-md">
              <span className="text-xl">{getCategoryIcon(headerText)}</span>
            </div>
            <h2 className="font-bold text-gray-900 text-xl">{headerText}</h2>
          </div>
        </div>
      );
      return;
    }

    // Handle *Section Header* (single asterisks around text at start of line)
    if (line.match(/^\*[^*]+\*$/)) {
      flushParagraph();
      const headerText = line.slice(1, -1);
      elements.push(
        <div key={`section-${idx}`} className="mt-6 mb-4">
          <div className="flex items-center gap-3 bg-gradient-to-r from-red-50 to-amber-50 p-3 rounded-xl border border-red-100">
            <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-amber-500 rounded-xl flex items-center justify-center shadow-md">
              <span className="text-xl">{getCategoryIcon(headerText)}</span>
            </div>
            <h2 className="font-bold text-gray-900 text-xl">{headerText}</h2>
          </div>
        </div>
      );
      return;
    }
    
    // Handle plain category headers (line with just a category name)
    const categoryNames = ['Antipasti', 'Insalate', 'Zuppe', 'Pasta', 'Risotto', 'Pizza', 'Pesce', 'Carne', 'Contorni', 'Dolci', 'Soft Drinks', 'Mocktails', 'Caffè e Digestivi', 'Caffè'];
    if (categoryNames.some(cat => trimmedLine === cat || trimmedLine.toUpperCase() === cat.toUpperCase())) {
      flushParagraph();
      elements.push(
        <div key={`plaincat-${idx}`} className="mt-6 mb-4">
          <div className="flex items-center gap-3 bg-gradient-to-r from-red-50 to-amber-50 p-3 rounded-xl border border-red-100">
            <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-amber-500 rounded-xl flex items-center justify-center shadow-md">
              <span className="text-xl">{getCategoryIcon(trimmedLine)}</span>
            </div>
            <h2 className="font-bold text-gray-900 text-xl">{trimmedLine}</h2>
          </div>
        </div>
      );
      return;
    }

    // Handle table rows with pipe separators (| item | price | description |)
    if (line.includes('|') && line.trim().startsWith('|')) {
      flushParagraph();
      // Parse the pipe-separated content
      const cells = line.split('|').filter(cell => cell.trim() !== '');
      if (cells.length >= 2) {
        // This is a menu item row
        const itemName = cells[0]?.trim() || '';
        const rest = cells.slice(1).join(' ').trim();
        
        elements.push(
          <div key={`row-${idx}`} className="flex flex-wrap items-baseline gap-2 py-2 border-b border-gray-100 last:border-0">
            <span className="font-medium text-gray-800">{formatInlineText(itemName)}</span>
            <span className="text-gray-600 text-sm">{formatInlineText(rest)}</span>
          </div>
        );
        return;
      }
    }

    // Handle headers (### Header)
    if (line.startsWith('### ')) {
      flushParagraph();
      const headerText = line.slice(4);
      elements.push(
        <div key={`h-${idx}`} className="flex items-center gap-3 mt-4 mb-2 pb-2 border-b border-amber-200">
          <span className="text-lg">🍽️</span>
          <h3 className="font-bold text-gray-800 text-base">{formatInlineText(headerText)}</h3>
        </div>
      );
      return;
    }
    
    // Handle ## Header
    if (line.startsWith('## ')) {
      flushParagraph();
      const headerText = line.slice(3);
      elements.push(
        <div key={`h2-${idx}`} className="flex items-center gap-3 mt-5 mb-3">
          <div className="w-1 h-6 bg-gradient-to-b from-red-500 to-amber-500 rounded-full"></div>
          <h2 className="font-bold text-gray-900 text-lg">{formatInlineText(headerText)}</h2>
        </div>
      );
      return;
    }

    // Handle bullet points (menu items with -)
    if (trimmedLine.startsWith('- ')) {
      flushParagraph();
      const itemContent = trimmedLine.slice(2);
      
      // Check if this is a menu item with price (contains € and -)
      if (itemContent.includes('€') && itemContent.includes(' - ')) {
        elements.push(
          <div key={`menu-${idx}`} className="bg-white border border-gray-100 rounded-xl p-3 my-2 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex flex-wrap items-start gap-2">
              {formatInlineText(itemContent)}
            </div>
          </div>
        );
      } else {
        elements.push(
          <div key={`li-${idx}`} className="flex items-start gap-3 my-1.5 ml-2">
            <span className="text-amber-500 mt-0.5">●</span>
            <span className="text-gray-700">{formatInlineText(itemContent)}</span>
          </div>
        );
      }
      return;
    }
    
    // Handle menu items without bullet but with **Name** - €Price pattern
    if (trimmedLine.match(/^\*\*[^*]+\*\*\s*-\s*€/)) {
      flushParagraph();
      elements.push(
        <div key={`item-${idx}`} className="bg-white border border-gray-100 rounded-xl p-3 my-2 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex flex-wrap items-start gap-2">
            {formatInlineText(trimmedLine)}
          </div>
        </div>
      );
      return;
    }

    // Handle numbered lists
    const numberedMatch = line.match(/^(\d+)\.\s(.+)/);
    if (numberedMatch) {
      flushParagraph();
      elements.push(
        <div key={`ol-${idx}`} className="flex items-start gap-3 my-1.5 ml-2">
          <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0">
            {numberedMatch[1]}
          </span>
          <span className="text-gray-700">{formatInlineText(numberedMatch[2])}</span>
        </div>
      );
      return;
    }

    // Empty line = paragraph break
    if (line.trim() === '') {
      flushParagraph();
      return;
    }

    // Regular text - accumulate for paragraph
    currentParagraph.push(line);
  });

  // Flush any remaining paragraph
  flushParagraph();

  return <div className="space-y-1">{elements}</div>;
}

// Format inline text (bold, italic, prices, etc.)
function formatInlineText(text: string): React.ReactNode {
  // Clean up any remaining pipe separators
  let cleanText = text.replace(/\s*\|\s*/g, ' • ').trim();
  
  // Remove leading/trailing bullets if they're empty
  cleanText = cleanText.replace(/^•\s*/, '').replace(/\s*•$/, '');
  
  // Process the text character by character for better control
  const result: React.ReactNode[] = [];
  let i = 0;
  let currentText = '';
  
  const flushCurrentText = () => {
    if (currentText) {
      result.push(<span key={result.length}>{currentText}</span>);
      currentText = '';
    }
  };
  
  while (i < cleanText.length) {
    // Handle **bold** text
    if (cleanText.slice(i, i + 2) === '**') {
      flushCurrentText();
      const endIdx = cleanText.indexOf('**', i + 2);
      if (endIdx !== -1) {
        const boldText = cleanText.slice(i + 2, endIdx);
        result.push(
          <strong key={result.length} className="font-semibold text-gray-900">{boldText}</strong>
        );
        i = endIdx + 2;
        continue;
      }
    }
    
    // Handle *italic* text (single asterisks, but not at line start which is a header)
    if (cleanText[i] === '*' && cleanText[i + 1] !== '*' && i > 0) {
      const endIdx = cleanText.indexOf('*', i + 1);
      if (endIdx !== -1 && endIdx - i < 50) { // Reasonable length for italic text
        flushCurrentText();
        const italicText = cleanText.slice(i + 1, endIdx);
        result.push(
          <em key={result.length} className="text-gray-700 italic">{italicText}</em>
        );
        i = endIdx + 1;
        continue;
      }
    }
    
    // Handle Euro prices (€XX.XX)
    const euroMatch = cleanText.slice(i).match(/^€\d+\.?\d*/);
    if (euroMatch) {
      flushCurrentText();
      result.push(
        <span key={result.length} className="font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md mx-0.5">
          {euroMatch[0]}
        </span>
      );
      i += euroMatch[0].length;
      continue;
    }
    
    // Handle Dollar prices ($XX.XX)
    const dollarMatch = cleanText.slice(i).match(/^\$\d+\.?\d*/);
    if (dollarMatch) {
      flushCurrentText();
      result.push(
        <span key={result.length} className="font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md mx-0.5">
          {dollarMatch[0]}
        </span>
      );
      i += dollarMatch[0].length;
      continue;
    }
    
    // Regular character
    currentText += cleanText[i];
    i++;
  }
  
  flushCurrentText();
  
  return <>{result}</>;
}

export default function ChatInterface({ tenantId, restaurantName = 'Restaurant' }: ChatInterfaceProps) {
  const [mounted, setMounted] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `👋 Benvenuto a ${restaurantName}!\n\nI'm your personal menu assistant. I can help you:\n\n- 🍝 Browse our authentic Italian menu\n- 🥗 Find vegetarian & dietary options\n- 🍷 Get personalized recommendations\n- 📋 Answer any questions about our dishes\n\nWhat would you like to explore today?`,
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          tenantId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '',
      };
      setMessages((prev) => [...prev, assistantMessage]);

      const decoder = new TextDecoder();
      let buffer = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                assistantMessage.content += content;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMessage.id ? { ...m, content: assistantMessage.content } : m
                  )
                );
              }
            } catch {
              // Not JSON, might be plain text
              if (data && data !== '[DONE]') {
                assistantMessage.content += data;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMessage.id ? { ...m, content: assistantMessage.content } : m
                  )
                );
              }
            }
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  if (!mounted) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-red-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-amber-200 border-t-amber-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading menu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-red-700 via-red-600 to-amber-600 text-white px-4 py-4 shadow-lg">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 backdrop-blur-sm p-2 rounded-xl">
              <span className="text-3xl">🍝</span>
            </div>
            <div>
              <h1 className="font-bold text-xl tracking-tight">{restaurantName}</h1>
              <p className="text-amber-100 text-sm flex items-center gap-2">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                AI Menu Concierge
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-full">
            <span className="text-sm">🇮🇹</span>
            <span className="text-sm font-medium">Authentic Italian</span>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {messages.map((message, index) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div
                className={`max-w-[85%] md:max-w-[75%] rounded-2xl px-5 py-4 ${
                  message.role === 'user'
                    ? 'bg-gradient-to-br from-red-600 to-red-700 text-white shadow-lg shadow-red-200'
                    : 'bg-white shadow-xl shadow-gray-200/50 border border-gray-100'
                }`}
              >
                {message.role === 'assistant' && (
                  <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
                    <div className="bg-gradient-to-br from-amber-400 to-orange-500 p-1.5 rounded-lg">
                      <span className="text-white text-sm">👨‍🍳</span>
                    </div>
                    <div>
                      <span className="font-semibold text-gray-800 text-sm">Chef AI</span>
                      <span className="text-gray-400 text-xs ml-2">Menu Expert</span>
                    </div>
                  </div>
                )}
                <div
                  className={`text-[15px] leading-relaxed ${
                    message.role === 'user' ? 'text-white' : 'text-gray-700'
                  }`}
                >
                  {message.role === 'assistant' ? formatContent(message.content) : message.content}
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start animate-fadeIn">
              <div className="bg-white shadow-xl shadow-gray-200/50 border border-gray-100 rounded-2xl px-5 py-4">
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
                  <div className="bg-gradient-to-br from-amber-400 to-orange-500 p-1.5 rounded-lg">
                    <span className="text-white text-sm">👨‍🍳</span>
                  </div>
                  <span className="font-semibold text-gray-800 text-sm">Chef AI</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex gap-1">
                    <span className="h-2.5 w-2.5 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="h-2.5 w-2.5 bg-gradient-to-r from-orange-500 to-red-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="h-2.5 w-2.5 bg-gradient-to-r from-red-500 to-red-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                  <span className="text-gray-500 text-sm italic">Preparing your answer...</span>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="flex justify-center animate-fadeIn">
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-5 py-3 flex items-center gap-3">
                <span className="text-xl">⚠️</span>
                <div>
                  <p className="font-medium">Something went wrong</p>
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-amber-200/50 bg-white/80 backdrop-blur-sm px-4 py-4">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask about our menu, ingredients, or get recommendations..."
                className="w-full px-5 py-3.5 pr-12 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white transition-all placeholder:text-gray-400"
                disabled={isLoading}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            </div>
            <button
              type="submit"
              disabled={isLoading || !inputValue.trim()}
              className="px-6 py-3.5 bg-gradient-to-r from-red-600 to-amber-600 text-white rounded-xl font-semibold hover:from-red-700 hover:to-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-red-200 hover:shadow-xl hover:shadow-red-300 hover:-translate-y-0.5"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span>
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Send
                  <span>→</span>
                </span>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Quick Actions */}
      <div className="border-t border-amber-200/30 bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wide">Quick suggestions</p>
          <div className="flex flex-wrap gap-2">
            {[
              { emoji: '📜', text: 'Show full menu' },
              { emoji: '🥗', text: 'Vegetarian dishes' },
              { emoji: '🍕', text: 'Pizza options' },
              { emoji: '🍝', text: 'Pasta specials' },
              { emoji: '🍹', text: 'Drinks & Mocktails' },
              { emoji: '🍰', text: 'Desserts' },
            ].map((suggestion) => (
              <button
                key={suggestion.text}
                onClick={() => setInputValue(suggestion.text)}
                className="px-4 py-2 bg-white border border-amber-200 rounded-full text-sm text-gray-700 hover:bg-amber-50 hover:border-amber-300 hover:text-amber-800 transition-all flex items-center gap-2 shadow-sm hover:shadow"
              >
                <span>{suggestion.emoji}</span>
                <span>{suggestion.text}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Add keyframes for fadeIn animation */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
