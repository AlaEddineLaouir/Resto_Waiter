/**
 * Seed Algerian Restaurant Data
 * 
 * Creates a complete Algerian restaurant with:
 * - Tenant, Brand, Location
 * - Menu with published version
 * - Sections (Starters, Couscous, Grills, Tagines, Desserts, Beverages)
 * - Menu items with prices, allergens, dietary flags
 * - INGREDIENTS for each dish
 * - OPTION GROUPS (portion sizes, sides, spice levels)
 */

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import bcrypt from 'bcrypt';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:admin@localhost:5432/restaurant_menu';
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🇩🇿 Creating Algerian restaurant data...\n');

  // Get allergens and dietary flags
  const allergens = await prisma.allergen.findMany();
  const dietaryFlags = await prisma.dietaryFlag.findMany();
  
  const getAllergen = (code: string) => allergens.find(a => a.code === code);
  const getDietaryFlag = (code: string) => dietaryFlags.find(d => d.code === code);

  // Check if Algerian tenant already exists
  const existingTenant = await prisma.tenant.findUnique({
    where: { slug: 'dar-el-baraka' }
  });

  if (existingTenant) {
    console.log('⚠️ Algerian restaurant already exists. Deleting and recreating...');
    await prisma.tenant.delete({ where: { id: existingTenant.id } });
  }

  // Create Tenant
  console.log('📦 Creating tenant...');
  const tenant = await prisma.tenant.create({
    data: {
      slug: 'dar-el-baraka',
      name: 'Dar El Baraka',
      defaultLocale: 'en-US',
      isActive: true,
      locales: {
        create: [
          { locale: 'en-US', isDefault: true },
          { locale: 'fr-FR', isDefault: false },
          { locale: 'ar-DZ', isDefault: false },
        ]
      }
    }
  });
  console.log(`  ✓ Tenant: ${tenant.name} (${tenant.slug})`);

  // Create Admin User
  console.log('👤 Creating admin user...');
  const hashedPassword = await bcrypt.hash('baraka123', 10);
  const admin = await prisma.adminUser.create({
    data: {
      tenantId: tenant.id,
      username: 'admin',
      email: 'admin@dar-el-baraka.com',
      passwordHash: hashedPassword,
      role: 'owner',
      isActive: true,
    }
  });
  console.log(`  ✓ Admin: ${admin.email}`);

  // Create Brand
  console.log('🏢 Creating brand...');
  const brand = await prisma.brand.create({
    data: {
      tenantId: tenant.id,
      name: 'Dar El Baraka',
      slug: 'dar-el-baraka',
    }
  });
  console.log(`  ✓ Brand: Dar El Baraka`);

  // Create Locations
  console.log('📍 Creating locations...');
  const locationParis = await prisma.location.create({
    data: {
      tenantId: tenant.id,
      brandId: brand.id,
      name: 'Paris Belleville',
      addressLine1: '45 Rue de Belleville',
      city: 'Paris',
      countryCode: 'FR',
      postalCode: '75019',
      timezone: 'Europe/Paris',
      isActive: true,
    }
  });
  console.log(`  ✓ Location: Paris Belleville`);

  const locationAlgiers = await prisma.location.create({
    data: {
      tenantId: tenant.id,
      brandId: brand.id,
      name: 'Alger Centre',
      addressLine1: 'Rue Didouche Mourad 123',
      city: 'Alger',
      countryCode: 'DZ',
      postalCode: '16000',
      timezone: 'Africa/Algiers',
      isActive: true,
    }
  });
  console.log(`  ✓ Location: Alger Centre`);

  // Create Menu (published)
  console.log('📋 Creating menu...');
  const menu = await prisma.menu.create({
    data: {
      tenantId: tenant.id,
      brandId: brand.id,
      code: 'main-menu',
      status: 'published',
      publishedAt: new Date(),
      isActive: true,
      translations: {
        create: [
          { tenantId: tenant.id, locale: 'en-US', name: 'Main Menu', description: 'Authentic Algerian cuisine' },
          { tenantId: tenant.id, locale: 'fr-FR', name: 'Menu Principal', description: 'Cuisine algérienne authentique' },
          { tenantId: tenant.id, locale: 'ar-DZ', name: 'القائمة الرئيسية', description: 'مأكولات جزائرية أصيلة' },
        ]
      }
    }
  });
  console.log(`  ✓ Menu: Main Menu (published)`);

  // Publish to locations
  await prisma.menuPublication.create({
    data: {
      tenantId: tenant.id,
      menuId: menu.id,
      locationId: locationParis.id,
      goesLiveAt: new Date(),
      isCurrent: true,
    }
  });
  await prisma.menuPublication.create({
    data: {
      tenantId: tenant.id,
      menuId: menu.id,
      locationId: locationAlgiers.id,
      goesLiveAt: new Date(),
      isCurrent: true,
    }
  });

  // ============================================
  // CREATE INGREDIENTS
  // ============================================
  console.log('\n🥬 Creating ingredients...');
  const ingredientData = [
    // Proteins
    { name: 'Lamb', allergenCode: null },
    { name: 'Chicken', allergenCode: null },
    { name: 'Beef', allergenCode: null },
    { name: 'Merguez Sausage', allergenCode: null },
    { name: 'Sardines', allergenCode: 'fish' },
    // Grains
    { name: 'Couscous Semolina', allergenCode: 'gluten' },
    { name: 'Frik (Freekeh)', allergenCode: 'gluten' },
    { name: 'Bread', allergenCode: 'gluten' },
    // Vegetables
    { name: 'Chickpeas', allergenCode: null },
    { name: 'Tomatoes', allergenCode: null },
    { name: 'Onions', allergenCode: null },
    { name: 'Carrots', allergenCode: null },
    { name: 'Turnips', allergenCode: null },
    { name: 'Zucchini', allergenCode: null },
    { name: 'Potatoes', allergenCode: null },
    { name: 'Bell Peppers', allergenCode: null },
    { name: 'Eggplant', allergenCode: null },
    { name: 'Olives', allergenCode: null },
    // Spices & Herbs
    { name: 'Ras el Hanout', allergenCode: null },
    { name: 'Cumin', allergenCode: null },
    { name: 'Coriander', allergenCode: null },
    { name: 'Saffron', allergenCode: null },
    { name: 'Harissa', allergenCode: null },
    { name: 'Garlic', allergenCode: null },
    { name: 'Fresh Mint', allergenCode: null },
    { name: 'Fresh Parsley', allergenCode: null },
    // Dairy & Eggs
    { name: 'Eggs', allergenCode: 'eggs' },
    { name: 'Butter', allergenCode: 'milk' },
    // Nuts & Dried Fruits
    { name: 'Almonds', allergenCode: 'nuts' },
    { name: 'Dates', allergenCode: null },
    { name: 'Raisins', allergenCode: null },
    { name: 'Prunes', allergenCode: null },
    // Other
    { name: 'Olive Oil', allergenCode: null },
    { name: 'Honey', allergenCode: null },
    { name: 'Phyllo Pastry', allergenCode: 'gluten' },
    { name: 'Preserved Lemons', allergenCode: null },
  ];

  const ingredients: Record<string, string> = {};
  for (const ing of ingredientData) {
    const created = await prisma.ingredient.create({
      data: {
        tenantId: tenant.id,
        name: ing.name,
        allergenCode: ing.allergenCode,
        isAllergen: !!ing.allergenCode,
      }
    });
    ingredients[ing.name] = created.id;
    console.log(`  ✓ ${ing.name}${ing.allergenCode ? ` (⚠️ ${ing.allergenCode})` : ''}`);
  }

  // ============================================
  // CREATE OPTION GROUPS
  // ============================================
  console.log('\n⚙️ Creating option groups...');

  // Portion Size Option Group
  const portionSizeGroup = await prisma.optionGroup.create({
    data: {
      tenantId: tenant.id,
      menuId: menu.id,
      code: 'portion-size',
      selectionMode: 'single',
      minSelect: 1,
      maxSelect: 1,
      isRequired: true,
      displayOrder: 1,
      isActive: true,
      translations: {
        create: [
          { tenantId: tenant.id, locale: 'en-US', name: 'Portion Size', description: 'Choose your portion size' },
          { tenantId: tenant.id, locale: 'fr-FR', name: 'Taille de Portion', description: 'Choisissez la taille de votre portion' },
          { tenantId: tenant.id, locale: 'ar-DZ', name: 'حجم الحصة', description: 'اختر حجم حصتك' },
        ]
      },
      options: {
        create: [
          {
            tenantId: tenant.id,
            code: 'regular',
            displayOrder: 1,
            isDefault: true,
            isActive: true,
            translations: {
              create: [
                { tenantId: tenant.id, locale: 'en-US', name: 'Regular' },
                { tenantId: tenant.id, locale: 'fr-FR', name: 'Normal' },
                { tenantId: tenant.id, locale: 'ar-DZ', name: 'عادي' },
              ]
            }
          },
          {
            tenantId: tenant.id,
            code: 'large',
            displayOrder: 2,
            isDefault: false,
            isActive: true,
            translations: {
              create: [
                { tenantId: tenant.id, locale: 'en-US', name: 'Large (+€3)' },
                { tenantId: tenant.id, locale: 'fr-FR', name: 'Grand (+3€)' },
                { tenantId: tenant.id, locale: 'ar-DZ', name: 'كبير (+٣€)' },
              ]
            },
            price: {
              create: {
                tenantId: tenant.id,
                currency: 'EUR',
                deltaMinor: 300n, // +€3.00
              }
            }
          },
          {
            tenantId: tenant.id,
            code: 'family',
            displayOrder: 3,
            isDefault: false,
            isActive: true,
            translations: {
              create: [
                { tenantId: tenant.id, locale: 'en-US', name: 'Family Size (+€8)' },
                { tenantId: tenant.id, locale: 'fr-FR', name: 'Familial (+8€)' },
                { tenantId: tenant.id, locale: 'ar-DZ', name: 'عائلي (+٨€)' },
              ]
            },
            price: {
              create: {
                tenantId: tenant.id,
                currency: 'EUR',
                deltaMinor: 800n, // +€8.00
              }
            }
          },
        ]
      }
    }
  });
  console.log(`  ✓ Option Group: Portion Size (Regular, Large, Family)`);

  // Spice Level Option Group
  const spiceLevelGroup = await prisma.optionGroup.create({
    data: {
      tenantId: tenant.id,
      menuId: menu.id,
      code: 'spice-level',
      selectionMode: 'single',
      minSelect: 0,
      maxSelect: 1,
      isRequired: false,
      displayOrder: 2,
      isActive: true,
      translations: {
        create: [
          { tenantId: tenant.id, locale: 'en-US', name: 'Spice Level', description: 'How spicy would you like it?' },
          { tenantId: tenant.id, locale: 'fr-FR', name: 'Niveau de Piment', description: 'Quel niveau de piment souhaitez-vous?' },
          { tenantId: tenant.id, locale: 'ar-DZ', name: 'درجة الحرارة', description: 'ما مستوى التوابل الذي تريده؟' },
        ]
      },
      options: {
        create: [
          {
            tenantId: tenant.id,
            code: 'mild',
            displayOrder: 1,
            isDefault: true,
            isActive: true,
            translations: {
              create: [
                { tenantId: tenant.id, locale: 'en-US', name: 'Mild 🌶️' },
                { tenantId: tenant.id, locale: 'fr-FR', name: 'Doux 🌶️' },
                { tenantId: tenant.id, locale: 'ar-DZ', name: 'خفيف 🌶️' },
              ]
            }
          },
          {
            tenantId: tenant.id,
            code: 'medium',
            displayOrder: 2,
            isDefault: false,
            isActive: true,
            translations: {
              create: [
                { tenantId: tenant.id, locale: 'en-US', name: 'Medium 🌶️🌶️' },
                { tenantId: tenant.id, locale: 'fr-FR', name: 'Moyen 🌶️🌶️' },
                { tenantId: tenant.id, locale: 'ar-DZ', name: 'متوسط 🌶️🌶️' },
              ]
            }
          },
          {
            tenantId: tenant.id,
            code: 'hot',
            displayOrder: 3,
            isDefault: false,
            isActive: true,
            translations: {
              create: [
                { tenantId: tenant.id, locale: 'en-US', name: 'Hot 🌶️🌶️🌶️' },
                { tenantId: tenant.id, locale: 'fr-FR', name: 'Fort 🌶️🌶️🌶️' },
                { tenantId: tenant.id, locale: 'ar-DZ', name: 'حار 🌶️🌶️🌶️' },
              ]
            }
          },
          {
            tenantId: tenant.id,
            code: 'extra-hot',
            displayOrder: 4,
            isDefault: false,
            isActive: true,
            translations: {
              create: [
                { tenantId: tenant.id, locale: 'en-US', name: 'Extra Hot 🔥🔥🔥' },
                { tenantId: tenant.id, locale: 'fr-FR', name: 'Très Fort 🔥🔥🔥' },
                { tenantId: tenant.id, locale: 'ar-DZ', name: 'حار جداً 🔥🔥🔥' },
              ]
            }
          },
        ]
      }
    }
  });
  console.log(`  ✓ Option Group: Spice Level (Mild, Medium, Hot, Extra Hot)`);

  // Extra Sides Option Group
  const extraSidesGroup = await prisma.optionGroup.create({
    data: {
      tenantId: tenant.id,
      menuId: menu.id,
      code: 'extra-sides',
      selectionMode: 'multiple',
      minSelect: 0,
      maxSelect: 3,
      isRequired: false,
      displayOrder: 3,
      isActive: true,
      translations: {
        create: [
          { tenantId: tenant.id, locale: 'en-US', name: 'Extra Sides', description: 'Add extra sides to your dish' },
          { tenantId: tenant.id, locale: 'fr-FR', name: 'Accompagnements', description: 'Ajoutez des accompagnements à votre plat' },
          { tenantId: tenant.id, locale: 'ar-DZ', name: 'إضافات', description: 'أضف مرافقات لطبقك' },
        ]
      },
      options: {
        create: [
          {
            tenantId: tenant.id,
            code: 'extra-harissa',
            displayOrder: 1,
            isDefault: false,
            isActive: true,
            translations: {
              create: [
                { tenantId: tenant.id, locale: 'en-US', name: 'Extra Harissa (+€1)' },
                { tenantId: tenant.id, locale: 'fr-FR', name: 'Harissa Supplémentaire (+1€)' },
                { tenantId: tenant.id, locale: 'ar-DZ', name: 'هريسة إضافية (+١€)' },
              ]
            },
            price: {
              create: {
                tenantId: tenant.id,
                currency: 'EUR',
                deltaMinor: 100n,
              }
            }
          },
          {
            tenantId: tenant.id,
            code: 'extra-bread',
            displayOrder: 2,
            isDefault: false,
            isActive: true,
            translations: {
              create: [
                { tenantId: tenant.id, locale: 'en-US', name: 'Extra Bread (+€1.50)' },
                { tenantId: tenant.id, locale: 'fr-FR', name: 'Pain Supplémentaire (+1,50€)' },
                { tenantId: tenant.id, locale: 'ar-DZ', name: 'خبز إضافي (+١.٥٠€)' },
              ]
            },
            price: {
              create: {
                tenantId: tenant.id,
                currency: 'EUR',
                deltaMinor: 150n,
              }
            }
          },
          {
            tenantId: tenant.id,
            code: 'extra-vegetables',
            displayOrder: 3,
            isDefault: false,
            isActive: true,
            translations: {
              create: [
                { tenantId: tenant.id, locale: 'en-US', name: 'Extra Vegetables (+€2)' },
                { tenantId: tenant.id, locale: 'fr-FR', name: 'Légumes Supplémentaires (+2€)' },
                { tenantId: tenant.id, locale: 'ar-DZ', name: 'خضروات إضافية (+٢€)' },
              ]
            },
            price: {
              create: {
                tenantId: tenant.id,
                currency: 'EUR',
                deltaMinor: 200n,
              }
            }
          },
          {
            tenantId: tenant.id,
            code: 'extra-meat',
            displayOrder: 4,
            isDefault: false,
            isActive: true,
            translations: {
              create: [
                { tenantId: tenant.id, locale: 'en-US', name: 'Extra Meat (+€4)' },
                { tenantId: tenant.id, locale: 'fr-FR', name: 'Viande Supplémentaire (+4€)' },
                { tenantId: tenant.id, locale: 'ar-DZ', name: 'لحم إضافي (+٤€)' },
              ]
            },
            price: {
              create: {
                tenantId: tenant.id,
                currency: 'EUR',
                deltaMinor: 400n,
              }
            }
          },
        ]
      }
    }
  });
  console.log(`  ✓ Option Group: Extra Sides (Harissa, Bread, Vegetables, Meat)`);

  // Drink Size Option Group
  const drinkSizeGroup = await prisma.optionGroup.create({
    data: {
      tenantId: tenant.id,
      menuId: menu.id,
      code: 'drink-size',
      selectionMode: 'single',
      minSelect: 1,
      maxSelect: 1,
      isRequired: true,
      displayOrder: 4,
      isActive: true,
      translations: {
        create: [
          { tenantId: tenant.id, locale: 'en-US', name: 'Size', description: 'Choose your drink size' },
          { tenantId: tenant.id, locale: 'fr-FR', name: 'Taille', description: 'Choisissez la taille' },
          { tenantId: tenant.id, locale: 'ar-DZ', name: 'الحجم', description: 'اختر الحجم' },
        ]
      },
      options: {
        create: [
          {
            tenantId: tenant.id,
            code: 'small',
            displayOrder: 1,
            isDefault: false,
            isActive: true,
            translations: {
              create: [
                { tenantId: tenant.id, locale: 'en-US', name: 'Small' },
                { tenantId: tenant.id, locale: 'fr-FR', name: 'Petit' },
                { tenantId: tenant.id, locale: 'ar-DZ', name: 'صغير' },
              ]
            }
          },
          {
            tenantId: tenant.id,
            code: 'medium-drink',
            displayOrder: 2,
            isDefault: true,
            isActive: true,
            translations: {
              create: [
                { tenantId: tenant.id, locale: 'en-US', name: 'Medium' },
                { tenantId: tenant.id, locale: 'fr-FR', name: 'Moyen' },
                { tenantId: tenant.id, locale: 'ar-DZ', name: 'متوسط' },
              ]
            }
          },
          {
            tenantId: tenant.id,
            code: 'large-drink',
            displayOrder: 3,
            isDefault: false,
            isActive: true,
            translations: {
              create: [
                { tenantId: tenant.id, locale: 'en-US', name: 'Large (+€1)' },
                { tenantId: tenant.id, locale: 'fr-FR', name: 'Grand (+1€)' },
                { tenantId: tenant.id, locale: 'ar-DZ', name: 'كبير (+١€)' },
              ]
            },
            price: {
              create: {
                tenantId: tenant.id,
                currency: 'EUR',
                deltaMinor: 100n,
              }
            }
          },
        ]
      }
    }
  });
  console.log(`  ✓ Option Group: Drink Size (Small, Medium, Large)`);

  // ============================================
  // CREATE SECTIONS
  // ============================================
  console.log('\n📑 Creating sections...');
  const sectionsData = [
    { order: 1, titles: { 'en-US': 'Starters', 'fr-FR': 'Entrées', 'ar-DZ': 'مقبلات' } },
    { order: 2, titles: { 'en-US': 'Couscous', 'fr-FR': 'Couscous', 'ar-DZ': 'كسكس' } },
    { order: 3, titles: { 'en-US': 'Tagines', 'fr-FR': 'Tajines', 'ar-DZ': 'طواجن' } },
    { order: 4, titles: { 'en-US': 'Grilled Meats', 'fr-FR': 'Grillades', 'ar-DZ': 'مشويات' } },
    { order: 5, titles: { 'en-US': 'Desserts', 'fr-FR': 'Desserts', 'ar-DZ': 'حلويات' } },
    { order: 6, titles: { 'en-US': 'Beverages', 'fr-FR': 'Boissons', 'ar-DZ': 'مشروبات' } },
  ];

  const sections: Array<{ id: string; key: string }> = [];
  for (const s of sectionsData) {
    const section = await prisma.section.create({
      data: {
        tenantId: tenant.id,
        isActive: true,
        translations: {
          create: Object.entries(s.titles).map(([locale, title]) => ({ tenantId: tenant.id, locale, title }))
        }
      }
    });
    
    // Create MenuLine for section
    await prisma.menuLine.create({
      data: {
        tenantId: tenant.id,
        menuId: menu.id,
        lineType: 'section',
        sectionId: section.id,
        displayOrder: s.order,
        isEnabled: true,
      }
    });
    
    sections.push({ id: section.id, key: s.titles['en-US'].toLowerCase().replace(' ', '-') });
    console.log(`  ✓ Section: ${s.titles['en-US']}`);
  }

  const getSection = (name: string) => {
    const mapping: Record<string, number> = {
      'starters': 0, 'couscous': 1, 'tagines': 2, 'grilled-meats': 3, 'desserts': 4, 'beverages': 5
    };
    return sections[mapping[name]];
  };

  // ============================================
  // CREATE MENU ITEMS WITH INGREDIENTS
  // ============================================
  console.log('\n🍽️ Creating menu items with ingredients...');

  interface ItemData {
    section: string;
    slug: string;
    price: number;
    calories: number;
    names: Record<string, string>;
    descriptions: Record<string, string>;
    allergens: string[];
    dietaryFlags: string[];
    spiciness?: number;
    ingredients: string[];
    optionGroups: string[];
  }

  const items: ItemData[] = [
    // ===== STARTERS =====
    {
      section: 'starters',
      slug: 'chorba-frik',
      price: 7.50,
      calories: 280,
      names: { 'en-US': 'Chorba Frik', 'fr-FR': 'Chorba Frik', 'ar-DZ': 'شوربة فريك' },
      descriptions: { 
        'en-US': 'Traditional Algerian soup with freekeh, lamb, chickpeas, and fresh herbs',
        'fr-FR': 'Soupe algérienne traditionnelle au frik, agneau, pois chiches et herbes fraîches',
        'ar-DZ': 'شوربة جزائرية تقليدية بالفريك واللحم والحمص والأعشاب'
      },
      allergens: ['gluten'],
      dietaryFlags: [],
      ingredients: ['Lamb', 'Frik (Freekeh)', 'Chickpeas', 'Tomatoes', 'Onions', 'Fresh Parsley', 'Fresh Mint', 'Cumin', 'Coriander'],
      optionGroups: ['spice-level'],
    },
    {
      section: 'starters',
      slug: 'bourak',
      price: 8.00,
      calories: 320,
      names: { 'en-US': 'Bourak', 'fr-FR': 'Bourak', 'ar-DZ': 'بوراك' },
      descriptions: { 
        'en-US': 'Crispy phyllo pastry rolls filled with spiced meat and herbs',
        'fr-FR': 'Rouleaux croustillants de pâte filo farcis de viande épicée et herbes',
        'ar-DZ': 'رقائق بريك مقرمشة محشوة باللحم المتبل والأعشاب'
      },
      allergens: ['gluten', 'eggs'],
      dietaryFlags: [],
      ingredients: ['Phyllo Pastry', 'Beef', 'Onions', 'Fresh Parsley', 'Eggs', 'Cumin', 'Coriander'],
      optionGroups: [],
    },
    {
      section: 'starters',
      slug: 'hmiss',
      price: 6.50,
      calories: 180,
      names: { 'en-US': 'Hmiss', 'fr-FR': 'Hmiss', 'ar-DZ': 'حميص' },
      descriptions: { 
        'en-US': 'Roasted pepper and tomato salad with garlic and olive oil',
        'fr-FR': 'Salade de poivrons et tomates grillés à l\'ail et huile d\'olive',
        'ar-DZ': 'سلطة الفلفل والطماطم المشوية بالثوم وزيت الزيتون'
      },
      allergens: [],
      dietaryFlags: ['vegetarian', 'vegan', 'gluten-free'],
      ingredients: ['Bell Peppers', 'Tomatoes', 'Garlic', 'Olive Oil', 'Cumin'],
      optionGroups: ['spice-level'],
    },
    {
      section: 'starters',
      slug: 'zaalouk',
      price: 6.00,
      calories: 160,
      names: { 'en-US': 'Zaalouk', 'fr-FR': 'Zaalouk', 'ar-DZ': 'زعلوك' },
      descriptions: { 
        'en-US': 'Smoky eggplant and tomato dip with cumin and paprika',
        'fr-FR': 'Caviar d\'aubergines fumé aux tomates, cumin et paprika',
        'ar-DZ': 'سلطة الباذنجان المدخن بالطماطم والكمون'
      },
      allergens: [],
      dietaryFlags: ['vegetarian', 'vegan', 'gluten-free'],
      ingredients: ['Eggplant', 'Tomatoes', 'Garlic', 'Olive Oil', 'Cumin', 'Fresh Parsley'],
      optionGroups: [],
    },

    // ===== COUSCOUS =====
    {
      section: 'couscous',
      slug: 'couscous-royal',
      price: 22.00,
      calories: 850,
      names: { 'en-US': 'Couscous Royal', 'fr-FR': 'Couscous Royal', 'ar-DZ': 'كسكس ملكي' },
      descriptions: { 
        'en-US': 'The king of couscous! Lamb, chicken, and merguez with seven vegetables',
        'fr-FR': 'Le roi des couscous! Agneau, poulet et merguez aux sept légumes',
        'ar-DZ': 'ملك الكسكس! لحم غنم ودجاج ومرقاز بسبع خضروات'
      },
      allergens: ['gluten'],
      dietaryFlags: [],
      spiciness: 2,
      ingredients: ['Couscous Semolina', 'Lamb', 'Chicken', 'Merguez Sausage', 'Chickpeas', 'Carrots', 'Turnips', 'Zucchini', 'Potatoes', 'Onions', 'Tomatoes', 'Ras el Hanout', 'Harissa'],
      optionGroups: ['portion-size', 'spice-level', 'extra-sides'],
    },
    {
      section: 'couscous',
      slug: 'couscous-agneau',
      price: 18.00,
      calories: 720,
      names: { 'en-US': 'Couscous with Lamb', 'fr-FR': 'Couscous à l\'Agneau', 'ar-DZ': 'كسكس بالغنم' },
      descriptions: { 
        'en-US': 'Tender lamb shoulder with seasonal vegetables and fluffy couscous',
        'fr-FR': 'Épaule d\'agneau tendre avec légumes de saison et semoule légère',
        'ar-DZ': 'كتف غنم طري مع خضروات موسمية وسميد خفيف'
      },
      allergens: ['gluten'],
      dietaryFlags: [],
      ingredients: ['Couscous Semolina', 'Lamb', 'Chickpeas', 'Carrots', 'Turnips', 'Zucchini', 'Onions', 'Ras el Hanout', 'Butter'],
      optionGroups: ['portion-size', 'spice-level', 'extra-sides'],
    },
    {
      section: 'couscous',
      slug: 'couscous-poulet',
      price: 16.00,
      calories: 650,
      names: { 'en-US': 'Couscous with Chicken', 'fr-FR': 'Couscous au Poulet', 'ar-DZ': 'كسكس بالدجاج' },
      descriptions: { 
        'en-US': 'Free-range chicken with vegetables and aromatic broth',
        'fr-FR': 'Poulet fermier avec légumes et bouillon aromatique',
        'ar-DZ': 'دجاج بلدي مع خضروات ومرق عطري'
      },
      allergens: ['gluten'],
      dietaryFlags: [],
      ingredients: ['Couscous Semolina', 'Chicken', 'Chickpeas', 'Carrots', 'Zucchini', 'Potatoes', 'Onions', 'Ras el Hanout', 'Butter'],
      optionGroups: ['portion-size', 'spice-level', 'extra-sides'],
    },
    {
      section: 'couscous',
      slug: 'couscous-vegetarien',
      price: 14.00,
      calories: 520,
      names: { 'en-US': 'Vegetarian Couscous', 'fr-FR': 'Couscous Végétarien', 'ar-DZ': 'كسكس نباتي' },
      descriptions: { 
        'en-US': 'Seven seasonal vegetables with chickpeas and aromatic spices',
        'fr-FR': 'Sept légumes de saison aux pois chiches et épices aromatiques',
        'ar-DZ': 'سبع خضروات موسمية مع الحمص والتوابل العطرية'
      },
      allergens: ['gluten'],
      dietaryFlags: ['vegetarian', 'vegan'],
      ingredients: ['Couscous Semolina', 'Chickpeas', 'Carrots', 'Turnips', 'Zucchini', 'Potatoes', 'Onions', 'Tomatoes', 'Ras el Hanout', 'Olive Oil'],
      optionGroups: ['portion-size', 'spice-level', 'extra-sides'],
    },

    // ===== TAGINES =====
    {
      section: 'tagines',
      slug: 'tagine-zitoune',
      price: 17.00,
      calories: 580,
      names: { 'en-US': 'Tagine Zitoune', 'fr-FR': 'Tajine Zitoune', 'ar-DZ': 'طاجين الزيتون' },
      descriptions: { 
        'en-US': 'Chicken tagine with green olives and preserved lemons',
        'fr-FR': 'Tajine de poulet aux olives vertes et citrons confits',
        'ar-DZ': 'طاجين دجاج بالزيتون الأخضر والليمون المخلل'
      },
      allergens: [],
      dietaryFlags: ['gluten-free'],
      ingredients: ['Chicken', 'Olives', 'Preserved Lemons', 'Onions', 'Saffron', 'Garlic', 'Fresh Parsley', 'Olive Oil'],
      optionGroups: ['portion-size', 'extra-sides'],
    },
    {
      section: 'tagines',
      slug: 'tagine-barkouk',
      price: 19.00,
      calories: 620,
      names: { 'en-US': 'Tagine Barkouk', 'fr-FR': 'Tajine aux Pruneaux', 'ar-DZ': 'طاجين البرقوق' },
      descriptions: { 
        'en-US': 'Lamb tagine with prunes, almonds, and honey - sweet and savory',
        'fr-FR': 'Tajine d\'agneau aux pruneaux, amandes et miel - sucré-salé',
        'ar-DZ': 'طاجين لحم غنم بالبرقوق واللوز والعسل'
      },
      allergens: ['nuts'],
      dietaryFlags: ['gluten-free'],
      ingredients: ['Lamb', 'Prunes', 'Almonds', 'Honey', 'Onions', 'Cinnamon', 'Saffron', 'Butter'],
      optionGroups: ['portion-size'],
    },
    {
      section: 'tagines',
      slug: 'tagine-kefta',
      price: 15.00,
      calories: 550,
      names: { 'en-US': 'Tagine Kefta', 'fr-FR': 'Tajine Kefta', 'ar-DZ': 'طاجين كفتة' },
      descriptions: { 
        'en-US': 'Spiced meatballs in tomato sauce with eggs',
        'fr-FR': 'Boulettes épicées en sauce tomate avec œufs',
        'ar-DZ': 'كرات اللحم المتبلة في صلصة الطماطم مع البيض'
      },
      allergens: ['eggs'],
      dietaryFlags: ['gluten-free'],
      spiciness: 2,
      ingredients: ['Beef', 'Eggs', 'Tomatoes', 'Onions', 'Fresh Parsley', 'Cumin', 'Harissa', 'Olive Oil'],
      optionGroups: ['portion-size', 'spice-level', 'extra-sides'],
    },

    // ===== GRILLED MEATS =====
    {
      section: 'grilled-meats',
      slug: 'mechoui',
      price: 24.00,
      calories: 680,
      names: { 'en-US': 'Mechoui', 'fr-FR': 'Méchoui', 'ar-DZ': 'مشوي' },
      descriptions: { 
        'en-US': 'Slow-roasted lamb shoulder, incredibly tender and flavorful',
        'fr-FR': 'Épaule d\'agneau rôtie lentement, incroyablement tendre et savoureuse',
        'ar-DZ': 'كتف غنم مشوي ببطء، طري ولذيذ للغاية'
      },
      allergens: [],
      dietaryFlags: ['gluten-free'],
      ingredients: ['Lamb', 'Garlic', 'Cumin', 'Ras el Hanout', 'Olive Oil', 'Butter'],
      optionGroups: ['portion-size', 'extra-sides'],
    },
    {
      section: 'grilled-meats',
      slug: 'brochettes-mixtes',
      price: 18.00,
      calories: 520,
      names: { 'en-US': 'Mixed Brochettes', 'fr-FR': 'Brochettes Mixtes', 'ar-DZ': 'أسياخ مشكلة' },
      descriptions: { 
        'en-US': 'Lamb, chicken, and beef skewers with grilled vegetables',
        'fr-FR': 'Brochettes d\'agneau, poulet et bœuf avec légumes grillés',
        'ar-DZ': 'أسياخ لحم غنم ودجاج وبقر مع خضروات مشوية'
      },
      allergens: [],
      dietaryFlags: ['gluten-free'],
      ingredients: ['Lamb', 'Chicken', 'Beef', 'Bell Peppers', 'Onions', 'Cumin', 'Fresh Parsley', 'Olive Oil'],
      optionGroups: ['portion-size', 'spice-level', 'extra-sides'],
    },
    {
      section: 'grilled-meats',
      slug: 'merguez-grillees',
      price: 14.00,
      calories: 480,
      names: { 'en-US': 'Grilled Merguez', 'fr-FR': 'Merguez Grillées', 'ar-DZ': 'مرقاز مشوي' },
      descriptions: { 
        'en-US': 'Spicy lamb sausages served with harissa and grilled peppers',
        'fr-FR': 'Saucisses d\'agneau épicées servies avec harissa et poivrons grillés',
        'ar-DZ': 'نقانق لحم غنم حارة مع الهريسة والفلفل المشوي'
      },
      allergens: [],
      dietaryFlags: ['gluten-free'],
      spiciness: 3,
      ingredients: ['Merguez Sausage', 'Bell Peppers', 'Harissa', 'Cumin', 'Olive Oil'],
      optionGroups: ['portion-size', 'spice-level', 'extra-sides'],
    },

    // ===== DESSERTS =====
    {
      section: 'desserts',
      slug: 'makroud',
      price: 6.00,
      calories: 320,
      names: { 'en-US': 'Makroud', 'fr-FR': 'Makroud', 'ar-DZ': 'مقروض' },
      descriptions: { 
        'en-US': 'Diamond-shaped semolina cookies filled with dates and dipped in honey',
        'fr-FR': 'Gâteaux de semoule en losange fourrés aux dattes et trempés au miel',
        'ar-DZ': 'حلوى سميد على شكل معين محشوة بالتمر ومغموسة بالعسل'
      },
      allergens: ['gluten'],
      dietaryFlags: ['vegetarian'],
      ingredients: ['Couscous Semolina', 'Dates', 'Honey', 'Olive Oil', 'Cinnamon'],
      optionGroups: [],
    },
    {
      section: 'desserts',
      slug: 'baklava',
      price: 7.00,
      calories: 380,
      names: { 'en-US': 'Baklava', 'fr-FR': 'Baklava', 'ar-DZ': 'بقلاوة' },
      descriptions: { 
        'en-US': 'Layers of crispy phyllo with almonds and honey syrup',
        'fr-FR': 'Couches de pâte filo croustillante aux amandes et sirop de miel',
        'ar-DZ': 'طبقات من العجين المقرمش باللوز وشراب العسل'
      },
      allergens: ['gluten', 'nuts'],
      dietaryFlags: ['vegetarian'],
      ingredients: ['Phyllo Pastry', 'Almonds', 'Honey', 'Butter', 'Cinnamon'],
      optionGroups: [],
    },
    {
      section: 'desserts',
      slug: 'kalb-el-louz',
      price: 5.50,
      calories: 290,
      names: { 'en-US': 'Kalb El Louz', 'fr-FR': 'Kalb El Louz', 'ar-DZ': 'قلب اللوز' },
      descriptions: { 
        'en-US': 'Heart of almond - moist semolina cake soaked in orange blossom syrup',
        'fr-FR': 'Cœur d\'amande - gâteau de semoule moelleux au sirop de fleur d\'oranger',
        'ar-DZ': 'قلب اللوز - كعكة سميد رطبة بشراب ماء الزهر'
      },
      allergens: ['gluten', 'nuts', 'eggs'],
      dietaryFlags: ['vegetarian'],
      ingredients: ['Couscous Semolina', 'Almonds', 'Eggs', 'Honey', 'Butter'],
      optionGroups: [],
    },

    // ===== BEVERAGES =====
    {
      section: 'beverages',
      slug: 'the-menthe',
      price: 3.50,
      calories: 50,
      names: { 'en-US': 'Mint Tea', 'fr-FR': 'Thé à la Menthe', 'ar-DZ': 'شاي بالنعناع' },
      descriptions: { 
        'en-US': 'Traditional Maghrebi green tea with fresh mint and sugar',
        'fr-FR': 'Thé vert maghrébin traditionnel à la menthe fraîche et sucré',
        'ar-DZ': 'شاي أخضر مغاربي تقليدي بالنعناع الطازج والسكر'
      },
      allergens: [],
      dietaryFlags: ['vegan', 'gluten-free'],
      ingredients: ['Fresh Mint'],
      optionGroups: ['drink-size'],
    },
    {
      section: 'beverages',
      slug: 'cafe-turc',
      price: 3.00,
      calories: 10,
      names: { 'en-US': 'Turkish Coffee', 'fr-FR': 'Café Turc', 'ar-DZ': 'قهوة تركية' },
      descriptions: { 
        'en-US': 'Strong, unfiltered coffee brewed in a cezve',
        'fr-FR': 'Café fort non filtré préparé dans un cezve',
        'ar-DZ': 'قهوة قوية غير مصفاة محضرة في ركوة'
      },
      allergens: [],
      dietaryFlags: ['vegan', 'gluten-free'],
      ingredients: [],
      optionGroups: [],
    },
    {
      section: 'beverages',
      slug: 'citronnade',
      price: 4.00,
      calories: 80,
      names: { 'en-US': 'Fresh Lemonade', 'fr-FR': 'Citronnade Fraîche', 'ar-DZ': 'عصير ليمون طازج' },
      descriptions: { 
        'en-US': 'Fresh squeezed lemon with a touch of orange blossom water',
        'fr-FR': 'Citron frais pressé avec une touche de fleur d\'oranger',
        'ar-DZ': 'ليمون معصور طازج مع لمسة من ماء الزهر'
      },
      allergens: [],
      dietaryFlags: ['vegan', 'gluten-free'],
      ingredients: [],
      optionGroups: ['drink-size'],
    },
    {
      section: 'beverages',
      slug: 'jus-dattes',
      price: 5.00,
      calories: 180,
      names: { 'en-US': 'Date Smoothie', 'fr-FR': 'Smoothie aux Dattes', 'ar-DZ': 'عصير التمر' },
      descriptions: { 
        'en-US': 'Creamy date smoothie with almonds and cinnamon',
        'fr-FR': 'Smoothie crémeux aux dattes, amandes et cannelle',
        'ar-DZ': 'سموذي التمر الكريمي باللوز والقرفة'
      },
      allergens: ['nuts', 'milk'],
      dietaryFlags: ['vegetarian', 'gluten-free'],
      ingredients: ['Dates', 'Almonds'],
      optionGroups: ['drink-size'],
    },
  ];

  // Get section menu lines for parenting items
  const sectionLines = await prisma.menuLine.findMany({
    where: { menuId: menu.id, lineType: 'section' },
    include: { section: true }
  });

  const getSectionLine = (sectionId: string) => sectionLines.find(l => l.sectionId === sectionId);

  let itemCount = 0;
  for (const item of items) {
    const section = getSection(item.section);
    if (!section) {
      console.log(`  ⚠️ Skipping ${item.names['en-US']} - section not found: ${item.section}`);
      continue;
    }

    // Create the item entity
    const createdItem = await prisma.item.create({
      data: {
        tenantId: tenant.id,
        sectionId: section.id,
        sku: item.slug,
        calories: item.calories,
        spicinessLevel: item.spiciness || null,
        isVisible: true,
        translations: {
          create: Object.entries(item.names).map(([locale, name]) => ({
            tenantId: tenant.id,
            locale,
            name,
            description: item.descriptions[locale as keyof typeof item.descriptions] || '',
          }))
        },
        priceBase: {
          create: {
            tenantId: tenant.id,
            currency: 'EUR',
            amountMinor: BigInt(Math.round(item.price * 100)),
          }
        },
        allergens: {
          create: item.allergens.map(code => {
            const allergen = getAllergen(code);
            return allergen ? { tenantId: tenant.id, allergenCode: allergen.code } : null;
          }).filter(Boolean) as { tenantId: string; allergenCode: string }[]
        },
        dietaryFlags: {
          create: item.dietaryFlags.map(code => {
            const flag = getDietaryFlag(code);
            return flag ? { tenantId: tenant.id, dietaryFlagCode: flag.code } : null;
          }).filter(Boolean) as { tenantId: string; dietaryFlagCode: string }[]
        }
      }
    });

    // Add Ingredients
    for (const ingName of item.ingredients) {
      const ingredientId = ingredients[ingName];
      if (ingredientId) {
        await prisma.itemIngredient.create({
          data: {
            tenantId: tenant.id,
            itemId: createdItem.id,
            ingredientId: ingredientId,
          }
        });
      }
    }

    // Link Option Groups
    for (let i = 0; i < item.optionGroups.length; i++) {
      const groupCode = item.optionGroups[i];
      let groupId: string | null = null;
      
      if (groupCode === 'portion-size') groupId = portionSizeGroup.id;
      else if (groupCode === 'spice-level') groupId = spiceLevelGroup.id;
      else if (groupCode === 'extra-sides') groupId = extraSidesGroup.id;
      else if (groupCode === 'drink-size') groupId = drinkSizeGroup.id;
      
      if (groupId) {
        await prisma.itemOptionGroup.create({
          data: {
            tenantId: tenant.id,
            itemId: createdItem.id,
            optionGroupId: groupId,
            displayOrder: i + 1,
          }
        });
      }
    }
    
    // Create MenuLine for item under section
    const sectionLine = getSectionLine(section.id);
    await prisma.menuLine.create({
      data: {
        tenantId: tenant.id,
        menuId: menu.id,
        lineType: 'item',
        itemId: createdItem.id,
        parentLineId: sectionLine?.id,
        displayOrder: itemCount + 1,
        isEnabled: true,
      }
    });
    
    itemCount++;
    const ingCount = item.ingredients.length;
    const optCount = item.optionGroups.length;
    console.log(`  ✓ ${item.names['en-US']} - €${item.price.toFixed(2)} (${ingCount} ingredients, ${optCount} options)`);
  }

  console.log(`\n✅ Algerian restaurant created successfully!`);
  console.log(`\n📊 Summary:`);
  console.log(`   - 1 Tenant: ${tenant.name}`);
  console.log(`   - 1 Brand: Dar El Baraka`);
  console.log(`   - 2 Locations: Paris Belleville, Alger Centre`);
  console.log(`   - 1 Menu: Main Menu (published)`);
  console.log(`   - ${sections.length} Sections`);
  console.log(`   - ${itemCount} Menu Items`);
  console.log(`   - ${Object.keys(ingredients).length} Ingredients`);
  console.log(`   - 4 Option Groups`);
  console.log(`\n🔑 Login credentials:`);
  console.log(`   Email: admin@dar-el-baraka.com`);
  console.log(`   Password: baraka123`);
  console.log(`\n🌐 Access the admin at: http://localhost:3001/t/dar-el-baraka/admin`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
