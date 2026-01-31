/**
 * PostgreSQL Database Connection Pool
 * Supports environment-based configuration with connection pooling
 */

import pg from 'pg';
const { Pool } = pg;

// Database configuration from environment variables
const dbConfig = {
  connectionString: process.env.DATABASE_URL,
  // Individual connection parameters (fallback if DATABASE_URL not set)
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'restaurant_menu',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  // Pool configuration
  max: parseInt(process.env.DB_POOL_MAX || '20'),
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECT_TIMEOUT || '2000'),
  // SSL for production
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
};

// Use DATABASE_URL if available, otherwise use individual params
const poolConfig = process.env.DATABASE_URL 
  ? { 
      connectionString: process.env.DATABASE_URL,
      max: dbConfig.max,
      idleTimeoutMillis: dbConfig.idleTimeoutMillis,
      connectionTimeoutMillis: dbConfig.connectionTimeoutMillis,
      ssl: dbConfig.ssl
    }
  : dbConfig;

// Create connection pool
const pool = new Pool(poolConfig);

// Log connection events
pool.on('connect', () => {
  console.log('📦 New database connection established');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected database error:', err);
});

/**
 * Execute a query with parameterized values
 * @param {string} text - SQL query text
 * @param {Array} params - Query parameters
 * @returns {Promise<pg.QueryResult>}
 */
export async function query(text, params = []) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.DB_LOG_QUERIES === 'true') {
      console.log('📊 Query executed:', { text: text.substring(0, 100), duration: `${duration}ms`, rows: result.rowCount });
    }
    return result;
  } catch (error) {
    console.error('❌ Query error:', { text: text.substring(0, 100), error: error.message });
    throw error;
  }
}

/**
 * Get a client from the pool for transactions
 * @returns {Promise<pg.PoolClient>}
 */
export async function getClient() {
  const client = await pool.connect();
  const originalQuery = client.query.bind(client);
  const originalRelease = client.release.bind(client);
  
  // Track if client has been released
  let released = false;
  
  // Override release to prevent double release
  client.release = () => {
    if (released) {
      console.warn('⚠️ Client already released');
      return;
    }
    released = true;
    return originalRelease();
  };
  
  return client;
}

/**
 * Execute a transaction with automatic commit/rollback
 * @param {Function} callback - Async function that receives the client
 * @returns {Promise<any>}
 */
export async function transaction(callback) {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Check database connectivity
 * @returns {Promise<boolean>}
 */
export async function checkConnection() {
  try {
    const result = await query('SELECT NOW()');
    return result.rows.length > 0;
  } catch (error) {
    console.error('❌ Database connection check failed:', error.message);
    return false;
  }
}

/**
 * Close all pool connections
 */
export async function closePool() {
  await pool.end();
  console.log('📦 Database pool closed');
}

export default {
  query,
  getClient,
  transaction,
  checkConnection,
  closePool,
  pool
};
