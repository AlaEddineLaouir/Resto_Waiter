/**
 * Dish Repository
 */

import db from '../index.js';
import { BaseRepository } from './baseRepo.js';

class DishRepository extends BaseRepository {
  constructor() {
    super('dishes');
  }

  /**
   * Find all dishes for a tenant
   */
  async findAll(tenantId, options = {}) {
    const { 
      includeDeleted = false, 
      categoryId = null,
      includeIngredients = false,
      vegetarianOnly = false,
      availableOnly = true,
      search = null
    } = options;
    
    let query = `
      SELECT d.*, c.name as category_name
      FROM dishes d
      LEFT JOIN categories c ON d.category_id = c.id
      WHERE d.tenant_id = $1
    `;
    const params = [tenantId];
    let paramIndex = 2;
    
    if (!includeDeleted) {
      query += ' AND d.deleted_at IS NULL';
    }
    
    if (categoryId) {
      query += ` AND d.category_id = $${paramIndex}`;
      params.push(categoryId);
      paramIndex++;
    }
    
    if (vegetarianOnly) {
      query += ' AND d.is_vegetarian = true';
    }
    
    if (availableOnly) {
      query += ' AND d.is_available = true';
    }
    
    if (search) {
      query += ` AND (LOWER(d.name) LIKE $${paramIndex} OR LOWER(d.description) LIKE $${paramIndex})`;
      params.push(`%${search.toLowerCase()}%`);
      paramIndex++;
    }
    
    query += ' ORDER BY c.display_order ASC, d.display_order ASC, d.name ASC';
    
    const result = await db.query(query, params);
    const dishes = result.rows;
    
    if (includeIngredients) {
      for (const dish of dishes) {
        dish.ingredients = await this.getIngredients(dish.id);
      }
    }
    
    return dishes;
  }

  /**
   * Find dish by ID with full details
   */
  async findById(id, tenantId, options = {}) {
    const { includeIngredients = true } = options;
    
    const result = await db.query(
      `SELECT d.*, c.name as category_name
       FROM dishes d
       LEFT JOIN categories c ON d.category_id = c.id
       WHERE d.id = $1 AND d.tenant_id = $2 AND d.deleted_at IS NULL`,
      [id, tenantId]
    );
    
    const dish = result.rows[0];
    
    if (dish && includeIngredients) {
      dish.ingredients = await this.getIngredients(id);
    }
    
    return dish || null;
  }

  /**
   * Create dish
   */
  async create(tenantId, data) {
    const { 
      category_id, 
      name, 
      description = '', 
      price, 
      image_url = null,
      is_vegetarian = false, 
      is_available = true,
      allergens = [],
      display_order = 0
    } = data;
    
    const result = await db.query(
      `INSERT INTO dishes (tenant_id, category_id, name, description, price, image_url, is_vegetarian, is_available, allergens, display_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [tenantId, category_id, name, description, price, image_url, is_vegetarian, is_available, allergens, display_order]
    );
    
    return result.rows[0];
  }

  /**
   * Update dish
   */
  async update(id, tenantId, data) {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    const allowedFields = ['category_id', 'name', 'description', 'price', 'image_url', 'is_vegetarian', 'is_available', 'allergens', 'display_order'];
    
    for (const [key, value] of Object.entries(data)) {
      if (allowedFields.includes(key)) {
        fields.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    if (fields.length === 0) {
      return this.findById(id, tenantId);
    }

    values.push(id, tenantId);
    
    const result = await db.query(
      `UPDATE dishes SET ${fields.join(', ')} 
       WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1} AND deleted_at IS NULL 
       RETURNING *`,
      values
    );
    
    return result.rows[0] || null;
  }

  /**
   * Get dish ingredients
   */
  async getIngredients(dishId) {
    const result = await db.query(
      `SELECT i.*, di.quantity, di.unit, di.is_optional
       FROM ingredients i
       JOIN dish_ingredients di ON i.id = di.ingredient_id
       WHERE di.dish_id = $1 AND i.deleted_at IS NULL
       ORDER BY i.name ASC`,
      [dishId]
    );
    return result.rows;
  }

  /**
   * Set dish ingredients (replace all)
   */
  async setIngredients(dishId, ingredients) {
    return db.transaction(async (client) => {
      // Remove existing
      await client.query('DELETE FROM dish_ingredients WHERE dish_id = $1', [dishId]);
      
      // Add new
      for (const ing of ingredients) {
        await client.query(
          `INSERT INTO dish_ingredients (dish_id, ingredient_id, quantity, unit, is_optional)
           VALUES ($1, $2, $3, $4, $5)`,
          [dishId, ing.ingredient_id, ing.quantity || null, ing.unit || null, ing.is_optional || false]
        );
      }
      
      return this.getIngredients(dishId);
    });
  }

  /**
   * Add ingredient to dish
   */
  async addIngredient(dishId, ingredientId, data = {}) {
    const { quantity = null, unit = null, is_optional = false } = data;
    
    await db.query(
      `INSERT INTO dish_ingredients (dish_id, ingredient_id, quantity, unit, is_optional)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (dish_id, ingredient_id) DO UPDATE SET quantity = $3, unit = $4, is_optional = $5`,
      [dishId, ingredientId, quantity, unit, is_optional]
    );
    
    return this.getIngredients(dishId);
  }

  /**
   * Remove ingredient from dish
   */
  async removeIngredient(dishId, ingredientId) {
    await db.query(
      'DELETE FROM dish_ingredients WHERE dish_id = $1 AND ingredient_id = $2',
      [dishId, ingredientId]
    );
    return this.getIngredients(dishId);
  }

  /**
   * Search dishes by name or ingredient
   */
  async search(tenantId, query) {
    const searchTerm = `%${query.toLowerCase()}%`;
    
    const result = await db.query(
      `SELECT DISTINCT d.*, c.name as category_name
       FROM dishes d
       LEFT JOIN categories c ON d.category_id = c.id
       LEFT JOIN dish_ingredients di ON d.id = di.dish_id
       LEFT JOIN ingredients i ON di.ingredient_id = i.id
       WHERE d.tenant_id = $1 
         AND d.deleted_at IS NULL
         AND d.is_available = true
         AND (LOWER(d.name) LIKE $2 OR LOWER(d.description) LIKE $2 OR LOWER(i.name) LIKE $2)
       ORDER BY d.name ASC`,
      [tenantId, searchTerm]
    );
    
    return result.rows;
  }

  /**
   * Toggle availability
   */
  async toggleAvailability(id, tenantId) {
    const result = await db.query(
      `UPDATE dishes SET is_available = NOT is_available 
       WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL 
       RETURNING *`,
      [id, tenantId]
    );
    return result.rows[0] || null;
  }
}

export default new DishRepository();
