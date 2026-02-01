/**
 * Seed Demo Restaurant Data
 * 
 * Creates a complete demo restaurant with:
 * - Tenant, Brand, Location
 * - Menu with published version
 * - Sections (Appetizers, Main Courses, Desserts, Beverages)
 * - Menu items with prices, allergens, and dietary flags
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
  console.log('🍽️ Creating demo restaurant data...\n');

  // Get allergens and dietary flags
  const allergens = await prisma.allergen.findMany();
  const dietaryFlags = await prisma.dietaryFlag.findMany();
  
  const getAllergen = (code: string) => allergens.find(a => a.code === code);
  const getDietaryFlag = (code: string) => dietaryFlags.find(d => d.code === code);


  // Check if demo tenant already exists
  const existingTenant = await prisma.tenant.findUnique({
    where: { slug: 'demo-restaurant' }
  });

  if (existingTenant) {
    console.log('⚠️ Demo restaurant already exists. Deleting and recreating...');
    await prisma.tenant.delete({ where: { id: existingTenant.id } });
  }

  // Create Tenant
  console.log('📦 Creating tenant...');
  const tenant = await prisma.tenant.create({
    data: {
      slug: 'demo-restaurant',
      name: 'La Bella Italia',
      defaultLocale: 'en-US',
      isActive: true,
      locales: {
        create: [
          { locale: 'en-US', isDefault: true },
          { locale: 'fr-FR', isDefault: false },
          { locale: 'nl-NL', isDefault: false },
        ]
      }
    }
  });
  console.log(`  ✓ Tenant: ${tenant.name} (${tenant.slug})`);

  // Create Admin User
  console.log('👤 Creating admin user...');
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.adminUser.create({
    data: {
      tenantId: tenant.id,
      username: 'admin',
      email: 'admin@demo-restaurant.com',
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
      name: 'La Bella Italia',
      slug: 'la-bella-italia',
    }
  });
  console.log(`  ✓ Brand: La Bella Italia`);

  // Create Location
  console.log('📍 Creating location...');
  const location = await prisma.location.create({
    data: {
      tenantId: tenant.id,
      brandId: brand.id,
      name: 'Amsterdam City Center',
      addressLine1: 'Damrak 123',
      city: 'Amsterdam',
      countryCode: 'NL',
      postalCode: '1012 LM',
      timezone: 'Europe/Amsterdam',
      isActive: true,
    }
  });
  console.log(`  ✓ Location: Amsterdam City Center`);

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
          { tenantId: tenant.id, locale: 'en-US', name: 'Main Menu', description: 'Our signature dishes and drinks' },
          { tenantId: tenant.id, locale: 'fr-FR', name: 'Menu Principal', description: 'Nos plats et boissons signature' },
          { tenantId: tenant.id, locale: 'nl-NL', name: 'Hoofdmenu', description: 'Onze signature gerechten en dranken' },
        ]
      }
    }
  });
  console.log(`  ✓ Menu: Main Menu (published)`);

  // Create Sections (now standalone entities, linked to version via join table)
  console.log('📑 Creating sections...');
  const sectionsData = [
    { order: 1, titles: { 'en-US': 'Appetizers', 'fr-FR': 'Entrées', 'nl-NL': 'Voorgerechten' } },
    { order: 2, titles: { 'en-US': 'Pasta', 'fr-FR': 'Pâtes', 'nl-NL': 'Pasta' } },
    { order: 3, titles: { 'en-US': 'Pizza', 'fr-FR': 'Pizza', 'nl-NL': 'Pizza' } },
    { order: 4, titles: { 'en-US': 'Main Courses', 'fr-FR': 'Plats Principaux', 'nl-NL': 'Hoofdgerechten' } },
    { order: 5, titles: { 'en-US': 'Desserts', 'fr-FR': 'Desserts', 'nl-NL': 'Desserts' } },
    { order: 6, titles: { 'en-US': 'Beverages', 'fr-FR': 'Boissons', 'nl-NL': 'Dranken' } },
  ];

  const sections: Array<{ id: string; key: string }> = [];
  for (const s of sectionsData) {
    // Create the section entity
    const section = await prisma.section.create({
      data: {
        tenantId: tenant.id,
        isActive: true,
        translations: {
          create: Object.entries(s.titles).map(([locale, title]) => ({ tenantId: tenant.id, locale, title }))
        }
      }
    });
    
    // Link section to menu via join table
    await prisma.menuSection.create({
      data: {
        tenantId: tenant.id,
        menuId: menu.id,
        sectionId: section.id,
        displayOrder: s.order,
      }
    });
    
    sections.push({ id: section.id, key: s.titles['en-US'].toLowerCase().replace(' ', '-') });
    console.log(`  ✓ Section: ${s.titles['en-US']}`);
  }

  const getSection = (name: string) => {
    const mapping: Record<string, number> = {
      'appetizers': 0, 'pasta': 1, 'pizza': 2, 'main-courses': 3, 'desserts': 4, 'beverages': 5
    };
    return sections[mapping[name]];
  };

  // Create Menu Items
  console.log('\n🍽️ Creating menu items...');

  const items = [
    // Appetizers
    {
      section: 'appetizers',
      slug: 'bruschetta',
      price: 8.50,
      calories: 280,
      names: { 'en-US': 'Bruschetta', 'fr-FR': 'Bruschetta', 'nl-NL': 'Bruschetta' },
      descriptions: { 
        'en-US': 'Toasted bread topped with fresh tomatoes, garlic, basil, and olive oil',
        'fr-FR': 'Pain grillé garni de tomates fraîches, ail, basilic et huile d\'olive',
        'nl-NL': 'Geroosterd brood met verse tomaten, knoflook, basilicum en olijfolie'
      },
      allergens: ['gluten'],
      dietaryFlags: ['vegetarian', 'vegan'],
    },
    {
      section: 'appetizers',
      slug: 'caprese-salad',
      price: 12.00,
      calories: 320,
      names: { 'en-US': 'Caprese Salad', 'fr-FR': 'Salade Caprese', 'nl-NL': 'Caprese Salade' },
      descriptions: { 
        'en-US': 'Fresh mozzarella, tomatoes, and basil with balsamic glaze',
        'fr-FR': 'Mozzarella fraîche, tomates et basilic avec glaçage balsamique',
        'nl-NL': 'Verse mozzarella, tomaten en basilicum met balsamico glazuur'
      },
      allergens: ['milk'],
      dietaryFlags: ['vegetarian', 'gluten-free'],
    },
    {
      section: 'appetizers',
      slug: 'calamari-fritti',
      price: 14.50,
      calories: 450,
      names: { 'en-US': 'Calamari Fritti', 'fr-FR': 'Calamars Frits', 'nl-NL': 'Gefrituurde Calamaris' },
      descriptions: { 
        'en-US': 'Crispy fried calamari served with marinara sauce',
        'fr-FR': 'Calamars croustillants servis avec sauce marinara',
        'nl-NL': 'Krokant gefrituurde calamaris met marinara saus'
      },
      allergens: ['gluten', 'molluscs'],
      dietaryFlags: [],
    },
    // Pasta
    {
      section: 'pasta',
      slug: 'spaghetti-carbonara',
      price: 16.50,
      calories: 720,
      names: { 'en-US': 'Spaghetti Carbonara', 'fr-FR': 'Spaghetti Carbonara', 'nl-NL': 'Spaghetti Carbonara' },
      descriptions: { 
        'en-US': 'Classic Roman pasta with egg, pecorino, guanciale, and black pepper',
        'fr-FR': 'Pâtes romaines classiques avec œuf, pecorino, guanciale et poivre noir',
        'nl-NL': 'Klassieke Romeinse pasta met ei, pecorino, guanciale en zwarte peper'
      },
      allergens: ['gluten', 'eggs', 'milk'],
      dietaryFlags: [],
    },
    {
      section: 'pasta',
      slug: 'penne-arrabbiata',
      price: 14.00,
      calories: 580,
      names: { 'en-US': 'Penne Arrabbiata', 'fr-FR': 'Penne Arrabbiata', 'nl-NL': 'Penne Arrabbiata' },
      descriptions: { 
        'en-US': 'Spicy tomato sauce with garlic and red chili peppers',
        'fr-FR': 'Sauce tomate épicée avec ail et piments rouges',
        'nl-NL': 'Pittige tomatensaus met knoflook en rode pepers'
      },
      allergens: ['gluten'],
      dietaryFlags: ['vegetarian', 'vegan'],
      spiciness: 2,
    },
    {
      section: 'pasta',
      slug: 'lasagna-bolognese',
      price: 18.50,
      calories: 890,
      names: { 'en-US': 'Lasagna Bolognese', 'fr-FR': 'Lasagne Bolognaise', 'nl-NL': 'Lasagne Bolognese' },
      descriptions: { 
        'en-US': 'Layers of pasta, rich meat sauce, béchamel, and parmesan',
        'fr-FR': 'Couches de pâtes, sauce à la viande, béchamel et parmesan',
        'nl-NL': 'Lagen pasta, rijke vleessaus, bechamelsaus en parmezaan'
      },
      allergens: ['gluten', 'milk', 'eggs'],
      dietaryFlags: [],
    },
    // Pizza
    {
      section: 'pizza',
      slug: 'margherita',
      price: 14.00,
      calories: 680,
      names: { 'en-US': 'Margherita', 'fr-FR': 'Margherita', 'nl-NL': 'Margherita' },
      descriptions: { 
        'en-US': 'San Marzano tomatoes, fresh mozzarella, basil, and olive oil',
        'fr-FR': 'Tomates San Marzano, mozzarella fraîche, basilic et huile d\'olive',
        'nl-NL': 'San Marzano tomaten, verse mozzarella, basilicum en olijfolie'
      },
      allergens: ['gluten', 'milk'],
      dietaryFlags: ['vegetarian'],
    },
    {
      section: 'pizza',
      slug: 'quattro-formaggi',
      price: 17.00,
      calories: 820,
      names: { 'en-US': 'Quattro Formaggi', 'fr-FR': 'Quatre Fromages', 'nl-NL': 'Quattro Formaggi' },
      descriptions: { 
        'en-US': 'Four cheese pizza with mozzarella, gorgonzola, fontina, and parmesan',
        'fr-FR': 'Pizza quatre fromages avec mozzarella, gorgonzola, fontina et parmesan',
        'nl-NL': 'Vier kazen pizza met mozzarella, gorgonzola, fontina en parmezaan'
      },
      allergens: ['gluten', 'milk'],
      dietaryFlags: ['vegetarian'],
    },
    {
      section: 'pizza',
      slug: 'diavola',
      price: 16.00,
      calories: 750,
      names: { 'en-US': 'Diavola', 'fr-FR': 'Diavola', 'nl-NL': 'Diavola' },
      descriptions: { 
        'en-US': 'Spicy salami, tomato sauce, mozzarella, and chili flakes',
        'fr-FR': 'Salami épicé, sauce tomate, mozzarella et flocons de piment',
        'nl-NL': 'Pittige salami, tomatensaus, mozzarella en chilivlokken'
      },
      allergens: ['gluten', 'milk'],
      dietaryFlags: [],
      spiciness: 3,
    },
    // Main Courses
    {
      section: 'main-courses',
      slug: 'osso-buco',
      price: 28.00,
      calories: 650,
      names: { 'en-US': 'Osso Buco', 'fr-FR': 'Osso Buco', 'nl-NL': 'Osso Buco' },
      descriptions: { 
        'en-US': 'Braised veal shank with vegetables, white wine, and gremolata',
        'fr-FR': 'Jarret de veau braisé avec légumes, vin blanc et gremolata',
        'nl-NL': 'Gestoofde kalfschacht met groenten, witte wijn en gremolata'
      },
      allergens: ['celery'],
      dietaryFlags: ['gluten-free'],
    },
    {
      section: 'main-courses',
      slug: 'saltimbocca',
      price: 24.00,
      calories: 520,
      names: { 'en-US': 'Saltimbocca alla Romana', 'fr-FR': 'Saltimbocca à la Romaine', 'nl-NL': 'Saltimbocca alla Romana' },
      descriptions: { 
        'en-US': 'Veal escalope with prosciutto and sage in white wine sauce',
        'fr-FR': 'Escalope de veau avec prosciutto et sauge en sauce au vin blanc',
        'nl-NL': 'Kalfsoester met prosciutto en salie in witte wijnsaus'
      },
      allergens: [],
      dietaryFlags: ['gluten-free'],
    },
    {
      section: 'main-courses',
      slug: 'grilled-salmon',
      price: 26.00,
      calories: 480,
      names: { 'en-US': 'Grilled Salmon', 'fr-FR': 'Saumon Grillé', 'nl-NL': 'Gegrilde Zalm' },
      descriptions: { 
        'en-US': 'Fresh Atlantic salmon with lemon butter and seasonal vegetables',
        'fr-FR': 'Saumon de l\'Atlantique frais avec beurre citron et légumes de saison',
        'nl-NL': 'Verse Atlantische zalm met citroenboter en seizoensgroenten'
      },
      allergens: ['fish', 'milk'],
      dietaryFlags: ['gluten-free'],
    },
    // Desserts
    {
      section: 'desserts',
      slug: 'tiramisu',
      price: 9.00,
      calories: 420,
      names: { 'en-US': 'Tiramisù', 'fr-FR': 'Tiramisù', 'nl-NL': 'Tiramisù' },
      descriptions: { 
        'en-US': 'Classic Italian dessert with mascarpone, espresso, and cocoa',
        'fr-FR': 'Dessert italien classique avec mascarpone, espresso et cacao',
        'nl-NL': 'Klassiek Italiaans dessert met mascarpone, espresso en cacao'
      },
      allergens: ['gluten', 'eggs', 'milk'],
      dietaryFlags: ['vegetarian'],
    },
    {
      section: 'desserts',
      slug: 'panna-cotta',
      price: 8.00,
      calories: 340,
      names: { 'en-US': 'Panna Cotta', 'fr-FR': 'Panna Cotta', 'nl-NL': 'Panna Cotta' },
      descriptions: { 
        'en-US': 'Creamy vanilla custard with fresh berry compote',
        'fr-FR': 'Crème vanille onctueuse avec compote de fruits rouges',
        'nl-NL': 'Romige vanille custard met verse bessencompote'
      },
      allergens: ['milk'],
      dietaryFlags: ['vegetarian', 'gluten-free'],
    },
    {
      section: 'desserts',
      slug: 'gelato',
      price: 6.50,
      calories: 220,
      names: { 'en-US': 'Gelato (3 scoops)', 'fr-FR': 'Gelato (3 boules)', 'nl-NL': 'Gelato (3 bolletjes)' },
      descriptions: { 
        'en-US': 'Artisanal Italian ice cream - ask for today\'s flavors',
        'fr-FR': 'Glace italienne artisanale - demandez les parfums du jour',
        'nl-NL': 'Ambachtelijk Italiaans ijs - vraag naar de smaken van de dag'
      },
      allergens: ['milk', 'nuts'],
      dietaryFlags: ['vegetarian', 'gluten-free'],
    },
    // Beverages
    {
      section: 'beverages',
      slug: 'espresso',
      price: 3.00,
      calories: 5,
      names: { 'en-US': 'Espresso', 'fr-FR': 'Espresso', 'nl-NL': 'Espresso' },
      descriptions: { 
        'en-US': 'Italian coffee perfection',
        'fr-FR': 'Le café italien par excellence',
        'nl-NL': 'Italiaanse koffie perfectie'
      },
      allergens: [],
      dietaryFlags: ['vegan', 'gluten-free'],
    },
    {
      section: 'beverages',
      slug: 'cappuccino',
      price: 4.50,
      calories: 80,
      names: { 'en-US': 'Cappuccino', 'fr-FR': 'Cappuccino', 'nl-NL': 'Cappuccino' },
      descriptions: { 
        'en-US': 'Espresso with steamed milk and foam',
        'fr-FR': 'Espresso avec lait vapeur et mousse',
        'nl-NL': 'Espresso met gestoomde melk en schuim'
      },
      allergens: ['milk'],
      dietaryFlags: ['vegetarian', 'gluten-free'],
    },
    {
      section: 'beverages',
      slug: 'limonata',
      price: 4.00,
      calories: 120,
      names: { 'en-US': 'Limonata', 'fr-FR': 'Limonade', 'nl-NL': 'Limonata' },
      descriptions: { 
        'en-US': 'Fresh squeezed lemonade with a hint of mint',
        'fr-FR': 'Limonade fraîchement pressée avec une touche de menthe',
        'nl-NL': 'Vers geperste limonade met een vleugje munt'
      },
      allergens: [],
      dietaryFlags: ['vegan', 'gluten-free'],
    },
    {
      section: 'beverages',
      slug: 'house-wine-red',
      price: 7.00,
      calories: 125,
      names: { 'en-US': 'House Red Wine (glass)', 'fr-FR': 'Vin Rouge Maison (verre)', 'nl-NL': 'Huiswijn Rood (glas)' },
      descriptions: { 
        'en-US': 'Montepulciano d\'Abruzzo',
        'fr-FR': 'Montepulciano d\'Abruzzo',
        'nl-NL': 'Montepulciano d\'Abruzzo'
      },
      allergens: ['sulphites'],
      dietaryFlags: ['vegan', 'gluten-free'],
    },
  ];

  let itemCount = 0;
  for (const item of items) {
    const section = getSection(item.section);
    if (!section) {
      console.log(`  ⚠️ Skipping ${item.names['en-US']} - section not found: ${item.section}`);
      continue;
    }

    // Create the item entity (now standalone, linked to version via join table)
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
    
    // Link item to menu via join table
    await prisma.menuItem.create({
      data: {
        tenantId: tenant.id,
        menuId: menu.id,
        sectionId: section.id,
        itemId: createdItem.id,
        displayOrder: itemCount + 1,
      }
    });
    
    itemCount++;
    console.log(`  ✓ ${item.names['en-US']} - €${item.price.toFixed(2)}`);
  }

  console.log(`\n✅ Demo restaurant created successfully!`);
  console.log(`\n📊 Summary:`);
  console.log(`   - 1 Tenant: ${tenant.name}`);
  console.log(`   - 1 Brand: La Bella Italia`);
  console.log(`   - 1 Location: Amsterdam City Center`);
  console.log(`   - 1 Menu: Main Menu (published)`);
  console.log(`   - ${sections.length} Sections`);
  console.log(`   - ${itemCount} Menu Items`);
  console.log(`\n🔑 Login credentials:`);
  console.log(`   Email: admin@demo-restaurant.com`);
  console.log(`   Password: admin123`);
  console.log(`\n🌐 Access the admin at: http://localhost:3000/t/demo-restaurant/admin`);
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
