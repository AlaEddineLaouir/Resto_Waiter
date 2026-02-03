import { NextResponse } from 'next/server';
import { getRestaurantSession } from '@/lib/restaurant-auth';
import { prisma } from '@/lib/prisma';

// GET all system roles with their permissions (for restaurant admin)
export async function GET() {
  try {
    const session = await getRestaurantSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const roles = await prisma.systemRole.findMany({
      where: { isActive: true },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
      orderBy: { level: 'desc' },
    });

    // Transform to include permissions array
    const transformedRoles = roles.map((role) => ({
      id: role.id,
      slug: role.slug,
      name: role.name,
      description: role.description,
      icon: role.icon,
      color: role.color,
      level: role.level,
      isDefault: role.isDefault,
      permissionKeys: role.permissions.map((rp) => rp.permission.key),
      permissions: role.permissions.map((rp) => ({
        id: rp.permission.id,
        key: rp.permission.key,
        label: rp.permission.label,
        description: rp.permission.description,
        category: rp.permission.category,
      })),
    }));

    // Also get all permissions grouped by category
    const allPermissions = await prisma.systemPermission.findMany({
      where: { isActive: true },
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
    });

    interface PermissionInfo {
      id: string;
      key: string;
      label: string;
      description: string | null;
      category: string;
    }

    const groupedPermissions = allPermissions.reduce((acc, perm) => {
      if (!acc[perm.category]) {
        acc[perm.category] = [];
      }
      acc[perm.category].push({
        id: perm.id,
        key: perm.key,
        label: perm.label,
        description: perm.description,
        category: perm.category,
      });
      return acc;
    }, {} as Record<string, PermissionInfo[]>);

    return NextResponse.json({ 
      roles: transformedRoles,
      permissions: allPermissions,
      groupedPermissions,
    });
  } catch (error) {
    console.error('Get roles error:', error);
    return NextResponse.json({ error: 'Failed to get roles' }, { status: 500 });
  }
}
