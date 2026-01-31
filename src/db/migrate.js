/**
 * Database Migration Runner
 * Executes SQL migration files in order
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

/**
 * Create migrations tracking table if not exists
 */
async function ensureMigrationsTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

/**
 * Get list of executed migrations
 */
async function getExecutedMigrations() {
  const result = await db.query('SELECT name FROM schema_migrations ORDER BY name');
  return result.rows.map(row => row.name);
}

/**
 * Get list of pending migrations
 */
async function getPendingMigrations() {
  const executed = await getExecutedMigrations();
  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();
  
  return files.filter(f => !executed.includes(f));
}

/**
 * Execute a single migration
 */
async function executeMigration(filename) {
  const filepath = path.join(MIGRATIONS_DIR, filename);
  const sql = fs.readFileSync(filepath, 'utf8');
  
  await db.transaction(async (client) => {
    // Execute migration SQL
    await client.query(sql);
    
    // Record migration
    await client.query(
      'INSERT INTO schema_migrations (name) VALUES ($1)',
      [filename]
    );
  });
  
  console.log(`✅ Migration executed: ${filename}`);
}

/**
 * Run all pending migrations
 */
export async function runMigrations() {
  console.log('🔄 Running database migrations...');
  
  try {
    await ensureMigrationsTable();
    const pending = await getPendingMigrations();
    
    if (pending.length === 0) {
      console.log('✅ No pending migrations');
      return { success: true, executed: [] };
    }
    
    console.log(`📋 Found ${pending.length} pending migration(s)`);
    
    for (const migration of pending) {
      await executeMigration(migration);
    }
    
    console.log('✅ All migrations completed successfully');
    return { success: true, executed: pending };
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  }
}

/**
 * Rollback last migration (for development only)
 */
export async function rollbackLastMigration() {
  const executed = await getExecutedMigrations();
  if (executed.length === 0) {
    console.log('No migrations to rollback');
    return;
  }
  
  const lastMigration = executed[executed.length - 1];
  const rollbackFile = lastMigration.replace('.sql', '_rollback.sql');
  const rollbackPath = path.join(MIGRATIONS_DIR, rollbackFile);
  
  if (!fs.existsSync(rollbackPath)) {
    throw new Error(`Rollback file not found: ${rollbackFile}`);
  }
  
  const sql = fs.readFileSync(rollbackPath, 'utf8');
  
  await db.transaction(async (client) => {
    await client.query(sql);
    await client.query('DELETE FROM schema_migrations WHERE name = $1', [lastMigration]);
  });
  
  console.log(`✅ Rolled back: ${lastMigration}`);
}

/**
 * Get migration status
 */
export async function getMigrationStatus() {
  await ensureMigrationsTable();
  const executed = await getExecutedMigrations();
  const pending = await getPendingMigrations();
  
  return {
    executed,
    pending,
    total: executed.length + pending.length
  };
}

// Run migrations if executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
