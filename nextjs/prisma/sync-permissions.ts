/**
 * Sync Permissions Script
 * 
 * This script automatically generates CRUD permissions based on database entities.
 * Run this script whenever new entities are added to the database.
 * 
 * Usage: npx dotenv -e .env.local -- npx tsx prisma/sync-permissions.ts
 */

import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

// Remove quotes from DATABASE_URL if present (dotenv-cli issue)
const connectionString = (process.env.DATABASE_URL || '').replace(/^["']|["']$/g, '');
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Define entities and their CRUD operations
// This maps database entities to their permission structure
interface EntityPermissionConfig {
  entity: string;
  label: string;
  category: string;
  operations: {
    key: string;
    label: string;
    description: string;
  }[];
}

const ENTITY_PERMISSIONS: EntityPermissionConfig[] = [
  // Menu & Content Management
  {
    entity: 'menus',
    label: 'Menus',
    category: 'Menu Management',
    operations: [
      { key: 'read', label: 'View Menus', description: 'Can view menus list and details' },
      { key: 'create', label: 'Create Menus', description: 'Can create new menus' },
      { key: 'update', label: 'Edit Menus', description: 'Can modify existing menus' },
      { key: 'delete', label: 'Delete Menus', description: 'Can remove menus' },
      { key: 'publish', label: 'Publish Menus', description: 'Can publish menu changes to locations' },
    ],
  },
  {
    entity: 'sections',
    label: 'Sections',
    category: 'Menu Management',
    operations: [
      { key: 'read', label: 'View Sections', description: 'Can view menu sections' },
      { key: 'create', label: 'Create Sections', description: 'Can create new sections' },
      { key: 'update', label: 'Edit Sections', description: 'Can modify sections' },
      { key: 'delete', label: 'Delete Sections', description: 'Can remove sections' },
    ],
  },
  {
    entity: 'items',
    label: 'Items',
    category: 'Menu Management',
    operations: [
      { key: 'read', label: 'View Items', description: 'Can view menu items' },
      { key: 'create', label: 'Create Items', description: 'Can create new menu items' },
      { key: 'update', label: 'Edit Items', description: 'Can modify menu items' },
      { key: 'delete', label: 'Delete Items', description: 'Can remove menu items' },
    ],
  },
  {
    entity: 'ingredients',
    label: 'Ingredients',
    category: 'Menu Management',
    operations: [
      { key: 'read', label: 'View Ingredients', description: 'Can view ingredients list' },
      { key: 'create', label: 'Create Ingredients', description: 'Can add new ingredients' },
      { key: 'update', label: 'Edit Ingredients', description: 'Can modify ingredients' },
      { key: 'delete', label: 'Delete Ingredients', description: 'Can remove ingredients' },
    ],
  },
  {
    entity: 'option-groups',
    label: 'Option Groups',
    category: 'Menu Management',
    operations: [
      { key: 'read', label: 'View Option Groups', description: 'Can view option groups (sizes, add-ons)' },
      { key: 'create', label: 'Create Option Groups', description: 'Can create option groups' },
      { key: 'update', label: 'Edit Option Groups', description: 'Can modify option groups' },
      { key: 'delete', label: 'Delete Option Groups', description: 'Can remove option groups' },
    ],
  },
  
  // Organization
  {
    entity: 'brands',
    label: 'Brands',
    category: 'Organization',
    operations: [
      { key: 'read', label: 'View Brands', description: 'Can view brand information' },
      { key: 'create', label: 'Create Brands', description: 'Can create new brands' },
      { key: 'update', label: 'Edit Brands', description: 'Can modify brand details' },
      { key: 'delete', label: 'Delete Brands', description: 'Can remove brands' },
    ],
  },
  {
    entity: 'locations',
    label: 'Locations',
    category: 'Organization',
    operations: [
      { key: 'read', label: 'View Locations', description: 'Can view restaurant locations' },
      { key: 'create', label: 'Create Locations', description: 'Can add new locations' },
      { key: 'update', label: 'Edit Locations', description: 'Can modify location details' },
      { key: 'delete', label: 'Delete Locations', description: 'Can remove locations' },
    ],
  },
  
  // Staff & Users
  {
    entity: 'users',
    label: 'Staff/Users',
    category: 'Staff Management',
    operations: [
      { key: 'read', label: 'View Staff', description: 'Can view staff list and details' },
      { key: 'create', label: 'Add Staff', description: 'Can add new staff members' },
      { key: 'update', label: 'Manage Staff', description: 'Can edit staff information and roles' },
      { key: 'delete', label: 'Remove Staff', description: 'Can deactivate or remove staff' },
    ],
  },
  
  // Analytics & Reports
  {
    entity: 'analytics',
    label: 'Analytics',
    category: 'Analytics & Reports',
    operations: [
      { key: 'read', label: 'View Analytics', description: 'Can access analytics dashboard' },
      { key: 'export', label: 'Export Reports', description: 'Can export analytics data' },
    ],
  },
  
  // Settings
  {
    entity: 'settings',
    label: 'Settings',
    category: 'Settings',
    operations: [
      { key: 'read', label: 'View Settings', description: 'Can view restaurant settings' },
      { key: 'update', label: 'Manage Settings', description: 'Can modify restaurant settings' },
    ],
  },
  
  // Publications
  {
    entity: 'publications',
    label: 'Publications',
    category: 'Menu Management',
    operations: [
      { key: 'read', label: 'View Publications', description: 'Can view menu publications' },
      { key: 'create', label: 'Create Publications', description: 'Can publish menus to locations' },
      { key: 'update', label: 'Manage Publications', description: 'Can modify publication settings' },
      { key: 'delete', label: 'Remove Publications', description: 'Can unpublish menus' },
    ],
  },
  
  // Dashboard
  {
    entity: 'dashboard',
    label: 'Dashboard',
    category: 'Dashboard',
    operations: [
      { key: 'read', label: 'View Dashboard', description: 'Can access the admin dashboard' },
    ],
  },
];

// Default role configurations
const DEFAULT_ROLES = [
  {
    slug: 'owner',
    name: 'Owner',
    description: 'Full access to all restaurant features',
    icon: '👑',
    color: 'bg-purple-100 text-purple-800 border-purple-300',
    level: 100,
    isDefault: false,
    permissionFilter: () => true, // All permissions
  },
  {
    slug: 'manager',
    name: 'Manager',
    description: 'Manage operations, staff, and menus',
    icon: '📊',
    color: 'bg-blue-100 text-blue-800 border-blue-300',
    level: 80,
    isDefault: false,
    permissionFilter: (key: string) => {
      // Managers can do everything except delete brands/locations, manage settings
      const excluded = ['brands.delete', 'settings.update'];
      return !excluded.includes(key);
    },
  },
  {
    slug: 'menu_editor',
    name: 'Menu Editor',
    description: 'Create and edit menu content',
    icon: '✏️',
    color: 'bg-green-100 text-green-800 border-green-300',
    level: 50,
    isDefault: true,
    permissionFilter: (key: string) => {
      // Menu editors can only work with menu-related entities
      const allowed = [
        'dashboard.read',
        'menus.read', 'menus.create', 'menus.update',
        'sections.read', 'sections.create', 'sections.update',
        'items.read', 'items.create', 'items.update',
        'ingredients.read', 'ingredients.create', 'ingredients.update',
        'option-groups.read', 'option-groups.create', 'option-groups.update',
        'brands.read',
        'locations.read',
        'analytics.read',
      ];
      return allowed.includes(key);
    },
  },
  {
    slug: 'foh_staff',
    name: 'Front of House',
    description: 'View menus and manage orders',
    icon: '🍽️',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    level: 30,
    isDefault: false,
    permissionFilter: (key: string) => {
      const allowed = [
        'dashboard.read',
        'menus.read',
        'sections.read',
        'items.read',
        'locations.read',
      ];
      return allowed.includes(key);
    },
  },
  {
    slug: 'kitchen_staff',
    name: 'Kitchen Staff',
    description: 'View menu items and ingredients',
    icon: '👨‍🍳',
    color: 'bg-orange-100 text-orange-800 border-orange-300',
    level: 20,
    isDefault: false,
    permissionFilter: (key: string) => {
      const allowed = [
        'dashboard.read',
        'menus.read',
        'sections.read',
        'items.read',
        'ingredients.read',
      ];
      return allowed.includes(key);
    },
  },
];

async function syncPermissions() {
  console.log('🔐 Syncing permissions from entity definitions...\n');

  // Generate all permission keys
  const allPermissions: Array<{
    key: string;
    label: string;
    description: string;
    category: string;
    sortOrder: number;
  }> = [];

  let sortOrder = 0;
  for (const entity of ENTITY_PERMISSIONS) {
    for (const op of entity.operations) {
      sortOrder++;
      allPermissions.push({
        key: `${entity.entity}.${op.key}`,
        label: op.label,
        description: op.description,
        category: entity.category,
        sortOrder,
      });
    }
  }

  console.log(`📋 Found ${allPermissions.length} permissions across ${ENTITY_PERMISSIONS.length} entities\n`);

  // Get existing permissions
  const existingPermissions = await prisma.systemPermission.findMany();
  const existingKeys = new Set(existingPermissions.map(p => p.key));

  // Sync permissions
  let created = 0;
  let updated = 0;

  for (const perm of allPermissions) {
    if (existingKeys.has(perm.key)) {
      // Update existing
      await prisma.systemPermission.update({
        where: { key: perm.key },
        data: {
          label: perm.label,
          description: perm.description,
          category: perm.category,
          sortOrder: perm.sortOrder,
        },
      });
      updated++;
    } else {
      // Create new
      await prisma.systemPermission.create({
        data: {
          key: perm.key,
          label: perm.label,
          description: perm.description,
          category: perm.category,
          sortOrder: perm.sortOrder,
          isActive: true,
        },
      });
      created++;
      console.log(`  ✓ Created: ${perm.key}`);
    }
  }

  // Find orphaned permissions (exist in DB but not in config)
  const configKeys = new Set(allPermissions.map(p => p.key));
  const orphanedPermissions = existingPermissions.filter(p => !configKeys.has(p.key));
  
  if (orphanedPermissions.length > 0) {
    console.log(`\n⚠️  Found ${orphanedPermissions.length} orphaned permissions (not in entity config):`);
    for (const p of orphanedPermissions) {
      console.log(`    - ${p.key}`);
    }
    console.log('   These are kept but may be outdated. Remove manually if not needed.\n');
  }

  console.log(`\n📊 Permission sync complete:`);
  console.log(`   Created: ${created}`);
  console.log(`   Updated: ${updated}`);

  // Now sync roles
  console.log('\n👤 Syncing default roles...\n');

  // Get all permission records for role assignment
  const permissionRecords = await prisma.systemPermission.findMany();
  const permissionMap = new Map(permissionRecords.map(p => [p.key, p.id]));

  for (const roleDef of DEFAULT_ROLES) {
    const { permissionFilter, ...roleData } = roleDef;
    
    // Get permissions for this role
    const rolePermissionKeys = allPermissions
      .map(p => p.key)
      .filter(permissionFilter);

    // Upsert role
    let role = await prisma.systemRole.findUnique({
      where: { slug: roleData.slug },
    });

    if (role) {
      // Update existing role
      await prisma.systemRole.update({
        where: { slug: roleData.slug },
        data: {
          name: roleData.name,
          description: roleData.description,
          icon: roleData.icon,
          color: roleData.color,
          level: roleData.level,
          isDefault: roleData.isDefault,
        },
      });
    } else {
      // Create new role
      role = await prisma.systemRole.create({
        data: {
          slug: roleData.slug,
          name: roleData.name,
          description: roleData.description,
          icon: roleData.icon,
          color: roleData.color,
          level: roleData.level,
          isDefault: roleData.isDefault,
          isActive: true,
        },
      });
      console.log(`  ✓ Created role: ${roleData.name}`);
    }

    // Sync role permissions
    await prisma.systemRolePermission.deleteMany({
      where: { roleId: role.id },
    });

    for (const permKey of rolePermissionKeys) {
      const permId = permissionMap.get(permKey);
      if (permId) {
        await prisma.systemRolePermission.create({
          data: {
            roleId: role.id,
            permissionId: permId,
          },
        });
      }
    }

    console.log(`  ✓ ${roleData.name}: ${rolePermissionKeys.length} permissions`);
  }

  console.log('\n✅ Sync complete!\n');
}

// Run the sync
syncPermissions()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
    process.exit(0);
  });
