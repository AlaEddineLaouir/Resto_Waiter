import config from '../config/index.js';

/**
 * Simple in-memory rate limiter
 * For production, use Redis-based rate limiting
 */

const requestCounts = new Map();

// Clean up old entries every minute
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of requestCounts.entries()) {
    if (now - data.windowStart > config.rateLimitWindowMs) {
      requestCounts.delete(key);
    }
  }
}, 60000);

/**
 * Rate limiting middleware
 * Limits requests per tenant and IP
 */
export function rateLimiter(req, res, next) {
  const tenantId = req.tenantId || 'global';
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const key = `${tenantId}:${ip}`;
  
  const now = Date.now();
  let data = requestCounts.get(key);
  
  if (!data || now - data.windowStart > config.rateLimitWindowMs) {
    data = { count: 0, windowStart: now };
  }
  
  data.count++;
  requestCounts.set(key, data);
  
  // Set rate limit headers
  res.setHeader('X-RateLimit-Limit', config.rateLimitMaxRequests);
  res.setHeader('X-RateLimit-Remaining', Math.max(0, config.rateLimitMaxRequests - data.count));
  res.setHeader('X-RateLimit-Reset', new Date(data.windowStart + config.rateLimitWindowMs).toISOString());
  
  if (data.count > config.rateLimitMaxRequests) {
    return res.status(429).json({
      error: 'Too many requests',
      retryAfter: Math.ceil((data.windowStart + config.rateLimitWindowMs - now) / 1000),
    });
  }
  
  next();
}

/**
 * Stricter rate limiter for sensitive endpoints (like auth)
 */
export function strictRateLimiter(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const key = `strict:${ip}`;
  
  const now = Date.now();
  const windowMs = 60000; // 1 minute
  const maxRequests = 30; // Increased from 10
  
  let data = requestCounts.get(key);
  
  if (!data || now - data.windowStart > windowMs) {
    data = { count: 0, windowStart: now };
  }
  
  data.count++;
  requestCounts.set(key, data);
  
  if (data.count > maxRequests) {
    return res.status(429).json({
      error: 'Too many attempts. Please try again later.',
      retryAfter: Math.ceil((data.windowStart + windowMs - now) / 1000),
    });
  }
  
  next();
}

/**
 * Clear rate limit for an IP (useful for testing)
 */
export function clearRateLimit(ip) {
  for (const [key] of requestCounts.entries()) {
    if (key.includes(ip)) {
      requestCounts.delete(key);
    }
  }
}
