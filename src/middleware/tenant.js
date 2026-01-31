import tenantRepo from '../db/repositories/tenantRepo.js';
import config from '../config/index.js';

// Cache for tenant lookups to avoid repeated DB queries
let defaultTenantCache = null;
let tenantCache = new Map();
const CACHE_TTL = 60000; // 1 minute

/**
 * Validate tenant slug format
 */
function isValidTenantSlug(slug) {
  if (!slug || typeof slug !== 'string') return false;
  // Allow alphanumeric, hyphens, underscores, and UUIDs
  return /^[a-zA-Z0-9_-]{1,50}$/.test(slug) || 
         /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);
}

/**
 * Get cached tenant or fetch from database
 */
async function getCachedTenant(slug) {
  const cached = tenantCache.get(slug);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.tenant;
  }
  
  const tenant = await tenantRepo.findBySlug(slug);
  if (tenant) {
    tenantCache.set(slug, { tenant, timestamp: Date.now() });
  }
  return tenant;
}

/**
 * Tenant resolution middleware
 * Supports path-based routing: /t/:tenantSlug/...
 * Or subdomain-based: tenant.domain.com
 */
export async function resolveTenant(req, res, next) {
  let tenantSlug = null;
  
  // 1. Check path-based routing: /t/:tenantSlug/...
  const pathMatch = req.path.match(/^\/t\/([^\/]+)/);
  if (pathMatch) {
    tenantSlug = pathMatch[1];
    // Remove tenant prefix from path for downstream routing
    req.url = req.url.replace(/^\/t\/[^\/]+/, '') || '/';
    req.originalUrl = req.originalUrl.replace(/^\/t\/[^\/]+/, '') || '/';
  }
  
  // 2. Check subdomain-based routing
  if (!tenantSlug) {
    const host = req.headers.host || '';
    // Remove port if present
    const hostname = host.split(':')[0];
    // Only extract subdomain if there are multiple parts (e.g., tenant.example.com)
    const parts = hostname.split('.');
    if (parts.length > 2 || (parts.length === 2 && !['com', 'org', 'net', 'io', 'local', 'localhost'].includes(parts[1]))) {
      const subdomain = parts[0];
      if (subdomain && subdomain !== 'www' && subdomain !== 'localhost' && subdomain !== '127') {
        tenantSlug = subdomain;
      }
    }
  }
  
  // 3. Check header-based (for API clients)
  if (!tenantSlug) {
    tenantSlug = req.headers['x-tenant-id'];
  }
  
  // 4. Default tenant
  if (!tenantSlug) {
    tenantSlug = config.defaultTenantId || 'default';
  }
  
  // Validate tenant slug format
  if (!isValidTenantSlug(tenantSlug)) {
    return res.status(400).json({ error: 'Invalid tenant ID format' });
  }
  
  try {
    // Lookup tenant from database
    let tenant;
    
    if (tenantSlug === config.defaultTenantId) {
      // Use cached default tenant or fetch/create it
      if (!defaultTenantCache || Date.now() - defaultTenantCache.timestamp > CACHE_TTL) {
        tenant = await tenantRepo.getOrCreateDefault();
        defaultTenantCache = { tenant, timestamp: Date.now() };
      } else {
        tenant = defaultTenantCache.tenant;
      }
    } else {
      tenant = await getCachedTenant(tenantSlug);
    }
    
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }
    
    if (!tenant.is_active) {
      return res.status(403).json({ error: 'Tenant is inactive' });
    }
    
    // Set tenant info on request - use UUID for database queries
    req.tenant = tenant;
    req.tenantId = tenant.id; // This is the UUID
    req.tenantSlug = tenant.slug;
    
    // Set tenant ID in response header for debugging
    res.setHeader('X-Tenant-ID', tenant.id);
    res.setHeader('X-Tenant-Slug', tenant.slug);
    
    next();
  } catch (error) {
    console.error('Tenant resolution error:', error);
    return res.status(500).json({ error: 'Failed to resolve tenant' });
  }
}

/**
 * Require specific tenant (not default)
 */
export function requireTenant(req, res, next) {
  if (!req.tenantId || req.tenantSlug === config.defaultTenantId) {
    return res.status(400).json({ 
      error: 'Tenant ID required',
      hint: 'Use /t/{tenantSlug}/... path or X-Tenant-ID header'
    });
  }
  next();
}

/**
 * Clear tenant cache (useful for testing or after tenant updates)
 */
export function clearTenantCache() {
  defaultTenantCache = null;
  tenantCache.clear();
}
