import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // Find Mehdi's user
  const user = await prisma.restaurantUser.findFirst({
    where: { email: 'mehdi@dar-el-baraka.com' },
    include: {
      role: {
        include: {
          permissions: {
            include: { permission: true }
          }
        }
      }
    }
  });

  if (!user) {
    console.log('Mehdi user not found');
    return;
  }

  console.log('=== MEHDI\'S CURRENT SETUP ===');
  console.log('User ID:', user.id);
  console.log('Email:', user.email);
  console.log('Role:', user.role?.name);
  console.log('Role ID:', user.roleId);
  console.log('\nCurrent Permissions:');
  user.role?.permissions.forEach(p => {
    console.log('  -', p.permission.key);
  });

  // List all available roles for this restaurant
  console.log('\n=== AVAILABLE ROLES ===');
  const roles = await prisma.restaurantRole.findMany({
    where: { restaurantId: user.restaurantId },
    include: {
      permissions: {
        include: { permission: true }
      }
    }
  });
  
  for (const role of roles) {
    console.log(`\n${role.name}:`);
    role.permissions.forEach(p => {
      console.log('  -', p.permission.key);
    });
  }

  await pool.end();
}

main().catch(console.error);
