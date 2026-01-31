import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { createRestaurantToken, verifyPassword } from '@/lib/restaurant-auth';

export async function POST(req: Request) {
  try {
    const { email, password, tenantSlug = 'default' } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Find tenant
    const tenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug },
    });

    if (!tenant) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Find admin user
    const admin = await prisma.adminUser.findFirst({
      where: {
        tenantId: tenant.id,
        email: email.toLowerCase(),
        isActive: true,
      },
    });

    if (!admin) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Verify password
    const validPassword = await verifyPassword(password, admin.passwordHash);
    if (!validPassword) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Create token
    const token = await createRestaurantToken({
      id: admin.id,
      email: admin.email,
      tenantId: tenant.id,
      role: admin.role,
    });

    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set('restaurant-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24,
      path: '/',
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        tenantId: tenant.id,
        userId: admin.id,
        action: 'LOGIN',
        entityType: 'admin_user',
        entityId: admin.id,
        newValues: { ip: req.headers.get('x-forwarded-for') || 'unknown' },
      },
    });

    return NextResponse.json({
      success: true,
      admin: {
        id: admin.id,
        email: admin.email,
        username: admin.username,
        role: admin.role,
      },
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
      },
    });
  } catch (error) {
    console.error('Restaurant login error:', error);
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    );
  }
}
