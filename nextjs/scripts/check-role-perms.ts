import { prisma } from '../src/lib/prisma';

async function main() {
  const roles = await prisma.systemRole.findMany({
    include: {
      permissions: {
        include: {
          permission: true,
        },
      },
    },
    orderBy: { level: 'desc' },
  });

  console.log('\n📋 Role Permissions Summary:\n');
  
  for (const role of roles) {
    const permKeys = role.permissions.map(rp => rp.permission.key);
    console.log(`${role.name} (${role.slug}) - Level ${role.level}, isDefault: ${role.isDefault}`);
    console.log(`  Total permissions: ${permKeys.length}`);
    if (permKeys.length > 0) {
      console.log(`  Sample: ${permKeys.slice(0, 5).join(', ')}${permKeys.length > 5 ? '...' : ''}`);
    } else {
      console.log('  ⚠️  NO PERMISSIONS ASSIGNED!');
    }
    console.log('');
  }
}

main()
  .catch(console.error);
