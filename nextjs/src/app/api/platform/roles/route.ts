import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET all roles with their permissions
export async function GET() {
  try {
    const session = await getSession();
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
      ...role,
      permissionKeys: role.permissions.map((rp) => rp.permission.key),
      permissionDetails: role.permissions.map((rp) => rp.permission),
    }));

    return NextResponse.json({ roles: transformedRoles });
  } catch (error) {
    console.error('Get roles error:', error);
    return NextResponse.json({ error: 'Failed to get roles' }, { status: 500 });
  }
}

// POST create new role
export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { slug, name, description, icon, color, level, isDefault, permissionIds } = body;

    if (!slug || !name) {
      return NextResponse.json(
        { error: 'Slug and name are required' },
        { status: 400 }
      );
    }

    // Check for duplicate slug
    const existing = await prisma.systemRole.findUnique({
      where: { slug },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Role slug already exists' },
        { status: 400 }
      );
    }

    // If isDefault is true, unset other default roles
    if (isDefault) {
      await prisma.systemRole.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const role = await prisma.systemRole.create({
      data: {
        slug,
        name,
        description: description || null,
        icon: icon || null,
        color: color || null,
        level: level || 0,
        isDefault: isDefault || false,
        permissions: permissionIds?.length
          ? {
              create: permissionIds.map((permissionId: string) => ({
                permissionId,
              })),
            }
          : undefined,
      },
      include: {
        permissions: {
          include: { permission: true },
        },
      },
    });

    return NextResponse.json({ role }, { status: 201 });
  } catch (error) {
    console.error('Create role error:', error);
    return NextResponse.json({ error: 'Failed to create role' }, { status: 500 });
  }
}
