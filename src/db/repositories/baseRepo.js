/**
 * Base Repository with common CRUD operations
 */

import db from '../index.js';

export class BaseRepository {
  constructor(tableName) {
    this.tableName = tableName;
  }

  /**
   * Find all records with optional filters
   */
  async findAll(tenantId, options = {}) {
    const { includeDeleted = false, orderBy = 'created_at', order = 'DESC', limit, offset } = options;
    
    let query = `SELECT * FROM ${this.tableName} WHERE tenant_id = $1`;
    const params = [tenantId];
    
    if (!includeDeleted) {
      query += ' AND deleted_at IS NULL';
    }
    
    query += ` ORDER BY ${orderBy} ${order}`;
    
    if (limit) {
      params.push(limit);
      query += ` LIMIT $${params.length}`;
    }
    
    if (offset) {
      params.push(offset);
      query += ` OFFSET $${params.length}`;
    }
    
    const result = await db.query(query, params);
    return result.rows;
  }

  /**
   * Find by ID
   */
  async findById(id, tenantId) {
    const result = await db.query(
      `SELECT * FROM ${this.tableName} WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
      [id, tenantId]
    );
    return result.rows[0] || null;
  }

  /**
   * Count records
   */
  async count(tenantId) {
    const result = await db.query(
      `SELECT COUNT(*) as count FROM ${this.tableName} WHERE tenant_id = $1 AND deleted_at IS NULL`,
      [tenantId]
    );
    return parseInt(result.rows[0].count);
  }

  /**
   * Soft delete
   */
  async softDelete(id, tenantId) {
    const result = await db.query(
      `UPDATE ${this.tableName} SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL RETURNING *`,
      [id, tenantId]
    );
    return result.rows[0] || null;
  }

  /**
   * Hard delete (use with caution)
   */
  async hardDelete(id, tenantId) {
    const result = await db.query(
      `DELETE FROM ${this.tableName} WHERE id = $1 AND tenant_id = $2 RETURNING *`,
      [id, tenantId]
    );
    return result.rows[0] || null;
  }

  /**
   * Restore soft-deleted record
   */
  async restore(id, tenantId) {
    const result = await db.query(
      `UPDATE ${this.tableName} SET deleted_at = NULL WHERE id = $1 AND tenant_id = $2 RETURNING *`,
      [id, tenantId]
    );
    return result.rows[0] || null;
  }
}

export default BaseRepository;
