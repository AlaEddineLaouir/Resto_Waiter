import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/t/[tenantId]/sessions/[code]/orders — Get all orders in a session
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; code: string }> }
) {
  try {
    const { tenantId: tenantSlug, code } = await params;

    const tenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug },
      select: { id: true },
    });
    if (!tenant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    const session = await prisma.tableSession.findUnique({
      where: { sessionCode: code },
      select: {
        id: true,
        tenantId: true,
        sessionCode: true,
        status: true,
        table: { select: { label: true, friendlyName: true } },
      },
    });

    if (!session || session.tenantId !== tenant.id) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const orders = await prisma.order.findMany({
      where: { sessionId: session.id },
      orderBy: { createdAt: 'desc' },
      include: {
        items: { orderBy: { createdAt: 'asc' } },
      },
    });

    // Serialize BigInt
    const serialized = orders.map((order: { subtotalMinor: bigint; taxMinor: bigint; totalMinor: bigint; items: { unitPriceMinor: bigint; totalPriceMinor: bigint; [key: string]: unknown }[]; [key: string]: unknown }) => ({
      ...order,
      subtotalMinor: Number(order.subtotalMinor),
      taxMinor: Number(order.taxMinor),
      totalMinor: Number(order.totalMinor),
      items: order.items.map((item: { unitPriceMinor: bigint; totalPriceMinor: bigint; [key: string]: unknown }) => ({
        ...item,
        unitPriceMinor: Number(item.unitPriceMinor),
        totalPriceMinor: Number(item.totalPriceMinor),
      })),
    }));

    return NextResponse.json({
      session: {
        sessionCode: session.sessionCode,
        status: session.status,
        table: session.table,
      },
      orders: serialized,
    });
  } catch (error) {
    console.error('Error fetching session orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}
