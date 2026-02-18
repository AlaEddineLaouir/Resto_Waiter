/**
 * Chat API Route
 * 
 * Handles chat completions with Perplexity AI and MCP tool execution
 */

import { executeGetMenu } from '@/lib/mcp-tools';
import { prisma } from '@/lib/prisma';

export const maxDuration = 30;

// Helper to track chat session and update analytics
async function trackChatSession(tenantId: string, sessionId: string | undefined) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  console.log('[Chat Tracking] tenantId:', tenantId, 'sessionId:', sessionId);

  try {
    // If no sessionId, this is a new session - create one and update analytics
    if (!sessionId) {
      console.log('[Chat Tracking] Creating new session...');
      // Generate a unique session ID
      const newSessionId = crypto.randomUUID();
      
      // Create a new chat session
      const chatSession = await prisma.chatSession.create({
        data: {
          tenantId,
          sessionId: newSessionId,
        },
      });
      console.log('[Chat Tracking] Created session:', chatSession.id);

      // Update or create usage analytics for today
      const analytics = await prisma.usageAnalytics.upsert({
        where: {
          restaurantId_date: {
            restaurantId: tenantId,
            date: today,
          },
        },
        update: {
          chatSessions: { increment: 1 },
          apiCalls: { increment: 1 },
        },
        create: {
          restaurantId: tenantId,
          date: today,
          chatSessions: 1,
          apiCalls: 1,
          menuViews: 0,
          uniqueUsers: 0,
        },
      });
      console.log('[Chat Tracking] Updated analytics:', analytics);

      return chatSession.id;
    }

    // Existing session - just increment API calls
    await prisma.usageAnalytics.upsert({
      where: {
        restaurantId_date: {
          restaurantId: tenantId,
          date: today,
        },
      },
      update: {
        apiCalls: { increment: 1 },
      },
      create: {
        restaurantId: tenantId,
        date: today,
        chatSessions: 0,
        apiCalls: 1,
        menuViews: 0,
        uniqueUsers: 0,
      },
    });

    return sessionId;
  } catch (error) {
    console.error('[Chat Tracking] Error tracking chat session:', error);
    return sessionId;
  }
}

export async function POST(req: Request) {
  try {
    const { messages, tenantId: rawTenantId, sessionId } = await req.json();

    if (!rawTenantId) {
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

    // Resolve tenant ID - if "default", find a demo restaurant
    let tenantId = rawTenantId;
    if (rawTenantId === 'default') {
      const demoTenant = await prisma.tenant.findFirst({
        where: {
          OR: [
            { slug: 'demo-restaurant' },
            { slug: 'baraka' },
            { isActive: true }
          ]
        },
        orderBy: { createdAt: 'asc' }
      });
      
      if (!demoTenant) {
        return new Response(JSON.stringify({ 
          error: 'No restaurant configured. Please run database seeds first.' 
        }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      tenantId = demoTenant.id;
      console.log('[Chat] Resolved default tenant to:', demoTenant.slug, tenantId);
    }

    // Track chat session and update analytics (skip for demo/default mode)
    const currentSessionId = rawTenantId !== 'default' 
      ? await trackChatSession(tenantId, sessionId) 
      : sessionId;

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
    
    console.log('[Chat] Raw messages received:', JSON.stringify(messages.map((m: { role: string; content?: string }) => ({ role: m.role, content: m.content?.substring(0, 50) }))));
    
    for (const m of messages) {
      // Skip empty messages
      if (!m.content || m.content.trim() === '') continue;
      // Skip system messages (we add our own)
      if (m.role === 'system') continue;
      
      const lastMessage = conversationMessages[conversationMessages.length - 1];
      
      // For user messages
      if (m.role === 'user') {
        // If the last message was also a user message, merge them or skip
        if (lastMessage && lastMessage.role === 'user') {
          // Merge consecutive user messages
          lastMessage.content += '\n' + m.content;
        } else {
          conversationMessages.push({ role: 'user', content: m.content });
        }
      }
      // For assistant messages, only add if there's a preceding user message
      else if (m.role === 'assistant') {
        // Only add if the last message was from the user
        if (lastMessage && lastMessage.role === 'user') {
          conversationMessages.push({ role: 'assistant', content: m.content });
        }
        // Otherwise skip this assistant message (like the welcome message at the start)
      }
    }
    
    console.log('[Chat] Processed messages:', JSON.stringify(conversationMessages.map(m => ({ role: m.role, content: m.content?.substring(0, 50) }))));

    // Ensure we have at least one user message at the end
    if (conversationMessages.length === 0 || 
        conversationMessages[conversationMessages.length - 1].role !== 'user') {
      console.log('[Chat] Invalid: no messages or last message is not user');
      return new Response(JSON.stringify({ error: 'Invalid message format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    // Final safety check: ensure strict alternation (user, assistant, user, assistant...)
    // If there are consecutive messages of same role, fix them
    const finalMessages: { role: string; content: string }[] = [];
    for (const m of conversationMessages) {
      const last = finalMessages[finalMessages.length - 1];
      if (!last) {
        // First message must be user
        if (m.role === 'user') {
          finalMessages.push(m);
        }
      } else if (last.role !== m.role) {
        // Alternating - good
        finalMessages.push(m);
      } else if (m.role === 'user') {
        // Consecutive user messages - merge
        last.content += '\n' + m.content;
      }
      // Skip consecutive assistant messages
    }
    
    console.log('[Chat] Final messages for API:', JSON.stringify(finalMessages.map(m => ({ role: m.role, len: m.content?.length }))));

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
          ...finalMessages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Perplexity API error:', response.status, errorText);
      throw new Error(`Perplexity API error: ${response.status}`);
    }

    // Create a transform stream to clean up Perplexity's citations from content only
    const transformStream = new TransformStream({
      transform(chunk, controller) {
        const text = new TextDecoder().decode(chunk);
        
        // Split into lines and process each SSE line
        const lines = text.split('\n');
        const processedLines = lines.map(line => {
          if (!line.startsWith('data: ') || line === 'data: [DONE]') {
            return line;
          }
          
          try {
            const jsonStr = line.slice(6); // Remove "data: " prefix
            const data = JSON.parse(jsonStr);
            
            // Clean citations from the content field only
            if (data.choices?.[0]?.delta?.content) {
              data.choices[0].delta.content = data.choices[0].delta.content
                .replace(/\[\d+\]/g, '')
                .replace(/\[\d+,\s*\d+\]/g, '');
            }
            if (data.choices?.[0]?.message?.content) {
              data.choices[0].message.content = data.choices[0].message.content
                .replace(/\[\d+\]/g, '')
                .replace(/\[\d+,\s*\d+\]/g, '');
            }
            
            return 'data: ' + JSON.stringify(data);
          } catch {
            // If parsing fails, return original line
            return line;
          }
        });
        
        controller.enqueue(new TextEncoder().encode(processedLines.join('\n')));
      },
    });

    // Pipe the response through the transform stream
    const cleanedStream = response.body?.pipeThrough(transformStream);

    // Return the cleaned stream with session ID in header
    return new Response(cleanedStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Session-Id': currentSessionId || '',
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
