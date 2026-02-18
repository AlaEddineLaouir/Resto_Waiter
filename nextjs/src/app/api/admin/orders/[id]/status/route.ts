import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getRestaurantSession } from '@/lib/restaurant-auth';
import { getPermissionsForRole } from '@/lib/rbac/roles';

// PATCH /api/admin/orders/[id]/status — Update order status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getRestaurantSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const permissions = session.permissions || getPermissionsForRole(session.role);
    if (!permissions.includes('orders.update')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { status, cancelReason } = body;

    const validTransitions: Record<string, string[]> = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['preparing', 'cancelled'],
      preparing: ['ready', 'cancelled'],
      ready: ['served'],
      served: ['completed'],
    };

    // Fetch current order
    const order = await prisma.order.findFirst({
      where: { id, tenantId: session.tenantId },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Validate transition
    const allowed = validTransitions[order.status] || [];
    if (!allowed.includes(status)) {
      return NextResponse.json(
        { error: `Cannot transition from '${order.status}' to '${status}'` },
        { status: 400 }
      );
    }

    // Role-based restrictions:
    // Chef can only: confirmed→preparing, preparing→ready
    if (session.role === 'chef') {
      const chefAllowed = ['preparing', 'ready'];
      if (!chefAllowed.includes(status)) {
        return NextResponse.json({ error: 'Chefs can only update to preparing or ready' }, { status: 403 });
      }
    }

    // Build update data
    const updateData: Record<string, unknown> = { status };
    const now = new Date();

    switch (status) {
      case 'confirmed':
        updateData.confirmedById = session.id;
        updateData.confirmedAt = now;
        break;
      case 'preparing':
        updateData.prepStartedAt = now;
        break;
      case 'ready':
        updateData.readyAt = now;
        break;
      case 'served':
        updateData.servedAt = now;
        updateData.servedById = session.id;
        break;
      case 'cancelled':
        updateData.cancelledAt = now;
        updateData.cancelReason = cancelReason || null;
        break;
    }

    const updated = await prisma.order.update({
      where: { id },
      data: updateData,
      include: {
        items: true,
        session: {
          select: {
            sessionCode: true,
            table: { select: { label: true } },
          },
        },
      },
    });

    // Also update individual item statuses to match order status for certain transitions
    if (['preparing', 'ready', 'served', 'cancelled'].includes(status)) {
      const itemStatusMap: Record<string, string> = {
        preparing: 'preparing',
        ready: 'ready',
        served: 'served',
        cancelled: 'cancelled',
      };
      await prisma.orderItem.updateMany({
        where: {
          orderId: id,
          status: { not: 'cancelled' }, // don't un-cancel items
        },
        data: { status: itemStatusMap[status] as 'pending' | 'preparing' | 'ready' | 'served' | 'cancelled' },
      });
    }

    // Serialize BigInt
    const serialized = {
      ...updated,
      subtotalMinor: Number(updated.subtotalMinor),
      taxMinor: Number(updated.taxMinor),
      totalMinor: Number(updated.totalMinor),
      items: updated.items.map((item: { unitPriceMinor: bigint; totalPriceMinor: bigint; [key: string]: unknown }) => ({
        ...item,
        unitPriceMinor: Number(item.unitPriceMinor),
        totalPriceMinor: Number(item.totalPriceMinor),
      })),
    };

    return NextResponse.json({ order: serialized });
  } catch (error) {
    console.error('Error updating order status:', error);
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
  }
}
