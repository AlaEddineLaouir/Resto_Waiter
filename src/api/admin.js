/**
 * Admin API Routes
 * RESTful endpoints for menu, categories, ingredients, and settings management
 */

import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Import repositories
import tenantRepo from '../db/repositories/tenantRepo.js';
import categoryRepo from '../db/repositories/categoryRepo.js';
import dishRepo from '../db/repositories/dishRepo.js';
import ingredientRepo from '../db/repositories/ingredientRepo.js';
import adminUserRepo from '../db/repositories/adminUserRepo.js';
import auditLogRepo from '../db/repositories/auditLogRepo.js';

// Import auth middleware
import { generateToken, authenticateJWT } from '../middleware/auth.js';

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../public/uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed'));
  }
});

// Helper to get tenant ID from request
const getTenantId = (req) => {
  return req.tenant?.id || req.body?.tenant_id || req.query?.tenant_id;
};

// ============================================
// Authentication Routes
// ============================================

/**
 * POST /api/admin/login
 * Authenticate admin user
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password, tenant_slug = 'default' } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    // Get tenant
    const tenant = await tenantRepo.findBySlug(tenant_slug);
    if (!tenant) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Authenticate
    const user = await adminUserRepo.authenticate(tenant.id, email, password);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Generate token
    const token = generateToken({
      id: user.id,
      tenant_id: tenant.id,
      email: user.email,
      role: user.role
    });
    
    // Log action
    await auditLogRepo.create({
      tenant_id: tenant.id,
      user_id: user.id,
      action: 'LOGIN',
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    });
    
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      },
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

/**
 * POST /api/admin/logout
 */
router.post('/logout', authenticateJWT, async (req, res) => {
  try {
    await auditLogRepo.log(req, 'LOGOUT', null, null);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Logout failed' });
  }
});

/**
 * GET /api/admin/me
 * Get current user info
 */
router.get('/me', authenticateJWT, async (req, res) => {
  try {
    const user = await adminUserRepo.findById(req.user.id, req.user.tenant_id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const { password_hash, ...safeUser } = user;
    res.json(safeUser);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get user info' });
  }
});

// ============================================
// Dashboard Routes
// ============================================

/**
 * GET /api/admin/dashboard
 * Get dashboard statistics
 */
router.get('/dashboard', authenticateJWT, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    
    const [categories, dishes, ingredients, recentActivity] = await Promise.all([
      categoryRepo.count(tenantId),
      dishRepo.count(tenantId),
      ingredientRepo.count(tenantId),
      auditLogRepo.getRecentActivity(tenantId, 10)
    ]);
    
    res.json({
      stats: {
        categories,
        dishes,
        ingredients
      },
      recentActivity
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
});

// ============================================
// Category Routes
// ============================================

/**
 * GET /api/admin/categories
 */
router.get('/categories', authenticateJWT, async (req, res) => {
  try {
    const categories = await categoryRepo.findAll(req.user.tenant_id, {
      includeDishes: req.query.include_dishes === 'true'
    });
    res.json(categories);
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Failed to load categories' });
  }
});

/**
 * GET /api/admin/categories/:id
 */
router.get('/categories/:id', authenticateJWT, async (req, res) => {
  try {
    const category = await categoryRepo.findById(req.params.id, req.user.tenant_id);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    res.json(category);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load category' });
  }
});

/**
 * POST /api/admin/categories
 */
router.post('/categories', authenticateJWT, async (req, res) => {
  try {
    const { name, description, display_order } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }
    
    const category = await categoryRepo.create(req.user.tenant_id, {
      name,
      description,
      display_order
    });
    
    await auditLogRepo.log(req, 'CREATE', 'category', category.id, null, category);
    
    res.status(201).json(category);
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

/**
 * PUT /api/admin/categories/:id
 */
router.put('/categories/:id', authenticateJWT, async (req, res) => {
  try {
    const oldCategory = await categoryRepo.findById(req.params.id, req.user.tenant_id);
    if (!oldCategory) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    const category = await categoryRepo.update(req.params.id, req.user.tenant_id, req.body);
    
    await auditLogRepo.log(req, 'UPDATE', 'category', category.id, oldCategory, category);
    
    res.json(category);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update category' });
  }
});

/**
 * DELETE /api/admin/categories/:id
 */
router.delete('/categories/:id', authenticateJWT, async (req, res) => {
  try {
    const category = await categoryRepo.softDelete(req.params.id, req.user.tenant_id);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    await auditLogRepo.log(req, 'DELETE', 'category', category.id, category, null);
    
    res.json({ success: true, message: 'Category deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

/**
 * PUT /api/admin/categories/reorder
 */
router.put('/categories/reorder', authenticateJWT, async (req, res) => {
  try {
    const { order } = req.body;
    
    if (!Array.isArray(order)) {
      return res.status(400).json({ error: 'Order must be an array of category IDs' });
    }
    
    const categories = await categoryRepo.reorder(req.user.tenant_id, order);
    
    await auditLogRepo.log(req, 'REORDER', 'categories', null, null, { order });
    
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: 'Failed to reorder categories' });
  }
});

// ============================================
// Dish Routes
// ============================================

/**
 * GET /api/admin/dishes
 */
router.get('/dishes', authenticateJWT, async (req, res) => {
  try {
    const dishes = await dishRepo.findAll(req.user.tenant_id, {
      categoryId: req.query.category_id,
      includeIngredients: req.query.include_ingredients === 'true',
      vegetarianOnly: req.query.vegetarian === 'true',
      availableOnly: req.query.available !== 'false',
      search: req.query.search
    });
    res.json(dishes);
  } catch (error) {
    console.error('Get dishes error:', error);
    res.status(500).json({ error: 'Failed to load dishes' });
  }
});

/**
 * GET /api/admin/dishes/:id
 */
router.get('/dishes/:id', authenticateJWT, async (req, res) => {
  try {
    const dish = await dishRepo.findById(req.params.id, req.user.tenant_id);
    if (!dish) {
      return res.status(404).json({ error: 'Dish not found' });
    }
    res.json(dish);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load dish' });
  }
});

/**
 * POST /api/admin/dishes
 */
router.post('/dishes', authenticateJWT, upload.single('image'), async (req, res) => {
  try {
    const { category_id, name, description, price, is_vegetarian, is_available, allergens } = req.body;
    
    if (!category_id || !name || !price) {
      return res.status(400).json({ error: 'Category, name, and price are required' });
    }
    
    const dish = await dishRepo.create(req.user.tenant_id, {
      category_id,
      name,
      description,
      price: parseFloat(price),
      image_url: req.file ? `/uploads/${req.file.filename}` : null,
      is_vegetarian: is_vegetarian === 'true' || is_vegetarian === true,
      is_available: is_available !== 'false' && is_available !== false,
      allergens: allergens ? (Array.isArray(allergens) ? allergens : JSON.parse(allergens)) : []
    });
    
    await auditLogRepo.log(req, 'CREATE', 'dish', dish.id, null, dish);
    
    res.status(201).json(dish);
  } catch (error) {
    console.error('Create dish error:', error);
    res.status(500).json({ error: 'Failed to create dish' });
  }
});

/**
 * PUT /api/admin/dishes/:id
 */
router.put('/dishes/:id', authenticateJWT, upload.single('image'), async (req, res) => {
  try {
    const oldDish = await dishRepo.findById(req.params.id, req.user.tenant_id);
    if (!oldDish) {
      return res.status(404).json({ error: 'Dish not found' });
    }
    
    const updateData = { ...req.body };
    
    // Handle price
    if (updateData.price) {
      updateData.price = parseFloat(updateData.price);
    }
    
    // Handle boolean fields
    if (typeof updateData.is_vegetarian === 'string') {
      updateData.is_vegetarian = updateData.is_vegetarian === 'true';
    }
    if (typeof updateData.is_available === 'string') {
      updateData.is_available = updateData.is_available === 'true';
    }
    
    // Handle allergens
    if (updateData.allergens && typeof updateData.allergens === 'string') {
      updateData.allergens = JSON.parse(updateData.allergens);
    }
    
    // Handle image
    if (req.file) {
      updateData.image_url = `/uploads/${req.file.filename}`;
    }
    
    const dish = await dishRepo.update(req.params.id, req.user.tenant_id, updateData);
    
    await auditLogRepo.log(req, 'UPDATE', 'dish', dish.id, oldDish, dish);
    
    res.json(dish);
  } catch (error) {
    console.error('Update dish error:', error);
    res.status(500).json({ error: 'Failed to update dish' });
  }
});

/**
 * DELETE /api/admin/dishes/:id
 */
router.delete('/dishes/:id', authenticateJWT, async (req, res) => {
  try {
    const dish = await dishRepo.softDelete(req.params.id, req.user.tenant_id);
    if (!dish) {
      return res.status(404).json({ error: 'Dish not found' });
    }
    
    await auditLogRepo.log(req, 'DELETE', 'dish', dish.id, dish, null);
    
    res.json({ success: true, message: 'Dish deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete dish' });
  }
});

/**
 * PATCH /api/admin/dishes/:id/toggle-availability
 */
router.patch('/dishes/:id/toggle-availability', authenticateJWT, async (req, res) => {
  try {
    const dish = await dishRepo.toggleAvailability(req.params.id, req.user.tenant_id);
    if (!dish) {
      return res.status(404).json({ error: 'Dish not found' });
    }
    
    await auditLogRepo.log(req, 'TOGGLE_AVAILABILITY', 'dish', dish.id, null, { is_available: dish.is_available });
    
    res.json(dish);
  } catch (error) {
    res.status(500).json({ error: 'Failed to toggle availability' });
  }
});

/**
 * POST /api/admin/dishes/:id/ingredients
 */
router.post('/dishes/:id/ingredients', authenticateJWT, async (req, res) => {
  try {
    const { ingredients } = req.body;
    
    if (!Array.isArray(ingredients)) {
      return res.status(400).json({ error: 'Ingredients must be an array' });
    }
    
    const updatedIngredients = await dishRepo.setIngredients(req.params.id, ingredients);
    
    await auditLogRepo.log(req, 'SET_INGREDIENTS', 'dish', req.params.id, null, { ingredients });
    
    res.json(updatedIngredients);
  } catch (error) {
    res.status(500).json({ error: 'Failed to set ingredients' });
  }
});

// ============================================
// Ingredient Routes
// ============================================

/**
 * GET /api/admin/ingredients
 */
router.get('/ingredients', authenticateJWT, async (req, res) => {
  try {
    const ingredients = await ingredientRepo.findAll(req.user.tenant_id, {
      search: req.query.search,
      allergensOnly: req.query.allergens === 'true'
    });
    res.json(ingredients);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load ingredients' });
  }
});

/**
 * GET /api/admin/ingredients/:id
 */
router.get('/ingredients/:id', authenticateJWT, async (req, res) => {
  try {
    const ingredient = await ingredientRepo.findById(req.params.id, req.user.tenant_id);
    if (!ingredient) {
      return res.status(404).json({ error: 'Ingredient not found' });
    }
    
    // Include dishes using this ingredient
    ingredient.dishes = await ingredientRepo.getDishes(req.params.id, req.user.tenant_id);
    
    res.json(ingredient);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load ingredient' });
  }
});

/**
 * POST /api/admin/ingredients
 */
router.post('/ingredients', authenticateJWT, async (req, res) => {
  try {
    const { name, allergen_info, is_allergen } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }
    
    const ingredient = await ingredientRepo.create(req.user.tenant_id, {
      name,
      allergen_info,
      is_allergen: is_allergen === true || is_allergen === 'true'
    });
    
    await auditLogRepo.log(req, 'CREATE', 'ingredient', ingredient.id, null, ingredient);
    
    res.status(201).json(ingredient);
  } catch (error) {
    console.error('Create ingredient error:', error);
    res.status(500).json({ error: 'Failed to create ingredient' });
  }
});

/**
 * PUT /api/admin/ingredients/:id
 */
router.put('/ingredients/:id', authenticateJWT, async (req, res) => {
  try {
    const oldIngredient = await ingredientRepo.findById(req.params.id, req.user.tenant_id);
    if (!oldIngredient) {
      return res.status(404).json({ error: 'Ingredient not found' });
    }
    
    const updateData = { ...req.body };
    if (typeof updateData.is_allergen === 'string') {
      updateData.is_allergen = updateData.is_allergen === 'true';
    }
    
    const ingredient = await ingredientRepo.update(req.params.id, req.user.tenant_id, updateData);
    
    await auditLogRepo.log(req, 'UPDATE', 'ingredient', ingredient.id, oldIngredient, ingredient);
    
    res.json(ingredient);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update ingredient' });
  }
});

/**
 * DELETE /api/admin/ingredients/:id
 */
router.delete('/ingredients/:id', authenticateJWT, async (req, res) => {
  try {
    const ingredient = await ingredientRepo.softDelete(req.params.id, req.user.tenant_id);
    if (!ingredient) {
      return res.status(404).json({ error: 'Ingredient not found' });
    }
    
    await auditLogRepo.log(req, 'DELETE', 'ingredient', ingredient.id, ingredient, null);
    
    res.json({ success: true, message: 'Ingredient deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete ingredient' });
  }
});

// ============================================
// Settings Routes
// ============================================

/**
 * GET /api/admin/settings
 */
router.get('/settings', authenticateJWT, async (req, res) => {
  try {
    const tenant = await tenantRepo.findById(req.user.tenant_id);
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }
    
    // Don't expose encrypted API key
    const { api_key_encrypted, ...settings } = tenant;
    settings.has_api_key = !!api_key_encrypted;
    
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load settings' });
  }
});

/**
 * PUT /api/admin/settings
 */
router.put('/settings', authenticateJWT, async (req, res) => {
  try {
    const { name, branding, config, api_key } = req.body;
    
    const updateData = {};
    if (name) updateData.name = name;
    if (branding) updateData.branding = branding;
    if (config) updateData.config = config;
    
    // Handle API key separately (encrypt it)
    if (api_key) {
      // Import encryption utility
      const { encrypt } = await import('../utils/encryption.js');
      updateData.api_key_encrypted = encrypt(api_key);
    }
    
    const tenant = await tenantRepo.update(req.user.tenant_id, updateData);
    
    await auditLogRepo.log(req, 'UPDATE', 'settings', req.user.tenant_id, null, { ...updateData, api_key: api_key ? '***' : undefined });
    
    // Don't expose encrypted API key
    const { api_key_encrypted, ...settings } = tenant;
    settings.has_api_key = !!api_key_encrypted;
    
    res.json(settings);
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

/**
 * POST /api/admin/export
 * Export menu data as JSON
 */
router.post('/export', authenticateJWT, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    
    const [tenant, categories, ingredients] = await Promise.all([
      tenantRepo.findById(tenantId),
      categoryRepo.findAll(tenantId, { includeDishes: true }),
      ingredientRepo.findAll(tenantId)
    ]);
    
    // Get ingredients for each dish
    for (const category of categories) {
      for (const dish of category.dishes || []) {
        dish.ingredients = await dishRepo.getIngredients(dish.id);
      }
    }
    
    const exportData = {
      restaurant: {
        name: tenant.name,
        branding: tenant.branding
      },
      categories,
      ingredients,
      exported_at: new Date().toISOString()
    };
    
    await auditLogRepo.log(req, 'EXPORT', 'menu', null);
    
    res.json(exportData);
  } catch (error) {
    res.status(500).json({ error: 'Failed to export data' });
  }
});

export default router;
