/**
 * Admin Chat API Route
 * 
 * Handles admin chatbot requests with RBAC permission checks
 * Supports tool calling for CRUD operations on menu data
 */

import { NextResponse } from 'next/server';
import { getRestaurantSession } from '@/lib/restaurant-auth';
import { adminMenuTools, executeAdminTool } from '@/lib/admin-mcp-tools';
import { executeGetMenu } from '@/lib/mcp-tools';

export const maxDuration = 60;

interface Message {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  name?: string;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: { name: string; arguments: string };
  }>;
  tool_call_id?: string;
}

export async function POST(req: Request) {
  try {
    // Get authenticated session
    const session = await getRestaurantSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check for chatbot permission
    const hasAccess = session.role === 'admin' || session.permissions?.includes('chatbot.read');
    if (!hasAccess) {
      return NextResponse.json({ error: 'No access to admin chatbot' }, { status: 403 });
    }

    const { messages } = await req.json();

    if (!process.env.PERPLEXITY_API_KEY && !process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'No AI API key configured' }, { status: 500 });
    }

    // Get current menu context for the AI
    const menuContext = await executeGetMenu(session.tenantId);

    // Build tool definitions for function calling
    const tools = Object.entries(adminMenuTools).map(([name, tool]) => ({
      type: 'function' as const,
      function: {
        name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }));

    // System prompt for admin chatbot
    const systemPrompt = `You are an AI assistant for restaurant menu administration. You help restaurant staff manage their menu through natural language commands.

## Your Capabilities
You can perform the following operations:
- **Menu Items**: Create, update, delete, list, and search menu items
- **Sections**: Create, update, list menu sections (categories)
- **Ingredients**: Add, manage, and link ingredients to items
- **Pricing**: Update individual prices or bulk price changes
- **Visibility**: Show/hide items from customer-facing menu
- **Statistics**: View menu statistics and analytics
- **Location Menus**: Activate/deactivate menus for specific locations, view which menus are active at which locations

## Current Menu Overview
${menuContext.content[0].text}

## Available Tools
You have access to tools for CRUD operations. Use them when the user requests changes.

## IMPORTANT: Location Menu Management
When the user asks to activate or deactivate a menu for a location:
1. If you don't know the menu name or location name, FIRST call \`list_menus\` and/or \`list_locations\` to get the available options
2. Then use \`activate_menu_for_location\` or \`deactivate_menu_for_location\` with the menuName and locationName parameters
3. You can also use \`get_location_menus\` to see which menus are currently active at a location
4. Use \`list_menu_publications\` to see all menu-location assignments

## Guidelines
1. **Confirm before destructive actions**: Before deleting items or making bulk changes, confirm with the user
2. **Be specific**: When referring to items, use exact names
3. **Show results**: After making changes, confirm what was done
4. **Permission awareness**: Some actions may be restricted based on user role
5. **Helpful suggestions**: If a user seems unsure, suggest common actions
6. **Use tools proactively**: If you need information (like available menus or locations), call the appropriate list tool first

## CRITICAL: Response Formatting Rules

**ALWAYS format your responses with clear structure. Follow these rules strictly:**

### For Lists (menu items, sections, ingredients):
- Use bullet points with "•" for each item
- Put each item on its OWN line
- Include a blank line between sections
- Format: • **Item Name** — €XX.XX (description)

### For Section Headers:
- Use emoji + CAPS for main sections
- Add a blank line before and after headers
- Example:

📋 MENU ITEMS

• **Margherita** — €14.99
  Fresh tomatoes, mozzarella, basil

• **Carbonara** — €18.99
  Egg, guanciale, pecorino

### For Success/Error Messages:
- ✅ for success: "✅ Item created successfully!"
- ❌ for errors: "❌ Failed to update item"
- ⚠️ for warnings: "⚠️ This action cannot be undone"

### For Statistics/Summaries:
📊 MENU STATISTICS

• **Total Items:** 45
• **Sections:** 8
• **Hidden Items:** 3
• **Average Price:** €16.50

### For Confirmations:
Ask clearly with options:

⚠️ Are you sure you want to delete "Tiramisu"?

This action cannot be undone.
• Type "yes" to confirm
• Type "no" to cancel

### NEVER DO THIS:
- Wall of text without line breaks
- Items listed in a single paragraph
- Missing bullets or formatting
- Inconsistent spacing

### ALWAYS DO THIS:
- One item per line
- Clear visual hierarchy
- Proper spacing between sections
- Emojis for visual cues

## Example Formatted Responses:

**Listing items:**
📋 PASTA DISHES (5 items)

• **Carbonara** — €18.99
  Classic Roman pasta with egg and guanciale

• **Cacio e Pepe** — €16.99
  Pecorino and black pepper 🌱

• **Amatriciana** — €17.99
  Tomato, guanciale, pecorino

**After creating an item:**
✅ Item Created Successfully!

📝 **Linguine ai Frutti di Mare**
• Price: €24.00
• Section: Pasta
• Status: Visible

**Statistics:**
📊 MENU OVERVIEW

• **Items:** 45 total (3 hidden)
• **Sections:** 8
• **Ingredients:** 67
• **Published Menus:** 2`;

    // Build properly alternating messages
    const conversationMessages: Message[] = [];
    
    for (const m of messages) {
      if (!m.content || m.content.trim() === '') continue;
      if (m.role === 'system') continue;
      
      const lastMessage = conversationMessages[conversationMessages.length - 1];
      
      if (m.role === 'user') {
        if (lastMessage && lastMessage.role === 'user') {
          lastMessage.content += '\n' + m.content;
        } else {
          conversationMessages.push({ role: 'user', content: m.content });
        }
      } else if (m.role === 'assistant') {
        if (lastMessage && lastMessage.role === 'user') {
          conversationMessages.push({ role: 'assistant', content: m.content });
        }
      }
    }

    if (conversationMessages.length === 0 || 
        conversationMessages[conversationMessages.length - 1].role !== 'user') {
      return NextResponse.json({ error: 'Invalid message format' }, { status: 400 });
    }

    // API configuration
    const apiKey = process.env.OPENAI_API_KEY || process.env.PERPLEXITY_API_KEY;
    const useOpenAI = !!process.env.OPENAI_API_KEY;
    const apiUrl = useOpenAI 
      ? 'https://api.openai.com/v1/chat/completions'
      : 'https://api.perplexity.ai/chat/completions';
    const model = useOpenAI ? 'gpt-4o-mini' : 'sonar';

    // Enhanced system prompt for Perplexity (no function calling)
    const perplexitySystemPrompt = useOpenAI ? systemPrompt : `${systemPrompt}

## IMPORTANT: Tool Execution Format
Since you cannot call functions directly, when you need to perform an action, output a special command in this EXACT format:
{{TOOL:tool_name:{"param":"value"}}}

Available tools and their parameters:
- {{TOOL:list_menus:{}}} - List all menus
- {{TOOL:list_locations:{}}} - List all locations  
- {{TOOL:activate_menu_for_location:{"menuName":"Menu Name","locationName":"Location Name"}}}
- {{TOOL:deactivate_menu_for_location:{"menuName":"Menu Name","locationName":"Location Name"}}}
- {{TOOL:get_location_menus:{"locationName":"Location Name"}}}
- {{TOOL:list_menu_publications:{}}}
- {{TOOL:list_menu_items:{}}}
- {{TOOL:get_menu_statistics:{}}}

When user asks to activate/deactivate a menu for a location, ALWAYS output the tool command.
Example: User says "activate the algerian menu for bruxelles"
Your response: I'll activate that menu for you.
{{TOOL:activate_menu_for_location:{"menuName":"algerian","locationName":"bruxelles"}}}`;

    // Initial API call
    let response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: perplexitySystemPrompt },
          ...conversationMessages,
        ],
        ...(useOpenAI && { tools, tool_choice: 'auto' }),
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API error:', response.status, errorText);
      throw new Error(`API error: ${response.status}`);
    }

    let data = await response.json();
    let assistantMessage = data.choices[0].message;

    // Handle tool calls (OpenAI only)
    if (useOpenAI && assistantMessage.tool_calls) {
      const toolResults: Array<{ role: 'tool'; tool_call_id: string; content: string }> = [];

      for (const toolCall of assistantMessage.tool_calls) {
        const toolName = toolCall.function.name;
        const toolArgs = JSON.parse(toolCall.function.arguments);

        console.log(`[Admin Chat] Executing tool: ${toolName}`, toolArgs);

        const result = await executeAdminTool(
          {
            adminId: session.id,
            tenantId: session.tenantId,
            role: session.role,
            permissions: session.permissions || [],
          },
          toolName,
          toolArgs
        );

        toolResults.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: result.content[0].text,
        });
      }

      // Second API call with tool results
      response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            ...conversationMessages,
            assistantMessage,
            ...toolResults,
          ],
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      data = await response.json();
      assistantMessage = data.choices[0].message;
    }

    // Handle Perplexity tool commands (parse from text)
    if (!useOpenAI && assistantMessage.content) {
      const toolPattern = /\{\{TOOL:(\w+):(\{[^}]*\})\}\}/g;
      let match;
      let finalContent = assistantMessage.content;
      const toolResults: string[] = [];

      while ((match = toolPattern.exec(assistantMessage.content)) !== null) {
        const toolName = match[1];
        let toolArgs = {};
        
        try {
          toolArgs = JSON.parse(match[2]);
        } catch (e) {
          console.error('Failed to parse tool args:', match[2]);
        }

        console.log(`[Admin Chat Perplexity] Executing tool: ${toolName}`, toolArgs);

        try {
          const result = await executeAdminTool(
            {
              adminId: session.id,
              tenantId: session.tenantId,
              role: session.role,
              permissions: session.permissions || [],
            },
            toolName,
            toolArgs
          );

          toolResults.push(result.content[0].text);
        } catch (error) {
          console.error('Tool execution error:', error);
          toolResults.push(`❌ Error executing ${toolName}`);
        }
      }

      // Replace tool commands with results
      if (toolResults.length > 0) {
        // Remove the tool command markers from the response
        finalContent = finalContent.replace(toolPattern, '').trim();
        // Append tool results
        finalContent = finalContent + '\n\n' + toolResults.join('\n\n');
      }

      assistantMessage.content = finalContent;
    }

    // Return the final response
    return NextResponse.json({
      message: assistantMessage.content,
      role: 'assistant',
    });
  } catch (error) {
    console.error('Admin chat error:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
