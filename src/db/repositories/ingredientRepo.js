/**
 * Ingredient Repository
 */

import db from '../index.js';
import { BaseRepository } from './baseRepo.js';

class IngredientRepository extends BaseRepository {
  constructor() {
    super('ingredients');
  }

  /**
   * Find all ingredients for a tenant
   */
  async findAll(tenantId, options = {}) {
    const { includeDeleted = false, search = null, allergensOnly = false } = options;
    
    let query = 'SELECT * FROM ingredients WHERE tenant_id = $1';
    const params = [tenantId];
    let paramIndex = 2;
    
    if (!includeDeleted) {
      query += ' AND deleted_at IS NULL';
    }
    
    if (allergensOnly) {
      query += ' AND is_allergen = true';
    }
    
    if (search) {
      query += ` AND LOWER(name) LIKE $${paramIndex}`;
      params.push(`%${search.toLowerCase()}%`);
      paramIndex++;
    }
    
    query += ' ORDER BY name ASC';
    
    const result = await db.query(query, params);
    return result.rows;
  }

  /**
   * Create ingredient
   */
  async create(tenantId, data) {
    const { name, allergen_info = null, is_allergen = false } = data;
    
    const result = await db.query(
      `INSERT INTO ingredients (tenant_id, name, allergen_info, is_allergen)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [tenantId, name, allergen_info, is_allergen]
    );
    
    return result.rows[0];
  }

  /**
   * Update ingredient
   */
  async update(id, tenantId, data) {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    const allowedFields = ['name', 'allergen_info', 'is_allergen'];
    
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
      `UPDATE ingredients SET ${fields.join(', ')} 
       WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1} AND deleted_at IS NULL 
       RETURNING *`,
      values
    );
    
    return result.rows[0] || null;
  }

  /**
   * Find by name
   */
  async findByName(tenantId, name) {
    const result = await db.query(
      'SELECT * FROM ingredients WHERE tenant_id = $1 AND LOWER(name) = LOWER($2) AND deleted_at IS NULL',
      [tenantId, name]
    );
    return result.rows[0] || null;
  }

  /**
   * Find or create by name
   */
  async findOrCreate(tenantId, name, data = {}) {
    let ingredient = await this.findByName(tenantId, name);
    
    if (!ingredient) {
      ingredient = await this.create(tenantId, { name, ...data });
    }
    
    return ingredient;
  }

  /**
   * Get dishes using this ingredient
   */
  async getDishes(id, tenantId) {
    const result = await db.query(
      `SELECT d.*, c.name as category_name
       FROM dishes d
       JOIN dish_ingredients di ON d.id = di.dish_id
       JOIN categories c ON d.category_id = c.id
       WHERE di.ingredient_id = $1 AND d.tenant_id = $2 AND d.deleted_at IS NULL
       ORDER BY d.name ASC`,
      [id, tenantId]
    );
    return result.rows;
  }

  /**
   * Bulk create ingredients
   */
  async bulkCreate(tenantId, ingredients) {
    const created = [];
    
    for (const ing of ingredients) {
      const ingredient = await this.findOrCreate(tenantId, ing.name, {
        allergen_info: ing.allergen_info,
        is_allergen: ing.is_allergen
      });
      created.push(ingredient);
    }
    
    return created;
  }
}

export default new IngredientRepository();
