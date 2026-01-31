import path from 'node:path';
import { defineConfig } from 'prisma/config';

// Hard-coded database URL for migration - this is the same as in .env
// Prisma 7 requires datasource.url in config for migrations
const DATABASE_URL = 'postgresql://postgres:admin@localhost:5432/restaurant_menu';

export default defineConfig({
  earlyAccess: true,
  schema: path.join(import.meta.dirname, 'prisma', 'schema.prisma'),
  
  datasource: {
    url: DATABASE_URL,
  },
  
  migrate: {
    async adapter() {
      const { PrismaPg } = await import('@prisma/adapter-pg');
      const pg = await import('pg');
      
      const pool = new pg.default.Pool({
        connectionString: DATABASE_URL,
      });
      
      return new PrismaPg(pool);
    },
  },
});
