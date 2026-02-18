import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getRestaurantSession } from '@/lib/restaurant-auth';
import { getPermissionsForRole } from '@/lib/rbac/roles';

// GET /api/admin/orders — List orders (filterable)
export async function GET(request: NextRequest) {
  try {
    const session = await getRestaurantSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permission
    const permissions = session.permissions || getPermissionsForRole(session.role);
    if (!permissions.includes('orders.read')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const locationId = searchParams.get('locationId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: Record<string, unknown> = {
      tenantId: session.tenantId,
    };

    if (status) {
      where.status = status;
    }

    if (locationId) {
      where.session = { locationId };
    } else if (session.locationIds && session.locationIds.length > 0) {
      // Scope to user's assigned locations
      where.session = { locationId: { in: session.locationIds } };
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          items: { orderBy: { createdAt: 'asc' } },
          session: {
            select: {
              sessionCode: true,
              locationId: true,
              table: { select: { label: true, friendlyName: true } },
            },
          },
        },
      }),
      prisma.order.count({ where }),
    ]);

    // Serialize BigInt
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

    return NextResponse.json({ orders: serialized, total, limit, offset });
  } catch (error) {
    console.error('Error fetching admin orders:', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}
