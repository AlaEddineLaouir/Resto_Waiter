import express from 'express';
import cors from 'cors';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Middleware
import { securityHeaders, httpsRedirect } from '../middleware/security.js';
import { rateLimiter, strictRateLimiter } from '../middleware/rateLimit.js';
import { resolveTenant } from '../middleware/tenant.js';
import { optionalAuth, generateToken, authenticateJWT } from '../middleware/auth.js';
import { validateChatMessage, isValidApiKey } from '../middleware/validation.js';

// Models
import TenantModel from '../models/tenant.js';

// Admin routes
import adminRoutes from './admin.js';

// Config
import config from '../config/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// ============ GLOBAL MIDDLEWARE ============
app.use(httpsRedirect);
app.use(securityHeaders);
app.use(cors({
  origin: config.corsOrigins,
  credentials: true,
}));
app.use(express.json({ limit: '10kb' }));

// ============ HEALTH CHECK (no auth/tenant required) ============
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
});

app.get('/ready', (req, res) => {
  res.json({ status: 'ready' });
});

// ============ TENANT RESOLUTION ============
app.use(resolveTenant);
app.use(rateLimiter);
app.use(optionalAuth);

// Serve static files from public directory
const publicPath = join(__dirname, '../../public');
app.use(express.static(publicPath));

// ============ ADMIN API ROUTES ============
app.use('/api/admin', adminRoutes);

// ============ CACHE FOR PERFORMANCE ============
const menuCache = new Map();
const promptCache = new Map();

async function getCachedMenu(tenantId) {
  const cacheKey = `menu:${tenantId}`;
  const cached = menuCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < config.cacheTTL) {
    return cached.data;
  }
  
  let menu = TenantModel.getTenantMenu(tenantId);
  
  // Fallback to default menu if tenant doesn't have one
  if (!menu) {
    const defaultMenuPath = join(__dirname, '../../data/menu.json');
    if (existsSync(defaultMenuPath)) {
      menu = JSON.parse(readFileSync(defaultMenuPath, 'utf-8'));
    } else {
      menu = TenantModel.getDefaultMenu();
    }
  }
  
  menuCache.set(cacheKey, { data: menu, timestamp: Date.now() });
  return menu;
}

function getCachedSystemPrompt(tenantId, menu) {
  const cacheKey = `prompt:${tenantId}`;
  const cached = promptCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < config.cacheTTL) {
    return cached.data;
  }
  
  const prompt = buildSystemPrompt(menu);
  promptCache.set(cacheKey, { data: prompt, timestamp: Date.now() });
  return prompt;
}

function buildSystemPrompt(menu) {
  return `You are a restaurant assistant for "${menu.restaurant.name}" - ${menu.restaurant.description}.

IMPORTANT RESTRICTION: You can ONLY answer questions related to our restaurant menu.

MULTI-TOOL CAPABILITY - combine information for complex questions:
- "What vegetarian pasta dishes do you have?" → Find vegetarian pasta and show details
- "Compare the Carbonara and Alfredo" → Get details for both and compare
- "What can I eat if I'm allergic to dairy?" → Filter by allergens

Here is the current menu:
${JSON.stringify(menu, null, 2)}

You can help with:
- Menu and dish questions
- Comparing dishes
- Ingredients and allergens
- Dietary restrictions
- Prices and recommendations
- Complex multi-criteria searches

If the user asks anything NOT related to our menu, respond with:
"I'm sorry, I can only help with questions about our restaurant menu. Try asking about our dishes, ingredients, prices, or dietary options!"

Be friendly and thorough with menu-related questions.`;
}

function getAllDishes(menu) {
  const dishes = [];
  for (const category of menu.categories || []) {
    for (const dish of category.dishes || []) {
      dishes.push({ ...dish, category: category.name });
    }
  }
  return dishes;
}

function findDish(menu, query) {
  const dishes = getAllDishes(menu);
  const queryLower = query.toLowerCase();
  return dishes.find(
    (dish) =>
      dish.id === query ||
      dish.name.toLowerCase() === queryLower ||
      dish.name.toLowerCase().includes(queryLower)
  );
}

function searchDishes(menu, query) {
  const dishes = getAllDishes(menu);
  const queryLower = query.toLowerCase();
  return dishes.filter(
    (dish) =>
      dish.name.toLowerCase().includes(queryLower) ||
      dish.description.toLowerCase().includes(queryLower) ||
      dish.ingredients.some((ing) => ing.toLowerCase().includes(queryLower))
  );
}

// ============ API ROUTES ============

app.get('/api/config', (req, res) => {
  const tenantConfig = TenantModel.getTenantConfig(req.tenantId);
  res.json({
    hasApiKey: !!tenantConfig.perplexityApiKey,
    apiKeyPreview: tenantConfig.perplexityApiKey
      ? `${tenantConfig.perplexityApiKey.substring(0, 8)}...`
      : '',
    model: tenantConfig.model,
    tenantId: req.tenantId,
  });
});

app.post('/api/config', (req, res) => {
  const { perplexityApiKey, model } = req.body;
  
  if (perplexityApiKey && !isValidApiKey(perplexityApiKey)) {
    return res.status(400).json({ error: 'Invalid API key format. Must start with pplx-' });
  }
  
  const tenantConfig = TenantModel.getTenantConfig(req.tenantId);

  if (perplexityApiKey !== undefined) {
    tenantConfig.perplexityApiKey = perplexityApiKey;
  }
  if (model !== undefined) {
    tenantConfig.model = model;
  }

  TenantModel.saveTenantConfig(req.tenantId, tenantConfig);
  TenantModel.logAudit(req.tenantId, 'config_updated', { model });
  
  promptCache.delete(`prompt:${req.tenantId}`);
  
  res.json({ success: true });
});

app.get('/api/tools', (req, res) => {
  res.json([
    { name: 'get_menu', description: 'Get the full restaurant menu' },
    { name: 'get_dish_details', description: 'Get details about a specific dish', parameters: { dish_name: 'string' } },
    { name: 'get_ingredients', description: 'Get ingredients for a dish', parameters: { dish_name: 'string' } },
    { name: 'search_dishes', description: 'Search dishes by name or ingredient', parameters: { query: 'string' } },
    { name: 'get_vegetarian_dishes', description: 'Get all vegetarian dishes' },
    { name: 'get_dishes_by_category', description: 'Get dishes in a category', parameters: { category: 'string' } },
  ]);
});

app.post('/api/tools/:toolName', async (req, res) => {
  try {
    const { toolName } = req.params;
    const menu = await getCachedMenu(req.tenantId);
    
    let result;
    switch (toolName) {
      case 'get_menu':
        result = menu;
        break;
      case 'get_dish_details':
        result = findDish(menu, req.body.dish_name);
        break;
      case 'get_ingredients':
        const dish = findDish(menu, req.body.dish_name);
        result = dish ? { dish: dish.name, ingredients: dish.ingredients, allergens: dish.allergens } : null;
        break;
      case 'search_dishes':
        result = searchDishes(menu, req.body.query);
        break;
      case 'get_vegetarian_dishes':
        result = getAllDishes(menu).filter(d => d.vegetarian);
        break;
      case 'get_dishes_by_category':
        const cat = menu.categories.find(c => c.name.toLowerCase() === req.body.category.toLowerCase());
        result = cat ? cat.dishes : [];
        break;
      default:
        return res.status(404).json({ error: 'Tool not found' });
    }
    
    res.json(result || { error: 'Not found' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/chat', async (req, res) => {
  const { message } = req.body;
  
  const validation = validateChatMessage(message);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }
  
  const tenantConfig = TenantModel.getTenantConfig(req.tenantId);

  if (!tenantConfig.perplexityApiKey) {
    return res.status(400).json({
      error: 'Perplexity API key not configured. Please go to Settings to add your API key.',
    });
  }

  try {
    const menu = await getCachedMenu(req.tenantId);
    const systemPrompt = getCachedSystemPrompt(req.tenantId, menu);

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tenantConfig.perplexityApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: tenantConfig.model || 'llama-3.1-sonar-small-128k-online',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: validation.sanitized },
        ],
        max_tokens: 512,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Perplexity API error');
    }

    const data = await response.json();
    const assistantMessage = data.choices[0]?.message?.content || 'Sorry, I could not generate a response.';

    TenantModel.logAudit(req.tenantId, 'chat_message', { 
      messageLength: message.length,
      responseLength: assistantMessage.length,
    });

    res.json({ message: assistantMessage });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/menu', async (req, res) => {
  try {
    const menu = await getCachedMenu(req.tenantId);
    res.json(menu);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ error: 'Search query required' });
    }
    const menu = await getCachedMenu(req.tenantId);
    const results = searchDishes(menu, q);
    res.json({ dishes: results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/tenant', (req, res) => {
  const tenant = req.tenant || {
    id: req.tenantId,
    name: 'Default Restaurant',
    branding: {
      primaryColor: '#c41e3a',
      restaurantName: 'La Bella Cucina',
      description: 'Authentic Italian Restaurant',
    },
  };
  res.json(tenant);
});

// ============ ADMIN ROUTES ============

app.post('/api/auth/token', strictRateLimiter, (req, res) => {
  const { tenantId, password } = req.body;
  
  if (password !== 'admin123') {
    TenantModel.logAudit(tenantId || 'unknown', 'auth_failed', { ip: req.ip });
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  const token = generateToken({ 
    tenantId: tenantId || req.tenantId,
    role: 'admin',
  });
  
  TenantModel.logAudit(tenantId || req.tenantId, 'auth_success', { ip: req.ip });
  
  res.json({ token, expiresIn: config.jwtExpiresIn });
});

app.get('/api/admin/tenants', authenticateJWT, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  const tenants = TenantModel.getAllTenants();
  res.json(tenants);
});

app.post('/api/admin/tenants', authenticateJWT, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  try {
    const tenant = TenantModel.createTenant(req.body);
    TenantModel.logAudit(tenant.id, 'tenant_created', { createdBy: req.user.tenantId });
    res.status(201).json(tenant);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put('/api/admin/menu', authenticateJWT, (req, res) => {
  const tenantId = req.body.tenantId || req.tenantId;
  
  try {
    TenantModel.saveTenantMenu(tenantId, req.body.menu);
    menuCache.delete(`menu:${tenantId}`);
    promptCache.delete(`prompt:${tenantId}`);
    TenantModel.logAudit(tenantId, 'menu_updated', { updatedBy: req.user.tenantId });
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default app;
