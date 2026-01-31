/**
 * Input validation and sanitization utilities
 */

/**
 * Sanitize string input - remove potential XSS
 */
export function sanitizeString(input) {
  if (typeof input !== 'string') return '';
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim();
}

/**
 * Validate tenant ID format
 */
export function isValidTenantId(tenantId) {
  if (!tenantId || typeof tenantId !== 'string') return false;
  // Only allow alphanumeric, hyphens, and underscores
  return /^[a-zA-Z0-9_-]{1,50}$/.test(tenantId);
}

/**
 * Validate API key format
 */
export function isValidApiKey(apiKey) {
  if (!apiKey || typeof apiKey !== 'string') return false;
  // Perplexity API keys start with 'pplx-'
  return apiKey.startsWith('pplx-') && apiKey.length > 10;
}

/**
 * Validate chat message
 */
export function validateChatMessage(message) {
  if (!message || typeof message !== 'string') {
    return { valid: false, error: 'Message is required' };
  }
  if (message.length > 2000) {
    return { valid: false, error: 'Message is too long (max 2000 characters)' };
  }
  if (message.trim().length === 0) {
    return { valid: false, error: 'Message cannot be empty' };
  }
  return { valid: true, sanitized: sanitizeString(message) };
}

/**
 * Validation middleware factory
 */
export function validateBody(schema) {
  return (req, res, next) => {
    const errors = [];
    
    for (const [field, rules] of Object.entries(schema)) {
      const value = req.body[field];
      
      if (rules.required && (value === undefined || value === null || value === '')) {
        errors.push(`${field} is required`);
        continue;
      }
      
      if (value !== undefined && value !== null) {
        if (rules.type === 'string' && typeof value !== 'string') {
          errors.push(`${field} must be a string`);
        }
        if (rules.maxLength && typeof value === 'string' && value.length > rules.maxLength) {
          errors.push(`${field} must be at most ${rules.maxLength} characters`);
        }
        if (rules.minLength && typeof value === 'string' && value.length < rules.minLength) {
          errors.push(`${field} must be at least ${rules.minLength} characters`);
        }
        if (rules.pattern && typeof value === 'string' && !rules.pattern.test(value)) {
          errors.push(`${field} has invalid format`);
        }
      }
    }
    
    if (errors.length > 0) {
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }
    
    next();
  };
}
