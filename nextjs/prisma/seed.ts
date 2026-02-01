/**
 * Prisma Seed Script
 * 
 * Seeds the database with:
 * - EU-mandated 14 allergens with translations
 * - Common dietary flags with translations
 */

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:admin@localhost:5432/restaurant_menu';
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// EU 14 mandatory allergens (Regulation (EU) No 1169/2011)
const allergens = [
  { code: 'gluten', translations: { 'en-US': 'Gluten', 'fr-FR': 'Gluten', 'de-DE': 'Gluten', 'nl-NL': 'Gluten' } },
  { code: 'crustaceans', translations: { 'en-US': 'Crustaceans', 'fr-FR': 'Crustacés', 'de-DE': 'Krebstiere', 'nl-NL': 'Schaaldieren' } },
  { code: 'eggs', translations: { 'en-US': 'Eggs', 'fr-FR': 'Œufs', 'de-DE': 'Eier', 'nl-NL': 'Eieren' } },
  { code: 'fish', translations: { 'en-US': 'Fish', 'fr-FR': 'Poisson', 'de-DE': 'Fisch', 'nl-NL': 'Vis' } },
  { code: 'peanuts', translations: { 'en-US': 'Peanuts', 'fr-FR': 'Arachides', 'de-DE': 'Erdnüsse', 'nl-NL': 'Pinda\'s' } },
  { code: 'soybeans', translations: { 'en-US': 'Soybeans', 'fr-FR': 'Soja', 'de-DE': 'Sojabohnen', 'nl-NL': 'Soja' } },
  { code: 'milk', translations: { 'en-US': 'Milk', 'fr-FR': 'Lait', 'de-DE': 'Milch', 'nl-NL': 'Melk' } },
  { code: 'nuts', translations: { 'en-US': 'Tree Nuts', 'fr-FR': 'Fruits à coque', 'de-DE': 'Schalenfrüchte', 'nl-NL': 'Noten' } },
  { code: 'celery', translations: { 'en-US': 'Celery', 'fr-FR': 'Céleri', 'de-DE': 'Sellerie', 'nl-NL': 'Selderij' } },
  { code: 'mustard', translations: { 'en-US': 'Mustard', 'fr-FR': 'Moutarde', 'de-DE': 'Senf', 'nl-NL': 'Mosterd' } },
  { code: 'sesame', translations: { 'en-US': 'Sesame seeds', 'fr-FR': 'Graines de sésame', 'de-DE': 'Sesamsamen', 'nl-NL': 'Sesamzaad' } },
  { code: 'sulphites', translations: { 'en-US': 'Sulphites', 'fr-FR': 'Sulfites', 'de-DE': 'Sulfite', 'nl-NL': 'Sulfieten' } },
  { code: 'lupin', translations: { 'en-US': 'Lupin', 'fr-FR': 'Lupin', 'de-DE': 'Lupinen', 'nl-NL': 'Lupine' } },
  { code: 'molluscs', translations: { 'en-US': 'Molluscs', 'fr-FR': 'Mollusques', 'de-DE': 'Weichtiere', 'nl-NL': 'Weekdieren' } },
];

// Common dietary flags (name only - schema doesn't have description)
const dietaryFlags = [
  { 
    code: 'vegetarian', 
    translations: { 
      'en-US': 'Vegetarian',
      'fr-FR': 'Végétarien',
      'de-DE': 'Vegetarisch',
      'nl-NL': 'Vegetarisch',
    }
  },
  { 
    code: 'vegan', 
    translations: { 
      'en-US': 'Vegan',
      'fr-FR': 'Végan',
      'de-DE': 'Vegan',
      'nl-NL': 'Veganistisch',
    }
  },
  { 
    code: 'halal', 
    translations: { 
      'en-US': 'Halal',
      'fr-FR': 'Halal',
      'de-DE': 'Halal',
      'nl-NL': 'Halal',
    }
  },
  { 
    code: 'kosher', 
    translations: { 
      'en-US': 'Kosher',
      'fr-FR': 'Casher',
      'de-DE': 'Koscher',
      'nl-NL': 'Koosjer',
    }
  },
  { 
    code: 'gluten-free', 
    translations: { 
      'en-US': 'Gluten-Free',
      'fr-FR': 'Sans gluten',
      'de-DE': 'Glutenfrei',
      'nl-NL': 'Glutenvrij',
    }
  },
  { 
    code: 'dairy-free', 
    translations: { 
      'en-US': 'Dairy-Free',
      'fr-FR': 'Sans produits laitiers',
      'de-DE': 'Laktosefrei',
      'nl-NL': 'Zuivelvrij',
    }
  },
  { 
    code: 'keto', 
    translations: { 
      'en-US': 'Keto-Friendly',
      'fr-FR': 'Compatible Keto',
      'de-DE': 'Keto-freundlich',
      'nl-NL': 'Keto-vriendelijk',
    }
  },
  { 
    code: 'low-sodium', 
    translations: { 
      'en-US': 'Low Sodium',
      'fr-FR': 'Faible en sodium',
      'de-DE': 'Natriumarm',
      'nl-NL': 'Natriumarm',
    }
  },
];

async function main() {
  console.log('🌱 Starting database seed...\n');

  // Seed allergens
  console.log('📦 Seeding EU allergens...');
  for (const allergen of allergens) {
    const created = await prisma.allergen.upsert({
      where: { code: allergen.code },
      update: {},
      create: {
        code: allergen.code,
        translations: {
          create: Object.entries(allergen.translations).map(([locale, name]) => ({
            locale,
            name,
          })),
        },
      },
    });
    console.log(`  ✓ ${allergen.code} (${created.code})`);
  }

  // Seed dietary flags
  console.log('\n🏷️ Seeding dietary flags...');
  for (const flag of dietaryFlags) {
    const created = await prisma.dietaryFlag.upsert({
      where: { code: flag.code },
      update: {},
      create: {
        code: flag.code,
        translations: {
          create: Object.entries(flag.translations).map(([locale, name]) => ({
            locale,
            name,
          })),
        },
      },
    });
    console.log(`  ✓ ${flag.code} (${created.code})`);
  }

  console.log('\n✅ Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
