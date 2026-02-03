import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import bcrypt from 'bcryptjs';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:admin@localhost:5432/restaurant_menu';
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding super admin user...');

  const passwordHash = await bcrypt.hash('admin123', 10);

  const superAdmin = await prisma.platformAdmin.upsert({
    where: { email: 'admin@menuai.com' },
    update: {},
    create: {
      email: 'admin@menuai.com',
      username: 'superadmin',
      displayName: 'Super Admin',
      passwordHash,
      role: 'super_admin',
      isActive: true,
    },
  });

  console.log('✅ Super admin created:');
  console.log(`   Email: ${superAdmin.email}`);
  console.log(`   Username: ${superAdmin.username}`);
  console.log(`   Role: ${superAdmin.role}`);
  console.log(`   Password: admin123`);
  console.log('');
  console.log('🔐 Login at: /platform/login');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
