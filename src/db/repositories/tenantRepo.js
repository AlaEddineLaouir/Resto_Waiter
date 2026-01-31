/**
 * Tenant Repository
 */

import db from '../index.js';

class TenantRepository {
  /**
   * Find all tenants
   */
  async findAll(options = {}) {
    const { includeDeleted = false } = options;
    let query = 'SELECT * FROM tenants';
    
    if (!includeDeleted) {
      query += ' WHERE deleted_at IS NULL';
    }
    
    query += ' ORDER BY created_at DESC';
    
    const result = await db.query(query);
    return result.rows;
  }

  /**
   * Find tenant by ID
   */
  async findById(id) {
    const result = await db.query(
      'SELECT * FROM tenants WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );
    return result.rows[0] || null;
  }

  /**
   * Find tenant by slug
   */
  async findBySlug(slug) {
    const result = await db.query(
      'SELECT * FROM tenants WHERE slug = $1 AND deleted_at IS NULL',
      [slug]
    );
    return result.rows[0] || null;
  }

  /**
   * Create new tenant
   */
  async create(data) {
    const { name, slug, config = {}, branding = {}, api_key_encrypted } = data;
    
    const result = await db.query(
      `INSERT INTO tenants (name, slug, config, branding, api_key_encrypted)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, slug, JSON.stringify(config), JSON.stringify(branding), api_key_encrypted]
    );
    
    return result.rows[0];
  }

  /**
   * Update tenant
   */
  async update(id, data) {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    const allowedFields = ['name', 'slug', 'config', 'branding', 'api_key_encrypted', 'is_active'];
    
    for (const [key, value] of Object.entries(data)) {
      if (allowedFields.includes(key)) {
        fields.push(`${key} = $${paramIndex}`);
        values.push(key === 'config' || key === 'branding' ? JSON.stringify(value) : value);
        paramIndex++;
      }
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    
    const result = await db.query(
      `UPDATE tenants SET ${fields.join(', ')} WHERE id = $${paramIndex} AND deleted_at IS NULL RETURNING *`,
      values
    );
    
    return result.rows[0] || null;
  }

  /**
   * Soft delete tenant
   */
  async softDelete(id) {
    const result = await db.query(
      'UPDATE tenants SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND deleted_at IS NULL RETURNING *',
      [id]
    );
    return result.rows[0] || null;
  }

  /**
   * Get or create default tenant
   */
  async getOrCreateDefault() {
    let tenant = await this.findBySlug('default');
    
    if (!tenant) {
      tenant = await this.create({
        name: 'Default Restaurant',
        slug: 'default',
        config: { model: 'llama-3.1-sonar-small-128k-online' },
        branding: { primaryColor: '#4a90a4', secondaryColor: '#2c3e50' }
      });
    }
    
    return tenant;
  }
}

export default new TenantRepository();
