/**
 * Database Seed Script
 * Migrates data from menu.json to PostgreSQL database
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './index.js';
import { runMigrations } from './migrate.js';
import tenantRepo from './repositories/tenantRepo.js';
import categoryRepo from './repositories/categoryRepo.js';
import dishRepo from './repositories/dishRepo.js';
import ingredientRepo from './repositories/ingredientRepo.js';
import adminUserRepo from './repositories/adminUserRepo.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MENU_FILE = path.join(__dirname, '../../data/menu.json');

/**
 * Seed the database with initial data
 */
export async function seedDatabase(options = {}) {
  const { 
    adminPassword = process.env.ADMIN_PASSWORD || 'admin123',
    skipIfExists = true 
  } = options;

  console.log('🌱 Starting database seed...');

  try {
    // Run migrations first
    await runMigrations();

    // Create or get default tenant
    console.log('📦 Setting up default tenant...');
    const tenant = await tenantRepo.getOrCreateDefault();
    console.log(`   Tenant: ${tenant.name} (${tenant.slug})`);

    // Check if data already exists
    const existingCategories = await categoryRepo.count(tenant.id);
    if (existingCategories > 0 && skipIfExists) {
      console.log('✅ Database already has data. Skipping seed.');
      return { success: true, skipped: true };
    }

    // Create default admin user
    console.log('👤 Creating admin user...');
    const admin = await adminUserRepo.createDefaultAdmin(tenant.id, adminPassword);
    console.log(`   Admin: ${admin.email}`);

    // Read menu.json
    if (!fs.existsSync(MENU_FILE)) {
      console.log('⚠️ No menu.json file found. Creating empty menu.');
      return { success: true, tenant, admin };
    }

    console.log('📄 Reading menu.json...');
    const menuData = JSON.parse(fs.readFileSync(MENU_FILE, 'utf8'));

    // Collect all unique ingredients
    const allIngredients = new Map();
    
    if (menuData.categories) {
      for (const category of menuData.categories) {
        for (const dish of category.dishes || []) {
          for (const ingredientName of dish.ingredients || []) {
            if (!allIngredients.has(ingredientName.toLowerCase())) {
              allIngredients.set(ingredientName.toLowerCase(), {
                name: ingredientName,
                is_allergen: (dish.allergens || []).includes(ingredientName.toLowerCase())
              });
            }
          }
        }
      }
    }

    // Create ingredients
    console.log(`🥗 Creating ${allIngredients.size} ingredients...`);
    const ingredientMap = new Map();
    
    for (const [key, ingData] of allIngredients) {
      const ingredient = await ingredientRepo.create(tenant.id, ingData);
      ingredientMap.set(key, ingredient.id);
    }

    // Create categories and dishes
    console.log(`📋 Creating ${menuData.categories?.length || 0} categories...`);
    let dishCount = 0;

    for (let i = 0; i < (menuData.categories?.length || 0); i++) {
      const categoryData = menuData.categories[i];
      
      // Create category
      const category = await categoryRepo.create(tenant.id, {
        name: categoryData.name,
        description: categoryData.description || '',
        display_order: i
      });

      // Create dishes
      for (let j = 0; j < (categoryData.dishes?.length || 0); j++) {
        const dishData = categoryData.dishes[j];
        
        const dish = await dishRepo.create(tenant.id, {
          category_id: category.id,
          name: dishData.name,
          description: dishData.description || '',
          price: dishData.price,
          is_vegetarian: dishData.vegetarian || false,
          is_available: true,
          allergens: dishData.allergens || [],
          display_order: j
        });

        // Link ingredients
        const dishIngredients = [];
        for (const ingredientName of dishData.ingredients || []) {
          const ingredientId = ingredientMap.get(ingredientName.toLowerCase());
          if (ingredientId) {
            dishIngredients.push({ ingredient_id: ingredientId });
          }
        }

        if (dishIngredients.length > 0) {
          await dishRepo.setIngredients(dish.id, dishIngredients);
        }

        dishCount++;
      }
    }

    console.log(`🍽️ Created ${dishCount} dishes`);
    console.log('✅ Database seeded successfully!');

    return { 
      success: true, 
      tenant, 
      admin,
      stats: {
        categories: menuData.categories?.length || 0,
        dishes: dishCount,
        ingredients: allIngredients.size
      }
    };
  } catch (error) {
    console.error('❌ Seed failed:', error);
    throw error;
  }
}

/**
 * Clear all data (dangerous!)
 */
export async function clearDatabase() {
  console.log('⚠️ Clearing all data...');
  
  await db.query('DELETE FROM audit_logs');
  await db.query('DELETE FROM dish_ingredients');
  await db.query('DELETE FROM dishes');
  await db.query('DELETE FROM categories');
  await db.query('DELETE FROM ingredients');
  await db.query('DELETE FROM admin_users');
  await db.query('DELETE FROM tenants');
  
  console.log('✅ All data cleared');
}

// Run if executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const command = process.argv[2];
  
  if (command === 'clear') {
    clearDatabase()
      .then(() => db.closePool())
      .then(() => process.exit(0))
      .catch((error) => {
        console.error(error);
        process.exit(1);
      });
  } else {
    seedDatabase({ skipIfExists: command !== 'force' })
      .then(() => db.closePool())
      .then(() => process.exit(0))
      .catch((error) => {
        console.error(error);
        process.exit(1);
      });
  }
}
