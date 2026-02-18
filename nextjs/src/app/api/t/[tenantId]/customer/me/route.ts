/**
 * GET  /api/t/[tenantId]/customer/me  → current customer profile
 * POST /api/t/[tenantId]/customer/me  → update profile (name, phone, dietary preferences)
 * DELETE /api/t/[tenantId]/customer/me → logout (clear cookie)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyCustomerToken } from '@/lib/customer-auth';

async function getCustomerFromRequest(request: NextRequest) {
  const token =
    request.cookies.get('customer-token')?.value ||
    request.headers.get('authorization')?.replace('Bearer ', '');

  if (!token) return null;
  return verifyCustomerToken(token);
}

// GET: current customer profile + stats
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId: tenantSlug } = await params;
    const session = await getCustomerFromRequest(request);

    if (!session) {
      return NextResponse.json({ customer: null }, { status: 200 });
    }

    // Verify tenant matches
    const tenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug },
      select: { id: true },
    });
    if (!tenant || tenant.id !== session.tenantId) {
      return NextResponse.json({ customer: null }, { status: 200 });
    }

    const customer = await prisma.customer.findUnique({
      where: { id: session.customerId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        isGuest: true,
        locale: true,
        dietaryPreferences: true,
        createdAt: true,
        _count: {
          select: {
            tableSessions: true,
            favorites: true,
            feedback: true,
          },
        },
      },
    });

    if (!customer) {
      return NextResponse.json({ customer: null }, { status: 200 });
    }

    return NextResponse.json({ customer });
  } catch (error) {
    console.error('Customer me error:', error);
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}

// POST: update profile
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const session = await getCustomerFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    await params; // consume params
    const body = await request.json();
    const { name, phone, locale, dietaryPreferences } = body;

    const updated = await prisma.customer.update({
      where: { id: session.customerId },
      data: {
        ...(name !== undefined && { name }),
        ...(phone !== undefined && { phone }),
        ...(locale !== undefined && { locale }),
        ...(dietaryPreferences !== undefined && { dietaryPreferences }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        locale: true,
        dietaryPreferences: true,
      },
    });

    return NextResponse.json({ customer: updated });
  } catch (error) {
    console.error('Customer update error:', error);
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
}

// DELETE: logout (clear cookie)
export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set('customer-token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}
