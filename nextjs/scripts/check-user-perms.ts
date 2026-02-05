import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL!;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const user = await prisma.adminUser.findFirst({
    where: { email: 'mehdi@dar-el-baraka.com' },
    select: { id: true, email: true, role: true, permissions: true }
  });
  
  console.log('User from DB:');
  console.log(JSON.stringify(user, null, 2));
  
  await prisma.$disconnect();
  await pool.end();
}

main();
