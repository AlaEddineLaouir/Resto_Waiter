/**
 * GET /api/t/[tenantId]/customer/orders
 *
 * Returns the authenticated customer's order history across all sessions.
 * Supports pagination: ?page=1&limit=10
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyCustomerToken } from '@/lib/customer-auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId: tenantSlug } = await params;

    // Auth check
    const token =
      request.cookies.get('customer-token')?.value ||
      request.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const session = await verifyCustomerToken(token);
    if (!session) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Verify tenant
    const tenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug },
      select: { id: true },
    });
    if (!tenant || tenant.id !== session.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Pagination
    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
    const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '10')));
    const offset = (page - 1) * limit;

    // Get sessions for this customer
    const customerSessions = await prisma.tableSession.findMany({
      where: {
        tenantId: tenant.id,
        customerId: session.customerId,
      },
      select: { id: true },
    });

    const sessionIds = customerSessions.map((s) => s.id);

    // Get orders for those sessions
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where: {
          tenantId: tenant.id,
          sessionId: { in: sessionIds },
        },
        include: {
          items: {
            orderBy: { createdAt: 'asc' },
          },
          session: {
            select: {
              sessionCode: true,
              table: {
                select: { label: true, friendlyName: true },
              },
              openedAt: true,
              closedAt: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.order.count({
        where: {
          tenantId: tenant.id,
          sessionId: { in: sessionIds },
        },
      }),
    ]);

    // Serialize BigInt values
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const serialized = orders.map((order: any) => ({
      ...order,
      subtotalMinor: Number(order.subtotalMinor),
      taxMinor: Number(order.taxMinor),
      totalMinor: Number(order.totalMinor),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      items: order.items.map((item: any) => ({
        ...item,
        unitPriceMinor: Number(item.unitPriceMinor),
        totalPriceMinor: Number(item.totalPriceMinor),
      })),
    }));

    return NextResponse.json({
      orders: serialized,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Customer orders error:', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}
