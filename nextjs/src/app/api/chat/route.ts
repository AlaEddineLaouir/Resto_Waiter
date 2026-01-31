/**
 * Chat API Route
 * 
 * Handles chat completions with Perplexity AI and MCP tool execution
 */

import { executeGetMenu } from '@/lib/mcp-tools';

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { messages, tenantId } = await req.json();

    if (!tenantId) {
      return new Response(JSON.stringify({ error: 'Tenant ID required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!process.env.PERPLEXITY_API_KEY) {
      return new Response(JSON.stringify({ error: 'Perplexity API key not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get menu context for the AI
    const menuContext = await executeGetMenu(tenantId);

    // System prompt for the restaurant chatbot
    const systemPrompt = `You are a friendly Italian restaurant menu assistant named "Chef AI". You ONLY help customers with:
- Browsing the menu
- Finding dishes and their details
- Getting food recommendations
- Questions about ingredients and allergens
- Prices and meal suggestions

## STRICT BOUNDARIES (VERY IMPORTANT):
You must ONLY answer questions related to the restaurant menu, food, drinks, and dining experience.

If a user asks about ANYTHING else (politics, coding, math, general knowledge, personal advice, weather, news, etc.), politely decline and redirect:
"Mi scusi! 🍝 I'm Chef AI, your restaurant assistant. I can only help you with our menu, dishes, recommendations, and ingredients. Is there something from our menu I can help you with?"

Do NOT:
- Answer general knowledge questions
- Help with coding, math, or homework
- Discuss topics unrelated to food/restaurant
- Provide personal opinions on non-food topics

Here is the current menu:
${menuContext.content[0].text}

## Response Formatting Rules (CRITICAL - Follow these EXACTLY):

**IMPORTANT: Every section header and every menu item MUST be on its own separate line with a blank line before section headers.**

1. **Section Headers**: Put on their own line with TWO blank lines before each section:
   
   
   🍕 PIZZA
   
   (then list items below)

2. **Menu Items**: EACH item must be on its OWN LINE:
   - **Item Name** - €XX.XX - Description 🌱
   
   Example of CORRECT format:
   
   
   🍕 PIZZA
   
   - **Margherita** - €14.99 - San Marzano tomatoes, fresh mozzarella, basil 🌱
   - **Diavola** - €16.99 - Spicy salami with chili flakes 🌶️
   - **Quattro Formaggi** - €17.99 - Four cheese blend 🌱
   
   
   🍝 PASTA
   
   - **Carbonara** - €18.99 - Egg, guanciale, pecorino
   - **Cacio e Pepe** - €16.99 - Pecorino and black pepper 🌱

3. **Prices**: Always € followed by price

4. **Dietary Icons**: 🌱 vegetarian, 🌶️ spicy

5. **Full Menu**: When asked for full menu, list EVERY category with EVERY dish. Use the format above with proper line breaks.

6. **Specific Questions**: For specific questions, only show relevant items.

## NEVER DO THIS (wall of text):
Pizza Margherita - €14.99 Diavola - €16.99 Carbonara - €18.99

## ALWAYS DO THIS (proper line breaks):
🍕 PIZZA

- **Margherita** - €14.99 - Description 🌱
- **Diavola** - €16.99 - Description 🌶️

## Tone:
- Friendly and welcoming
- Use occasional Italian phrases (Buongiorno!, Perfetto!, Buon appetito!)
- Use food emojis sparingly (🍕 🍝 🥗 🍷)
- Be helpful about Italian cuisine
- If unsure about allergens, advise asking staff

Remember: Format responses cleanly without markdown table syntax (no | pipes) and without ### or ** around section headers.`;

    // Build properly alternating messages for Perplexity API
    // Perplexity requires: system -> user -> assistant -> user -> assistant...
    // The frontend includes a welcome message that breaks alternation, so we need to rebuild
    const conversationMessages: { role: string; content: string }[] = [];
    
    for (const m of messages) {
      // Skip empty messages
      if (!m.content || m.content.trim() === '') continue;
      // Skip system messages (we add our own)
      if (m.role === 'system') continue;
      
      // For user messages, always add them
      if (m.role === 'user') {
        conversationMessages.push({ role: 'user', content: m.content });
      }
      // For assistant messages, only add if there's a preceding user message
      else if (m.role === 'assistant') {
        // Check if the last message we added was from the user
        if (conversationMessages.length > 0 && 
            conversationMessages[conversationMessages.length - 1].role === 'user') {
          conversationMessages.push({ role: 'assistant', content: m.content });
        }
        // Otherwise skip this assistant message (like the welcome message)
      }
    }

    // Ensure we have at least one user message at the end
    if (conversationMessages.length === 0 || 
        conversationMessages[conversationMessages.length - 1].role !== 'user') {
      return new Response(JSON.stringify({ error: 'Invalid message format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Call Perplexity API directly with streaming
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          { role: 'system', content: systemPrompt },
          ...conversationMessages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Perplexity API error:', response.status, errorText);
      throw new Error(`Perplexity API error: ${response.status}`);
    }

    // Return the stream directly
    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return new Response(JSON.stringify({ error: 'Failed to process chat message' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
