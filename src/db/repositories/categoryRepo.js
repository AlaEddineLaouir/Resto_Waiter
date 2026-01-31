/**
 * Category Repository
 */

import db from '../index.js';
import { BaseRepository } from './baseRepo.js';

class CategoryRepository extends BaseRepository {
  constructor() {
    super('categories');
  }

  /**
   * Find all categories for a tenant, ordered by display_order
   */
  async findAll(tenantId, options = {}) {
    const { includeDeleted = false, includeDishes = false } = options;
    
    let query = `
      SELECT c.* 
      FROM categories c
      WHERE c.tenant_id = $1
    `;
    
    if (!includeDeleted) {
      query += ' AND c.deleted_at IS NULL';
    }
    
    query += ' ORDER BY c.display_order ASC, c.name ASC';
    
    const result = await db.query(query, [tenantId]);
    const categories = result.rows;
    
    if (includeDishes) {
      for (const category of categories) {
        const dishesResult = await db.query(
          `SELECT * FROM dishes 
           WHERE category_id = $1 AND tenant_id = $2 AND deleted_at IS NULL
           ORDER BY display_order ASC, name ASC`,
          [category.id, tenantId]
        );
        category.dishes = dishesResult.rows;
      }
    }
    
    return categories;
  }

  /**
   * Create category
   */
  async create(tenantId, data) {
    const { name, description = '', display_order = 0 } = data;
    
    const result = await db.query(
      `INSERT INTO categories (tenant_id, name, description, display_order)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [tenantId, name, description, display_order]
    );
    
    return result.rows[0];
  }

  /**
   * Update category
   */
  async update(id, tenantId, data) {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    const allowedFields = ['name', 'description', 'display_order', 'is_active'];
    
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
      `UPDATE categories SET ${fields.join(', ')} 
       WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1} AND deleted_at IS NULL 
       RETURNING *`,
      values
    );
    
    return result.rows[0] || null;
  }

  /**
   * Reorder categories
   */
  async reorder(tenantId, orderedIds) {
    return db.transaction(async (client) => {
      for (let i = 0; i < orderedIds.length; i++) {
        await client.query(
          'UPDATE categories SET display_order = $1 WHERE id = $2 AND tenant_id = $3',
          [i, orderedIds[i], tenantId]
        );
      }
      
      const result = await client.query(
        'SELECT * FROM categories WHERE tenant_id = $1 AND deleted_at IS NULL ORDER BY display_order ASC',
        [tenantId]
      );
      return result.rows;
    });
  }

  /**
   * Find by name
   */
  async findByName(tenantId, name) {
    const result = await db.query(
      'SELECT * FROM categories WHERE tenant_id = $1 AND LOWER(name) = LOWER($2) AND deleted_at IS NULL',
      [tenantId, name]
    );
    return result.rows[0] || null;
  }
}

export default new CategoryRepository();
