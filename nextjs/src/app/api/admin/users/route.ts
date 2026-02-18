import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/restaurant-auth';
import { TenantUserRole } from '@prisma/client';
import { requirePermission, isRoleHigherThan, canAssignRole } from '@/lib/rbac';

// GET /api/admin/users - List all tenant users
export async function GET(request: NextRequest) {
  try {
    const guard = await requirePermission('staff.read');
    if (!guard.authorized) return guard.response;
    const session = guard.user!;

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || '';

    const where: Record<string, unknown> = {
      tenantId: session.tenantId,
      deletedAt: null,
    };

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } },
        { displayName: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (role) {
      where.role = role as TenantUserRole;
    }

    const [users, total] = await Promise.all([
      prisma.adminUser.findMany({
        where,
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
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.adminUser.count({ where }),
    ]);

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching tenant users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

// POST /api/admin/users - Create a new tenant user
export async function POST(request: NextRequest) {
  try {
    const guard = await requirePermission('staff.create');
    if (!guard.authorized) return guard.response;
    const session = guard.user!;

    const body = await request.json();
    const { email, username, displayName, password, role, permissions, locationIds } = body;

    // Validate required fields
    if (!email || !username || !password) {
      return NextResponse.json({ error: 'Email, username, and password are required' }, { status: 400 });
    }

    // Validate role
    const validRoles: TenantUserRole[] = ['admin', 'manager', 'chef', 'waiter'];
    const targetRole = (role || 'manager') as TenantUserRole;
    
    if (!validRoles.includes(targetRole)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Check if user can assign this role
    if (!canAssignRole(session, targetRole)) {
      return NextResponse.json({ error: 'Cannot assign a role equal or higher than your own' }, { status: 403 });
    }

    // Only admin can create other admins
    if (targetRole === 'admin' && session.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can create admin accounts' }, { status: 403 });
    }

    // Check if email already exists for this tenant
    const existingUser = await prisma.adminUser.findFirst({
      where: {
        tenantId: session.tenantId,
        email: email.toLowerCase(),
        deletedAt: null,
      },
    });

    if (existingUser) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.adminUser.create({
      data: {
        tenantId: session.tenantId,
        email: email.toLowerCase(),
        username,
        displayName: displayName || username,
        passwordHash,
        role: targetRole,
        permissions: permissions || [],
        locationIds: locationIds || [],
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
        createdAt: true,
      },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    console.error('Error creating tenant user:', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}
