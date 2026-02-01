import { config } from 'dotenv';
config({ path: '.env.local' });

import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // Check sections for dar-el-baraka
  const tenant = await prisma.tenant.findUnique({
    where: { slug: 'dar-el-baraka' },
  });
  
  if (!tenant) {
    console.log('Tenant not found');
    return;
  }
  
  console.log('Tenant:', tenant.name);
  
  // Check menu lines with parent relationships
  const menus = await prisma.menu.findMany({
    where: { tenantId: tenant.id, status: 'published' },
    include: {
      lines: {
        include: {
          section: { include: { translations: true } },
          item: { include: { translations: true } },
          parentLine: true,
        },
      },
    },
  });
  
  console.log('\nMenu Lines:');
  for (const menu of menus) {
    console.log(`  Menu: ${menu.code}`);
    for (const line of menu.lines) {
      if (line.lineType === 'section') {
        const title = line.section?.translations[0]?.title || 'Unknown';
        console.log(`    [Section] ${title} - lineId=${line.id}, isEnabled=${line.isEnabled}`);
      } else if (line.lineType === 'item') {
        const name = line.item?.translations[0]?.name || 'Unknown';
        console.log(`      [Item] ${name} - isEnabled=${line.isEnabled}, parentLineId=${line.parentLineId}, parentEnabled=${line.parentLine?.isEnabled}`);
      }
    }
  }
  
  // Check specifically for Zaalouk
  const zaalouk = await prisma.item.findFirst({
    where: {
      tenantId: tenant.id,
      translations: { some: { name: { contains: 'Zaalouk' } } },
    },
    include: {
      translations: true,
      menuLines: {
        include: {
          menu: true,
          parentLine: { include: { section: { include: { translations: true } } } },
        },
      },
    },
  });
  
  if (zaalouk) {
    console.log('\nZaalouk item:');
    console.log('  isVisible:', zaalouk.isVisible);
    for (const ml of zaalouk.menuLines) {
      console.log('  MenuLine:', ml.id);
      console.log('    isEnabled:', ml.isEnabled);
      console.log('    menu status:', ml.menu.status);
      console.log('    parentLine:', ml.parentLine?.id);
      console.log('    parentLine isEnabled:', ml.parentLine?.isEnabled);
      console.log('    parentLine section:', ml.parentLine?.section?.translations[0]?.title);
    }
  }
}

main()
  .finally(() => prisma.$disconnect());
