import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/t/[tenantId]/orders/[id] — Get order status
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; id: string }> }
) {
  try {
    const { tenantId: tenantSlug, id } = await params;

    const tenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug },
      select: { id: true },
    });
    if (!tenant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    const order = await prisma.order.findFirst({
      where: { id, tenantId: tenant.id },
      include: {
        items: { orderBy: { createdAt: 'asc' } },
        session: {
          select: {
            sessionCode: true,
            table: { select: { label: true } },
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Serialize BigInt
    const serialized = {
      ...order,
      subtotalMinor: Number(order.subtotalMinor),
      taxMinor: Number(order.taxMinor),
      totalMinor: Number(order.totalMinor),
      items: order.items.map((item: { unitPriceMinor: bigint; totalPriceMinor: bigint; [key: string]: unknown }) => ({
        ...item,
        unitPriceMinor: Number(item.unitPriceMinor),
        totalPriceMinor: Number(item.totalPriceMinor),
      })),
    };

    return NextResponse.json({ order: serialized });
  } catch (error) {
    console.error('Error fetching order:', error);
    return NextResponse.json(
      { error: 'Failed to fetch order' },
      { status: 500 }
    );
  }
}
