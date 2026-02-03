/**
 * Seed Additional Users for Dar El Baraka Restaurant
 * 
 * Creates multiple users with different roles for testing the permission system.
 * 
 * Usage: npm exec -- dotenv -e .env.local -- tsx prisma/seed-users-baraka.ts
 */

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import bcrypt from 'bcrypt';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:admin@localhost:5432/restaurant_menu';
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

interface UserSeed {
  username: string;
  email: string;
  password: string;
  displayName: string;
  role: string;
}

const USERS_TO_CREATE: UserSeed[] = [
  {
    username: 'manager_karim',
    email: 'karim@dar-el-baraka.com',
    password: 'Manager123!',
    displayName: 'Karim Benali',
    role: 'manager',
  },
  {
    username: 'chef_fatima',
    email: 'fatima@dar-el-baraka.com',
    password: 'Kitchen123!',
    displayName: 'Fatima Cherif',
    role: 'menu_editor',
  },
  {
    username: 'server_youssef',
    email: 'youssef@dar-el-baraka.com',
    password: 'FrontOfHouse123!',
    displayName: 'Youssef Hadj',
    role: 'foh_staff',
  },
  {
    username: 'cook_aicha',
    email: 'aicha@dar-el-baraka.com',
    password: 'Kitchen456!',
    displayName: 'Aicha Boudiaf',
    role: 'kitchen_staff',
  },
  {
    username: 'editor_mehdi',
    email: 'mehdi@dar-el-baraka.com',
    password: 'Editor789!',
    displayName: 'Mehdi Amrani',
    role: 'menu_editor',
  },
];

async function main() {
  console.log('👥 Seeding additional users for Dar El Baraka...\n');

  // Find the tenant
  const tenant = await prisma.tenant.findUnique({
    where: { slug: 'dar-el-baraka' },
  });

  if (!tenant) {
    console.error('❌ Tenant "dar-el-baraka" not found. Please run seed-algerian.ts first.');
    process.exit(1);
  }

  console.log(`📦 Found tenant: ${tenant.name}\n`);

  // Get locations for assigning to FOH/Kitchen staff
  const locations = await prisma.location.findMany({
    where: { tenantId: tenant.id },
    select: { id: true, name: true },
  });

  console.log(`📍 Found ${locations.length} locations\n`);

  const createdUsers: Array<{ email: string; password: string; role: string; displayName: string }> = [];

  for (const userData of USERS_TO_CREATE) {
    // Check if user already exists
    const existing = await prisma.adminUser.findFirst({
      where: {
        tenantId: tenant.id,
        email: userData.email,
      },
    });

    if (existing) {
      console.log(`⚠️ User ${userData.email} already exists, skipping...`);
      continue;
    }

    const hashedPassword = await bcrypt.hash(userData.password, 10);

    // Assign location restrictions for lower-level staff
    let locationIds: string[] = [];
    if (['foh_staff', 'kitchen_staff'].includes(userData.role) && locations.length > 0) {
      // Assign to first location only for testing location-based access
      locationIds = [locations[0].id];
    }

    await prisma.adminUser.create({
      data: {
        tenantId: tenant.id,
        username: userData.username,
        email: userData.email,
        passwordHash: hashedPassword,
        displayName: userData.displayName,
        role: userData.role,
        isActive: true,
        locationIds,
      },
    });

    createdUsers.push({
      email: userData.email,
      password: userData.password,
      role: userData.role,
      displayName: userData.displayName,
    });

    console.log(`✓ Created user: ${userData.displayName} (${userData.role})`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('📋 USER CREDENTIALS (copy these for testing)');
  console.log('='.repeat(60) + '\n');

  console.log('Login URL: http://localhost:3001/t/dar-el-baraka/admin/login\n');

  // Print existing owner
  console.log('👑 OWNER:');
  console.log('   Email: admin@dar-el-baraka.com');
  console.log('   Password: baraka123');
  console.log('');

  // Print newly created users by role
  const byRole: Record<string, typeof createdUsers> = {};
  for (const user of createdUsers) {
    if (!byRole[user.role]) byRole[user.role] = [];
    byRole[user.role].push(user);
  }

  const roleLabels: Record<string, string> = {
    manager: '📊 MANAGER',
    menu_editor: '✏️ MENU EDITOR',
    foh_staff: '🍽️ FRONT OF HOUSE',
    kitchen_staff: '👨‍🍳 KITCHEN STAFF',
  };

  for (const [role, users] of Object.entries(byRole)) {
    console.log(`${roleLabels[role] || role.toUpperCase()}:`);
    for (const user of users) {
      console.log(`   ${user.displayName}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Password: ${user.password}`);
      console.log('');
    }
  }

  console.log('='.repeat(60));
  console.log('✅ User seeding complete!');
}

main()
  .catch((e) => {
    console.error('Error seeding users:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
