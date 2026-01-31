import express from 'express';
import cors from 'cors';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mcpClient } from '../mcp-client/client.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// Serve static files from public directory
const publicPath = join(__dirname, '../../public');
app.use(express.static(publicPath));

// Config file path
const configPath = join(__dirname, '../../data/config.json');

// ============ PERFORMANCE OPTIMIZATION: Cache menu and system prompt ============
let cachedMenu = null;
let cachedSystemPrompt = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

async function getCachedMenu() {
  const now = Date.now();
  if (!cachedMenu || now - cacheTimestamp > CACHE_TTL) {
    cachedMenu = await mcpClient.callTool('get_menu');
    cacheTimestamp = now;
    cachedSystemPrompt = null; // Invalidate prompt cache when menu updates
  }
  return cachedMenu;
}

function getCachedSystemPrompt(menu) {
  if (!cachedSystemPrompt) {
    const toolDescriptions = mcpClient.getToolDescriptions();
    cachedSystemPrompt = `You are a restaurant assistant for "${menu.restaurant.name}" - ${menu.restaurant.description}.

IMPORTANT RESTRICTION: You can ONLY answer questions related to our restaurant menu.

You have access to these tools and can use MULTIPLE tools to answer complex questions:
${toolDescriptions}

MULTI-TOOL CAPABILITY:
When a user asks a complex question, combine information from multiple tools. For example:
- "What vegetarian pasta dishes do you have and what's in them?" → Use menu data to find vegetarian pasta, then provide ingredients
- "Compare the Carbonara and Alfredo" → Get details for both dishes and compare them
- "What can I eat if I'm allergic to dairy?" → Search all dishes and filter by allergens
- "What's your cheapest main course and what's in it?" → Find dishes by category, compare prices, show ingredients

Here is the current menu with ALL dish information (name, description, price, ingredients, allergens, vegetarian status):
${JSON.stringify(menu, null, 2)}

You can help with:
- Questions about our menu and dishes (single or multiple dishes)
- Comparing dishes (price, ingredients, dietary info)
- Ingredient information and allergens for any dish
- Dietary restrictions (vegetarian, gluten-free, dairy-free, etc.)
- Dish recommendations based on preferences or restrictions
- Prices and descriptions
- Searching and filtering dishes by any criteria
- Complex queries combining multiple aspects (e.g., "cheap vegetarian appetizers without nuts")

When answering:
1. Be comprehensive - if the question involves multiple dishes or aspects, address all of them
2. Format your response clearly with sections if answering about multiple items
3. Include relevant details like prices, key ingredients, and dietary info
4. Be helpful and suggest related items when appropriate

If the user asks ANY question that is NOT related to our restaurant menu, dishes, ingredients, prices, or food recommendations, you MUST respond with:

"I'm sorry, I can only help with questions about our restaurant menu. Here are some things you can ask me:

🍽️ **Menu Questions:**
- What's on the menu?
- What appetizers do you have?
- Compare the pasta dishes

🥗 **Dietary & Ingredients:**
- What vegetarian options do you have and what's in them?
- Which dishes are gluten-free?
- What can I eat if I'm allergic to dairy?

💰 **Prices & Comparisons:**
- What's your cheapest pizza?
- Compare the Carbonara and Alfredo
- What main courses are under $25?

🔍 **Complex Searches:**
- What vegetarian pasta dishes contain cheese?
- Show me appetizers without seafood
- What desserts are nut-free?"

Do NOT answer questions about weather, news, sports, politics, general knowledge, coding, math, or ANY topic outside of our restaurant menu. Be strict about this rule.

Be friendly and thorough when answering menu-related questions.`;
  }
  return cachedSystemPrompt;
}
// ============ END PERFORMANCE OPTIMIZATION ============

// Helper to load config
function loadConfig() {
  try {
    if (existsSync(configPath)) {
      return JSON.parse(readFileSync(configPath, 'utf-8'));
    }
  } catch (error) {
    console.error('Error loading config:', error);
  }
  return { perplexityApiKey: '', model: 'llama-3.1-sonar-small-128k-online' };
}

// Helper to save config
function saveConfig(config) {
  writeFileSync(configPath, JSON.stringify(config, null, 2));
}

// Get current config (without exposing full API key)
app.get('/api/config', (req, res) => {
  const config = loadConfig();
  res.json({
    hasApiKey: !!config.perplexityApiKey,
    apiKeyPreview: config.perplexityApiKey
      ? `${config.perplexityApiKey.substring(0, 8)}...`
      : '',
    model: config.model,
  });
});

// Save config
app.post('/api/config', (req, res) => {
  const { perplexityApiKey, model } = req.body;
  const config = loadConfig();

  if (perplexityApiKey !== undefined) {
    config.perplexityApiKey = perplexityApiKey;
  }
  if (model !== undefined) {
    config.model = model;
  }

  saveConfig(config);
  res.json({ success: true });
});

// Get available tools
app.get('/api/tools', (req, res) => {
  res.json(mcpClient.listTools());
});

// Call a specific tool
app.post('/api/tools/:toolName', async (req, res) => {
  try {
    const { toolName } = req.params;
    const result = await mcpClient.callTool(toolName, req.body);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Chat endpoint - connects to Perplexity AI
app.post('/api/chat', async (req, res) => {
  const { message } = req.body;
  const config = loadConfig();

  if (!config.perplexityApiKey) {
    return res.status(400).json({
      error: 'Perplexity API key not configured. Please go to Settings to add your API key.',
    });
  }

  try {
    // Use cached menu and system prompt for faster response
    const menu = await getCachedMenu();
    const systemPrompt = getCachedSystemPrompt(menu);

    // Call Perplexity AI with optimized settings
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.perplexityApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message },
        ],
        max_tokens: 512, // Reduced for faster responses
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Perplexity API error');
    }

    const data = await response.json();
    const assistantMessage = data.choices[0]?.message?.content || 'Sorry, I could not generate a response.';

    res.json({ message: assistantMessage });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get menu directly (for display) - uses cache for performance
app.get('/api/menu', async (req, res) => {
  try {
    const menu = await getCachedMenu();
    res.json(menu);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Search dishes
app.get('/api/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ error: 'Search query required' });
    }
    const results = await mcpClient.callTool('search_dishes', { query: q });
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default app;
