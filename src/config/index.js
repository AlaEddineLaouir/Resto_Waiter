/**
 * Application Configuration
 * Uses environment variables with sensible defaults
 */

export const config = {
  // Server
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Clustering
  enableClustering: process.env.ENABLE_CLUSTERING === 'true',
  
  // Security
  jwtSecret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  encryptionKey: process.env.ENCRYPTION_KEY || 'your-32-character-encryption-key!',
  
  // Rate Limiting
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  
  // Cache
  cacheTTL: parseInt(process.env.CACHE_TTL) || 5 * 60 * 1000, // 5 minutes
  
  // CORS
  corsOrigins: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ['*'],
  
  // Default tenant
  defaultTenantId: 'default',
};

export default config;
