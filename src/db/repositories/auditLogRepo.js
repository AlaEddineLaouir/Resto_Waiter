/**
 * Audit Log Repository
 */

import db from '../index.js';

class AuditLogRepository {
  /**
   * Create audit log entry
   */
  async create(data) {
    const { 
      tenant_id = null, 
      user_id = null, 
      action, 
      entity_type = null, 
      entity_id = null,
      old_values = null,
      new_values = null,
      ip_address = null,
      user_agent = null
    } = data;
    
    const result = await db.query(
      `INSERT INTO audit_logs (tenant_id, user_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        tenant_id, 
        user_id, 
        action, 
        entity_type, 
        entity_id, 
        old_values ? JSON.stringify(old_values) : null, 
        new_values ? JSON.stringify(new_values) : null,
        ip_address,
        user_agent
      ]
    );
    
    return result.rows[0];
  }

  /**
   * Find logs for tenant
   */
  async findByTenant(tenantId, options = {}) {
    const { limit = 100, offset = 0, action = null, entity_type = null } = options;
    
    let query = 'SELECT * FROM audit_logs WHERE tenant_id = $1';
    const params = [tenantId];
    let paramIndex = 2;
    
    if (action) {
      query += ` AND action = $${paramIndex}`;
      params.push(action);
      paramIndex++;
    }
    
    if (entity_type) {
      query += ` AND entity_type = $${paramIndex}`;
      params.push(entity_type);
      paramIndex++;
    }
    
    query += ' ORDER BY created_at DESC';
    
    params.push(limit);
    query += ` LIMIT $${paramIndex}`;
    paramIndex++;
    
    params.push(offset);
    query += ` OFFSET $${paramIndex}`;
    
    const result = await db.query(query, params);
    return result.rows;
  }

  /**
   * Get recent activity for dashboard
   */
  async getRecentActivity(tenantId, limit = 10) {
    const result = await db.query(
      `SELECT al.*, au.username
       FROM audit_logs al
       LEFT JOIN admin_users au ON al.user_id = au.id
       WHERE al.tenant_id = $1
       ORDER BY al.created_at DESC
       LIMIT $2`,
      [tenantId, limit]
    );
    return result.rows;
  }

  /**
   * Log action helper
   */
  async log(req, action, entityType, entityId, oldValues = null, newValues = null) {
    return this.create({
      tenant_id: req.tenant?.id,
      user_id: req.user?.id,
      action,
      entity_type: entityType,
      entity_id: entityId,
      old_values: oldValues,
      new_values: newValues,
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    });
  }
}

export default new AuditLogRepository();
