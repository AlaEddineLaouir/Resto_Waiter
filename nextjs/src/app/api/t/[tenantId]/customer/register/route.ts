/**
 * POST /api/t/[tenantId]/customer/register
 *
 * Register a new customer account for the restaurant tenant.
 * Body: { email, password, name?, phone? }
 * Returns: { customer, token }
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcrypt';
import { createCustomerToken } from '@/lib/customer-auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId: tenantSlug } = await params;
    const body = await request.json();
    const { email, password, name, phone } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Find tenant
    const tenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug },
      select: { id: true, name: true },
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    // Check if email already registered for this tenant
    const existing = await prisma.customer.findUnique({
      where: { tenantId_email: { tenantId: tenant.id, email: email.toLowerCase() } },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'An account with this email already exists. Please log in.' },
        { status: 409 }
      );
    }

    // Create customer
    const passwordHash = await bcrypt.hash(password, 10);
    const customer = await prisma.customer.create({
      data: {
        tenantId: tenant.id,
        email: email.toLowerCase(),
        name: name || null,
        phone: phone || null,
        passwordHash,
        isGuest: false,
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        isGuest: true,
        createdAt: true,
      },
    });

    // Create JWT
    const token = await createCustomerToken({
      customerId: customer.id,
      tenantId: tenant.id,
      email: customer.email!,
      name: customer.name,
    });

    const response = NextResponse.json({ customer, token }, { status: 201 });

    // Set cookie
    response.cookies.set('customer-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
    });

    return response;
  } catch (error) {
    console.error('Customer register error:', error);
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}
