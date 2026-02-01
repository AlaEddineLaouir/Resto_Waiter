import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:admin@localhost:5432/restaurant_menu';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function generateSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

async function main() {
  // Get all locations
  const locations = await prisma.location.findMany({
    include: { tenant: true }
  });
  
  console.log('Found', locations.length, 'locations');
  
  for (const loc of locations) {
    console.log(`Location: ${loc.name}, slug: ${loc.slug || '(none)'}`);
    
    // If no slug, generate one
    if (!loc.slug) {
      const baseSlug = generateSlug(loc.name);
      let slug = baseSlug;
      let counter = 1;
      
      // Check for uniqueness within tenant
      while (true) {
        const existing = await prisma.location.findFirst({
          where: {
            tenantId: loc.tenantId,
            slug: slug,
            NOT: { id: loc.id }
          }
        });
        
        if (!existing) break;
        slug = `${baseSlug}-${counter}`;
        counter++;
      }
      
      // Update the location
      await prisma.location.update({
        where: { id: loc.id },
        data: { slug }
      });
      
      console.log(`  -> Updated slug to: ${slug}`);
    }
  }
  
  console.log('\nDone!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
