/**
 * Admin User Repository
 */

import crypto from 'crypto';
import db from '../index.js';
import { BaseRepository } from './baseRepo.js';

class AdminUserRepository extends BaseRepository {
  constructor() {
    super('admin_users');
  }

  /**
   * Hash password using scrypt
   */
  async hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${hash}`;
  }

  /**
   * Verify password
   */
  async verifyPassword(password, storedHash) {
    const [salt, hash] = storedHash.split(':');
    const hashBuffer = Buffer.from(hash, 'hex');
    const derivedKey = crypto.scryptSync(password, salt, 64);
    return crypto.timingSafeEqual(hashBuffer, derivedKey);
  }

  /**
   * Find by email
   */
  async findByEmail(tenantId, email) {
    const result = await db.query(
      'SELECT * FROM admin_users WHERE tenant_id = $1 AND LOWER(email) = LOWER($2) AND deleted_at IS NULL',
      [tenantId, email]
    );
    return result.rows[0] || null;
  }

  /**
   * Find by username
   */
  async findByUsername(tenantId, username) {
    const result = await db.query(
      'SELECT * FROM admin_users WHERE tenant_id = $1 AND LOWER(username) = LOWER($2) AND deleted_at IS NULL',
      [tenantId, username]
    );
    return result.rows[0] || null;
  }

  /**
   * Create admin user
   */
  async create(tenantId, data) {
    const { username, email, password, role = 'admin' } = data;
    
    const password_hash = await this.hashPassword(password);
    
    const result = await db.query(
      `INSERT INTO admin_users (tenant_id, username, email, password_hash, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, tenant_id, username, email, role, is_active, created_at`,
      [tenantId, username, email, password_hash, role]
    );
    
    return result.rows[0];
  }

  /**
   * Update admin user
   */
  async update(id, tenantId, data) {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    const allowedFields = ['username', 'email', 'role', 'is_active'];
    
    for (const [key, value] of Object.entries(data)) {
      if (allowedFields.includes(key)) {
        fields.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    // Handle password separately
    if (data.password) {
      fields.push(`password_hash = $${paramIndex}`);
      values.push(await this.hashPassword(data.password));
      paramIndex++;
    }

    if (fields.length === 0) {
      return this.findById(id, tenantId);
    }

    values.push(id, tenantId);
    
    const result = await db.query(
      `UPDATE admin_users SET ${fields.join(', ')} 
       WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1} AND deleted_at IS NULL 
       RETURNING id, tenant_id, username, email, role, is_active, created_at`,
      values
    );
    
    return result.rows[0] || null;
  }

  /**
   * Authenticate user
   */
  async authenticate(tenantId, email, password) {
    const user = await this.findByEmail(tenantId, email);
    
    if (!user || !user.is_active) {
      return null;
    }
    
    const isValid = await this.verifyPassword(password, user.password_hash);
    
    if (!isValid) {
      return null;
    }
    
    // Update last login
    await db.query(
      'UPDATE admin_users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );
    
    // Return user without password hash
    const { password_hash, ...safeUser } = user;
    return safeUser;
  }

  /**
   * Create default admin for tenant
   */
  async createDefaultAdmin(tenantId, password = 'admin123') {
    const existing = await this.findByEmail(tenantId, 'admin@restaurant.local');
    
    if (existing) {
      return existing;
    }
    
    return this.create(tenantId, {
      username: 'admin',
      email: 'admin@restaurant.local',
      password,
      role: 'super_admin'
    });
  }
}

export default new AdminUserRepository();
