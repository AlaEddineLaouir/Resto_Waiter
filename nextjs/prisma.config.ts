import path from 'node:path';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: path.join(import.meta.dirname, 'prisma', 'schema.prisma'),
  datasource: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:admin@localhost:5432/restaurant_menu',
  },
  migrate: {
    async adapter() {
      const { PrismaPg } = await import('@prisma/adapter-pg');
      const { Pool } = await import('pg');
      const url = process.env.DATABASE_URL || 'postgresql://postgres:admin@localhost:5432/restaurant_menu';
      const pool = new Pool({ connectionString: url });
      return new PrismaPg(pool);
    },
  },
});
