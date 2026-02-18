import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connStr = (process.env.DATABASE_URL || '').replace(/^["']|["']$/g, '');
const pool = new Pool({ connectionString: connStr });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const tenant = await prisma.tenant.findFirst({ where: { slug: 'demo-restaurant' } });
  console.log('Tenant:', tenant?.id);
  
  const loc = await prisma.location.findFirst({ where: { tenantId: tenant!.id } });
  console.log('Location:', loc?.id, 'slug:', loc?.slug);
  
  const layout = await prisma.floorLayout.findFirst({ where: { tenantId: tenant!.id } });
  console.log('Layout:', layout?.id, 'status:', layout?.status);
  
  const tables = await prisma.floorTable.findMany({ where: { tenantId: tenant!.id } });
  console.log('Tables:', tables.length);
  if (tables.length > 0) {
    tables.forEach(t => console.log(`  - ${t.label} (capacity: ${t.capacity})`));
  }

  // If no layout or tables, create them
  if (!layout && tenant && loc) {
    console.log('\n🏗️ Creating floor layout with tables...');
    const newLayout = await prisma.floorLayout.create({
      data: {
        tenantId: tenant.id,
        locationId: loc.id,
        name: 'Main Floor',
        version: 1,
        status: 'published',
        canvasWidth: 1200,
        canvasHeight: 800,
        gridSize: 20,
        publishedAt: new Date(),
      },
    });
    console.log('  ✓ Layout created:', newLayout.id);

    // Create 10 tables
    for (let i = 1; i <= 10; i++) {
      const table = await prisma.floorTable.create({
        data: {
          tenantId: tenant.id,
          layoutId: newLayout.id,
          label: `T${i}`,
          capacity: i <= 4 ? 2 : i <= 8 ? 4 : 6,
          shape: i <= 6 ? 'round' : 'rectangle',
          x: ((i - 1) % 5) * 150 + 50,
          y: Math.floor((i - 1) / 5) * 200 + 50,
          width: 80,
          height: 80,
          rotation: 0,
          status: 'available',
        },
      });
      console.log(`  ✓ Table ${table.label} (capacity: ${table.capacity})`);
    }
    console.log('\n✅ Floor layout with 10 tables created!');
  } else if (layout && tables.length === 0 && tenant) {
    console.log('\n🏗️ Adding tables to existing layout...');
    for (let i = 1; i <= 10; i++) {
      const table = await prisma.floorTable.create({
        data: {
          tenantId: tenant.id,
          layoutId: layout.id,
          label: `T${i}`,
          capacity: i <= 4 ? 2 : i <= 8 ? 4 : 6,
          shape: i <= 6 ? 'round' : 'rectangle',
          x: ((i - 1) % 5) * 150 + 50,
          y: Math.floor((i - 1) / 5) * 200 + 50,
          width: 80,
          height: 80,
          rotation: 0,
          status: 'available',
        },
      });
      console.log(`  ✓ Table ${table.label}`);
    }
  }

  await prisma.$disconnect();
  pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
