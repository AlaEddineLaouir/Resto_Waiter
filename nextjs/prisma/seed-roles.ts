import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL!;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const permissions = [
  // Menu permissions
  { key: 'menu.read', label: 'View Menus', description: 'Can view menu items and sections', category: 'Menu', sortOrder: 1 },
  { key: 'menu.create', label: 'Create Menu Items', description: 'Can create new menu items', category: 'Menu', sortOrder: 2 },
  { key: 'menu.update', label: 'Edit Menu Items', description: 'Can modify existing menu items', category: 'Menu', sortOrder: 3 },
  { key: 'menu.delete', label: 'Delete Menu Items', description: 'Can remove menu items', category: 'Menu', sortOrder: 4 },
  { key: 'menu.publish', label: 'Publish Menus', description: 'Can publish menu changes', category: 'Menu', sortOrder: 5 },
  
  // Orders permissions
  { key: 'orders.read', label: 'View Orders', description: 'Can view order history', category: 'Orders', sortOrder: 1 },
  { key: 'orders.create', label: 'Create Orders', description: 'Can create new orders', category: 'Orders', sortOrder: 2 },
  { key: 'orders.update', label: 'Manage Orders', description: 'Can update order status', category: 'Orders', sortOrder: 3 },
  { key: 'orders.delete', label: 'Cancel Orders', description: 'Can cancel orders', category: 'Orders', sortOrder: 4 },
  
  // Analytics permissions
  { key: 'analytics.read', label: 'View Analytics', description: 'Can access analytics dashboard', category: 'Analytics', sortOrder: 1 },
  { key: 'analytics.export', label: 'Export Analytics', description: 'Can export analytics data', category: 'Analytics', sortOrder: 2 },
  
  // Settings permissions
  { key: 'settings.read', label: 'View Settings', description: 'Can view restaurant settings', category: 'Settings', sortOrder: 1 },
  { key: 'settings.update', label: 'Manage Settings', description: 'Can modify restaurant settings', category: 'Settings', sortOrder: 2 },
  
  // Staff permissions
  { key: 'staff.read', label: 'View Staff', description: 'Can view staff list', category: 'Staff', sortOrder: 1 },
  { key: 'staff.create', label: 'Add Staff', description: 'Can add new staff members', category: 'Staff', sortOrder: 2 },
  { key: 'staff.update', label: 'Manage Staff', description: 'Can edit staff members', category: 'Staff', sortOrder: 3 },
  { key: 'staff.delete', label: 'Remove Staff', description: 'Can remove staff members', category: 'Staff', sortOrder: 4 },
  
  // Locations permissions
  { key: 'locations.read', label: 'View Locations', description: 'Can view locations', category: 'Locations', sortOrder: 1 },
  { key: 'locations.create', label: 'Add Locations', description: 'Can add new locations', category: 'Locations', sortOrder: 2 },
  { key: 'locations.update', label: 'Manage Locations', description: 'Can edit locations', category: 'Locations', sortOrder: 3 },
  { key: 'locations.delete', label: 'Remove Locations', description: 'Can remove locations', category: 'Locations', sortOrder: 4 },
];

const roles = [
  {
    slug: 'owner',
    name: 'Owner',
    description: 'Full access to restaurant - all permissions',
    icon: '👑',
    color: 'bg-purple-100 text-purple-800 border-purple-300',
    level: 100,
    isDefault: false,
    permissions: permissions.map(p => p.key), // All permissions
  },
  {
    slug: 'manager',
    name: 'Manager',
    description: 'Manage menus, staff, analytics - cannot delete restaurant',
    icon: '📊',
    color: 'bg-blue-100 text-blue-800 border-blue-300',
    level: 80,
    isDefault: false,
    permissions: [
      'menu.read', 'menu.create', 'menu.update', 'menu.delete', 'menu.publish',
      'orders.read', 'orders.create', 'orders.update',
      'analytics.read', 'analytics.export',
      'settings.read',
      'staff.read', 'staff.create', 'staff.update',
      'locations.read', 'locations.update',
    ],
  },
  {
    slug: 'menu_editor',
    name: 'Menu Editor',
    description: 'Create and edit menu items - limited staff access',
    icon: '✏️',
    color: 'bg-green-100 text-green-800 border-green-300',
    level: 50,
    isDefault: true,
    permissions: [
      'menu.read', 'menu.create', 'menu.update',
      'orders.read',
      'locations.read',
    ],
  },
  {
    slug: 'foh_staff',
    name: 'Front of House',
    description: 'View menu, process orders - customer facing',
    icon: '🍽️',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    level: 30,
    isDefault: false,
    permissions: [
      'menu.read',
      'orders.read', 'orders.create', 'orders.update',
      'locations.read',
    ],
  },
  {
    slug: 'kitchen_staff',
    name: 'Kitchen Staff',
    description: 'View orders and ingredients - kitchen only',
    icon: '👨‍🍳',
    color: 'bg-orange-100 text-orange-800 border-orange-300',
    level: 20,
    isDefault: false,
    permissions: [
      'menu.read',
      'orders.read',
    ],
  },
];

async function main() {
  console.log('🔐 Seeding roles and permissions...\n');

  // Clear existing data
  console.log('🗑️  Clearing existing data...');
  await prisma.systemRolePermission.deleteMany({});
  await prisma.systemRole.deleteMany({});
  await prisma.systemPermission.deleteMany({});

  // Create permissions
  console.log('📋 Creating permissions...');
  const createdPermissions: Record<string, string> = {};
  
  for (const perm of permissions) {
    const created = await prisma.systemPermission.create({
      data: perm,
    });
    createdPermissions[perm.key] = created.id;
    console.log(`  ✓ ${perm.key}`);
  }

  // Create roles with permissions
  console.log('\n👤 Creating roles...');
  
  for (const role of roles) {
    const { permissions: rolePermissions, ...roleData } = role;
    
    const created = await prisma.systemRole.create({
      data: {
        ...roleData,
        permissions: {
          create: rolePermissions.map((permKey) => ({
            permissionId: createdPermissions[permKey],
          })),
        },
      },
    });
    
    console.log(`  ✓ ${created.name} (${rolePermissions.length} permissions)`);
  }

  console.log('\n✅ Seeding complete!');
  console.log(`   Created ${permissions.length} permissions`);
  console.log(`   Created ${roles.length} roles`);
}

main()
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
