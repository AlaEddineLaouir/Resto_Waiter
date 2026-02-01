import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:admin@localhost:5432/restaurant_menu';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const locs = await prisma.location.findMany({ 
  include: { 
    tenant: { select: { slug: true } }
  } 
});

console.log('Available location URLs:');
locs.forEach(l => console.log(`  /t/${l.tenant.slug}/l/${l.slug}`));

await prisma.$disconnect();
