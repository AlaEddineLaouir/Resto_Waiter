import { PrismaClient } from '@prisma/client';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const ingredientCount = await prisma.itemIngredient.count();
  console.log('Total ItemIngredient records:', ingredientCount);
  
  const ingredients = await prisma.itemIngredient.findMany({
    take: 10,
    include: {
      item: { include: { translations: true } },
      ingredient: true,
    }
  });
  
  console.log('\nSample ItemIngredients:');
  for (const ii of ingredients) {
    const itemName = ii.item.translations[0]?.name || ii.item.sku;
    console.log(`- Item: "${itemName}" has ingredient: "${ii.ingredient.name}"`);
  }
  
  // Also check what gets returned from executeGetMenu
  const menus = await prisma.menu.findMany({
    where: { 
      status: 'published',
    },
    include: {
      lines: {
        where: { isEnabled: true },
        include: {
          item: {
            include: {
              ingredients: {
                include: { ingredient: true },
              },
            },
          },
        },
      },
    },
  });
  
  console.log('\n\nPublished menus:', menus.length);
  for (const menu of menus) {
    console.log(`Menu ${menu.code}: ${menu.lines.length} lines`);
    for (const line of menu.lines) {
      if (line.item) {
        console.log(`  Item has ${line.item.ingredients?.length || 0} ingredients`);
      }
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
