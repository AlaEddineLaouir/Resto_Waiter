import { NextResponse } from 'next/server';
import { getRestaurantSession } from '@/lib/restaurant-auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getRestaurantSession();

    if (!session) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const admin = await prisma.adminUser.findUnique({
      where: { id: session.id },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        role: true,
        permissions: true, // User's custom permissions
        tenantId: true,
        locationIds: true,
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!admin) {
      return NextResponse.json(
        { error: 'Admin not found' },
        { status: 404 }
      );
    }

    // Get user's effective permissions:
    // 1. If user has custom permissions, use those
    // 2. Otherwise, use role default permissions
    let permissions: string[] = [];
    const customPermissions = admin.permissions as string[] | null;
    
    if (customPermissions && customPermissions.length > 0) {
      // User has custom permissions set
      permissions = customPermissions;
    } else {
      // Fall back to role default permissions
      try {
        const systemRole = await prisma.systemRole.findUnique({
          where: { slug: admin.role },
          include: {
            permissions: {
              include: {
                permission: {
                  select: { key: true },
                },
              },
            },
          },
        });

        if (systemRole) {
          permissions = systemRole.permissions.map(rp => rp.permission.key);
        }
      } catch {
        // SystemRole table might not exist yet, fallback to empty permissions
        console.warn('Could not fetch system role permissions');
      }
    }

    // Also return tenantSlug from session for frontend validation
    return NextResponse.json({ 
      admin: {
        ...admin,
        permissions, // Return effective permissions
      },
      tenantSlug: session.tenantSlug || admin.tenant.slug,
    });
  } catch (error) {
    console.error('Get restaurant admin error:', error);
    return NextResponse.json(
      { error: 'Failed to get user' },
      { status: 500 }
    );
  }
}
