import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { encrypt, decrypt } from '../utils/encryption.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const TENANTS_DIR = join(__dirname, '../../data/tenants');

/**
 * Tenant Model - Manages multi-tenant data
 */
export class TenantModel {
  /**
   * Ensure tenant directory exists
   */
  static ensureTenantDir(tenantId) {
    const tenantDir = join(TENANTS_DIR, tenantId);
    if (!existsSync(tenantDir)) {
      mkdirSync(tenantDir, { recursive: true });
    }
    return tenantDir;
  }

  /**
   * Get all tenants
   */
  static getAllTenants() {
    const tenantsFile = join(TENANTS_DIR, 'tenants.json');
    if (!existsSync(tenantsFile)) {
      return [];
    }
    try {
      return JSON.parse(readFileSync(tenantsFile, 'utf-8'));
    } catch {
      return [];
    }
  }

  /**
   * Get a tenant by ID
   */
  static getTenant(tenantId) {
    const tenants = this.getAllTenants();
    return tenants.find(t => t.id === tenantId);
  }

  /**
   * Create a new tenant
   */
  static createTenant({ id, name, subdomain, branding = {} }) {
    const tenants = this.getAllTenants();
    
    if (tenants.find(t => t.id === id)) {
      throw new Error(`Tenant ${id} already exists`);
    }

    const newTenant = {
      id,
      name,
      subdomain: subdomain || id,
      branding: {
        primaryColor: branding.primaryColor || '#c41e3a',
        logo: branding.logo || '',
        restaurantName: branding.restaurantName || name,
        description: branding.description || 'Restaurant',
      },
      createdAt: new Date().toISOString(),
      active: true,
    };

    tenants.push(newTenant);
    
    // Save tenants list
    const tenantsFile = join(TENANTS_DIR, 'tenants.json');
    mkdirSync(dirname(tenantsFile), { recursive: true });
    writeFileSync(tenantsFile, JSON.stringify(tenants, null, 2));

    // Create tenant directory and default files
    this.ensureTenantDir(id);
    this.saveTenantConfig(id, { perplexityApiKey: '', model: 'llama-3.1-sonar-small-128k-online' });
    this.saveTenantMenu(id, this.getDefaultMenu(newTenant.branding));

    return newTenant;
  }

  /**
   * Get tenant config (with decrypted API key)
   */
  static getTenantConfig(tenantId) {
    const configPath = join(TENANTS_DIR, tenantId, 'config.json');
    if (!existsSync(configPath)) {
      return { perplexityApiKey: '', model: 'llama-3.1-sonar-small-128k-online' };
    }
    try {
      const config = JSON.parse(readFileSync(configPath, 'utf-8'));
      // Decrypt API key
      if (config.perplexityApiKeyEncrypted) {
        config.perplexityApiKey = decrypt(config.perplexityApiKeyEncrypted);
        delete config.perplexityApiKeyEncrypted;
      }
      return config;
    } catch {
      return { perplexityApiKey: '', model: 'llama-3.1-sonar-small-128k-online' };
    }
  }

  /**
   * Save tenant config (with encrypted API key)
   */
  static saveTenantConfig(tenantId, config) {
    this.ensureTenantDir(tenantId);
    const configPath = join(TENANTS_DIR, tenantId, 'config.json');
    
    const configToSave = { ...config };
    // Encrypt API key before saving
    if (configToSave.perplexityApiKey) {
      configToSave.perplexityApiKeyEncrypted = encrypt(configToSave.perplexityApiKey);
      delete configToSave.perplexityApiKey;
    }
    
    writeFileSync(configPath, JSON.stringify(configToSave, null, 2));
  }

  /**
   * Get tenant menu
   */
  static getTenantMenu(tenantId) {
    const menuPath = join(TENANTS_DIR, tenantId, 'menu.json');
    if (!existsSync(menuPath)) {
      return null;
    }
    try {
      return JSON.parse(readFileSync(menuPath, 'utf-8'));
    } catch {
      return null;
    }
  }

  /**
   * Save tenant menu
   */
  static saveTenantMenu(tenantId, menu) {
    this.ensureTenantDir(tenantId);
    const menuPath = join(TENANTS_DIR, tenantId, 'menu.json');
    writeFileSync(menuPath, JSON.stringify(menu, null, 2));
  }

  /**
   * Get default menu template
   */
  static getDefaultMenu(branding = {}) {
    return {
      restaurant: {
        name: branding.restaurantName || 'My Restaurant',
        description: branding.description || 'Welcome to our restaurant',
      },
      categories: [
        {
          name: 'Appetizers',
          dishes: [
            {
              id: 'app-1',
              name: 'Sample Appetizer',
              description: 'A delicious starter to begin your meal',
              price: 9.99,
              ingredients: ['ingredient1', 'ingredient2'],
              allergens: [],
              vegetarian: true,
            },
          ],
        },
        {
          name: 'Main Courses',
          dishes: [
            {
              id: 'main-1',
              name: 'Sample Main Course',
              description: 'A hearty main dish',
              price: 19.99,
              ingredients: ['ingredient1', 'ingredient2', 'ingredient3'],
              allergens: [],
              vegetarian: false,
            },
          ],
        },
        {
          name: 'Desserts',
          dishes: [
            {
              id: 'dessert-1',
              name: 'Sample Dessert',
              description: 'A sweet ending to your meal',
              price: 7.99,
              ingredients: ['sugar', 'cream'],
              allergens: ['dairy'],
              vegetarian: true,
            },
          ],
        },
      ],
    };
  }

  /**
   * Log audit event for tenant
   */
  static logAudit(tenantId, action, details = {}) {
    this.ensureTenantDir(tenantId);
    const auditPath = join(TENANTS_DIR, tenantId, 'audit.log');
    
    const entry = {
      timestamp: new Date().toISOString(),
      action,
      ...details,
    };
    
    const line = JSON.stringify(entry) + '\n';
    
    try {
      const existing = existsSync(auditPath) ? readFileSync(auditPath, 'utf-8') : '';
      writeFileSync(auditPath, existing + line);
    } catch (error) {
      console.error('Audit log error:', error);
    }
  }
}

export default TenantModel;
