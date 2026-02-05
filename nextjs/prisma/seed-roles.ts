import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL!;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const permissions = [
  // Dashboard permissions
  { key: 'dashboard.read', label: 'View Dashboard', description: 'Can access the dashboard overview', category: 'Dashboard', sortOrder: 1 },
  
  // Menu permissions (plural to match navigation)
  { key: 'menus.read', label: 'View Menus', description: 'Can view menus', category: 'Menu', sortOrder: 1 },
  { key: 'menus.create', label: 'Create Menus', description: 'Can create new menus', category: 'Menu', sortOrder: 2 },
  { key: 'menus.update', label: 'Edit Menus', description: 'Can modify existing menus', category: 'Menu', sortOrder: 3 },
  { key: 'menus.delete', label: 'Delete Menus', description: 'Can remove menus', category: 'Menu', sortOrder: 4 },
  { key: 'menus.publish', label: 'Publish Menus', description: 'Can publish menu changes', category: 'Menu', sortOrder: 5 },
  
  // Sections permissions
  { key: 'sections.read', label: 'View Sections', description: 'Can view menu sections', category: 'Sections', sortOrder: 1 },
  { key: 'sections.create', label: 'Create Sections', description: 'Can create menu sections', category: 'Sections', sortOrder: 2 },
  { key: 'sections.update', label: 'Edit Sections', description: 'Can modify menu sections', category: 'Sections', sortOrder: 3 },
  { key: 'sections.delete', label: 'Delete Sections', description: 'Can remove menu sections', category: 'Sections', sortOrder: 4 },
  
  // Items permissions
  { key: 'items.read', label: 'View Items', description: 'Can view menu items', category: 'Items', sortOrder: 1 },
  { key: 'items.create', label: 'Create Items', description: 'Can create menu items', category: 'Items', sortOrder: 2 },
  { key: 'items.update', label: 'Edit Items', description: 'Can modify menu items', category: 'Items', sortOrder: 3 },
  { key: 'items.delete', label: 'Delete Items', description: 'Can remove menu items', category: 'Items', sortOrder: 4 },
  
  // Ingredients permissions
  { key: 'ingredients.read', label: 'View Ingredients', description: 'Can view ingredients', category: 'Ingredients', sortOrder: 1 },
  { key: 'ingredients.create', label: 'Create Ingredients', description: 'Can create ingredients', category: 'Ingredients', sortOrder: 2 },
  { key: 'ingredients.update', label: 'Edit Ingredients', description: 'Can modify ingredients', category: 'Ingredients', sortOrder: 3 },
  { key: 'ingredients.delete', label: 'Delete Ingredients', description: 'Can remove ingredients', category: 'Ingredients', sortOrder: 4 },
  
  // Option Groups permissions
  { key: 'options.read', label: 'View Option Groups', description: 'Can view option groups', category: 'Option Groups', sortOrder: 1 },
  { key: 'options.create', label: 'Create Option Groups', description: 'Can create option groups', category: 'Option Groups', sortOrder: 2 },
  { key: 'options.update', label: 'Edit Option Groups', description: 'Can modify option groups', category: 'Option Groups', sortOrder: 3 },
  { key: 'options.delete', label: 'Delete Option Groups', description: 'Can remove option groups', category: 'Option Groups', sortOrder: 4 },
  
  // Brands permissions
  { key: 'brands.read', label: 'View Brands', description: 'Can view brands', category: 'Brands', sortOrder: 1 },
  { key: 'brands.create', label: 'Create Brands', description: 'Can create brands', category: 'Brands', sortOrder: 2 },
  { key: 'brands.update', label: 'Edit Brands', description: 'Can modify brands', category: 'Brands', sortOrder: 3 },
  { key: 'brands.delete', label: 'Delete Brands', description: 'Can remove brands', category: 'Brands', sortOrder: 4 },
  
  // Locations permissions
  { key: 'locations.read', label: 'View Locations', description: 'Can view locations', category: 'Locations', sortOrder: 1 },
  { key: 'locations.create', label: 'Add Locations', description: 'Can add new locations', category: 'Locations', sortOrder: 2 },
  { key: 'locations.update', label: 'Manage Locations', description: 'Can edit locations', category: 'Locations', sortOrder: 3 },
  { key: 'locations.delete', label: 'Remove Locations', description: 'Can remove locations', category: 'Locations', sortOrder: 4 },
  
  // Users/Staff permissions
  { key: 'staff.read', label: 'View Staff', description: 'Can view staff list', category: 'Staff', sortOrder: 1 },
  { key: 'staff.create', label: 'Add Staff', description: 'Can add new staff members', category: 'Staff', sortOrder: 2 },
  { key: 'staff.update', label: 'Manage Staff', description: 'Can edit staff members', category: 'Staff', sortOrder: 3 },
  { key: 'staff.delete', label: 'Remove Staff', description: 'Can remove staff members', category: 'Staff', sortOrder: 4 },
  
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
      'dashboard.read',
      'menus.read', 'menus.create', 'menus.update', 'menus.delete', 'menus.publish',
      'sections.read', 'sections.create', 'sections.update', 'sections.delete',
      'items.read', 'items.create', 'items.update', 'items.delete',
      'ingredients.read', 'ingredients.create', 'ingredients.update',
      'options.read', 'options.create', 'options.update',
      'brands.read', 'brands.update',
      'locations.read', 'locations.update',
      'staff.read', 'staff.create', 'staff.update',
      'orders.read', 'orders.create', 'orders.update',
      'analytics.read', 'analytics.export',
      'settings.read',
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
      'dashboard.read',
      'menus.read',
      'sections.read', 'sections.create', 'sections.update',
      'items.read', 'items.create', 'items.update',
      'ingredients.read', 'ingredients.create', 'ingredients.update',
      'options.read',
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
      'dashboard.read',
      'menus.read',
      'sections.read',
      'items.read',
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
      'dashboard.read',
      'items.read',
      'ingredients.read',
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
