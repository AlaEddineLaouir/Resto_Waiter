import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/restaurant-auth';
import { TenantUserRole } from '@prisma/client';
import { requirePermission, isRoleHigherThan, canAssignRole } from '@/lib/rbac';

// GET /api/admin/users/[id] - Get a specific tenant user
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requirePermission('staff.read');
    if (!guard.authorized) return guard.response;
    const session = guard.user!;

    const { id } = await params;

    const user = await prisma.adminUser.findFirst({
      where: {
        id,
        tenantId: session.tenantId,
        deletedAt: null,
      },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        role: true,
        permissions: true,
        locationIds: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Error fetching tenant user:', error);
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
  }
}

// PUT /api/admin/users/[id] - Update a tenant user
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requirePermission('staff.update');
    if (!guard.authorized) return guard.response;
    const session = guard.user!;

    const { id } = await params;
    const body = await request.json();
    const { email, username, displayName, password, role, permissions, locationIds, isActive } = body;

    // Check if user exists
    const existingUser = await prisma.adminUser.findFirst({
      where: {
        id,
        tenantId: session.tenantId,
        deletedAt: null,
      },
    });

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check role permissions
    if (isRoleHigherThan(existingUser.role, session.role)) {
      return NextResponse.json({ error: 'Cannot modify a user with equal or higher role' }, { status: 403 });
    }

    // If email is being changed, check for duplicates
    if (email && email.toLowerCase() !== existingUser.email) {
      const emailExists = await prisma.adminUser.findFirst({
        where: {
          tenantId: session.tenantId,
          email: email.toLowerCase(),
          deletedAt: null,
          id: { not: id },
        },
      });
      if (emailExists) {
        return NextResponse.json({ error: 'Email already in use' }, { status: 400 });
      }
    }

    // Validate new role if provided
    if (role) {
      const targetRole = role as TenantUserRole;
      if (!canAssignRole(session, targetRole)) {
        return NextResponse.json({ error: 'Cannot assign a role equal or higher than your own' }, { status: 403 });
      }
    }

    // Prevent self-demotion
    if (session.id === id && existingUser.role === 'owner' && role && role !== 'owner') {
      return NextResponse.json({ error: 'Cannot demote yourself from owner' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (email) updateData.email = email.toLowerCase();
    if (username) updateData.username = username;
    if (displayName !== undefined) updateData.displayName = displayName;
    if (role) updateData.role = role;
    if (permissions !== undefined) updateData.permissions = permissions;
    if (locationIds !== undefined) updateData.locationIds = locationIds;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (password) updateData.passwordHash = await hashPassword(password);

    const user = await prisma.adminUser.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        role: true,
        permissions: true,
        locationIds: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Error updating tenant user:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

// DELETE /api/admin/users/[id] - Soft delete a tenant user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requirePermission('staff.delete');
    if (!guard.authorized) return guard.response;
    const session = guard.user!;

    const { id } = await params;

    // Prevent self-deletion
    if (session.id === id) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
    }

    // Check if user exists and get their role
    const existingUser = await prisma.adminUser.findFirst({
      where: {
        id,
        tenantId: session.tenantId,
        deletedAt: null,
      },
    });

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check role permissions
    if (isRoleHigherThan(existingUser.role, session.role)) {
      return NextResponse.json({ error: 'Cannot delete a user with equal or higher role' }, { status: 403 });
    }

    // Soft delete
    await prisma.adminUser.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });

    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting tenant user:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
