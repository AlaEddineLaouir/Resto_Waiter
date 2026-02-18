import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getRestaurantSession } from '@/lib/restaurant-auth';
import { getPermissionsForRole } from '@/lib/rbac/roles';

// GET /api/admin/kitchen/queue — Kitchen queue (confirmed + preparing orders)
export async function GET(_request: NextRequest) {
  try {
    const session = await getRestaurantSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const permissions = session.permissions || getPermissionsForRole(session.role);
    if (!permissions.includes('orders.read')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const where: Record<string, unknown> = {
      tenantId: session.tenantId,
      status: { in: ['confirmed', 'preparing', 'ready'] },
    };

    // Scope to user's assigned locations if applicable
    if (session.locationIds && session.locationIds.length > 0) {
      where.session = { locationId: { in: session.locationIds } };
    }

    const orders = await prisma.order.findMany({
      where,
      orderBy: { createdAt: 'asc' },
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
    });

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

    // Group by status for swim lanes
    const queue = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      confirmed: serialized.filter((o: any) => o.status === 'confirmed'),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      preparing: serialized.filter((o: any) => o.status === 'preparing'),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ready: serialized.filter((o: any) => o.status === 'ready'),
    };

    return NextResponse.json({ queue });
  } catch (error) {
    console.error('Error fetching kitchen queue:', error);
    return NextResponse.json({ error: 'Failed to fetch kitchen queue' }, { status: 500 });
  }
}
