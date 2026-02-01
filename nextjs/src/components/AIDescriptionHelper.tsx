'use client';

import { useState } from 'react';

interface AIDescriptionHelperProps {
  context: string; // e.g., item name, section title
  contextType: 'item' | 'section' | 'menu' | 'ingredient';
  onGenerate: (description: string) => void;
  disabled?: boolean;
}

export default function AIDescriptionHelper({
  context,
  contextType,
  onGenerate,
  disabled = false,
}: AIDescriptionHelperProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateDescription = async () => {
    if (!context.trim() || isGenerating || disabled) return;

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/generate-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context, contextType }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate');
      }

      const data = await response.json();
      
      if (data.description) {
        onGenerate(data.description);
      } else {
        throw new Error('No description generated');
      }
    } catch (err) {
      console.error('Failed to generate description:', err);
      setError('Failed to generate');
      // Hide error after 3 seconds
      setTimeout(() => setError(null), 3000);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <button
        type="button"
        onClick={generateDescription}
        disabled={disabled || isGenerating || !context.trim()}
        className={`p-1.5 rounded-lg transition-all duration-200 ${
          disabled || !context.trim()
            ? 'text-gray-300 cursor-not-allowed'
            : isGenerating
            ? 'text-purple-500 animate-pulse'
            : error
            ? 'text-red-500'
            : 'text-gray-400 hover:text-purple-600 hover:bg-purple-50'
        }`}
        title="Generate description with AI"
      >
        {isGenerating ? (
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          </svg>
        )}
      </button>

      {/* Tooltip */}
      {showTooltip && !isGenerating && context.trim() && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap z-10 shadow-lg">
          {error ? '❌ Failed - try again' : '✨ Generate AI description'}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
        </div>
      )}
    </div>
  );
}
