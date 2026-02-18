import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/t/[tenantId]/orders — Submit a new order from the cart
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId: tenantSlug } = await params;
    const body = await request.json();
    const { sessionCode, items, specialInstructions } = body;

    if (!sessionCode || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'sessionCode and items[] are required' },
        { status: 400 }
      );
    }

    // Find tenant
    const tenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug },
      select: { id: true, defaultCurrency: true },
    });
    if (!tenant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    // Find active session
    const session = await prisma.tableSession.findUnique({
      where: { sessionCode },
    });
    if (!session || session.tenantId !== tenant.id || session.status !== 'open') {
      return NextResponse.json({ error: 'Invalid or closed session' }, { status: 400 });
    }

    // Calculate order number (auto-increment per location per day)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const orderCount = await prisma.order.count({
      where: {
        tenantId: tenant.id,
        session: { locationId: session.locationId },
        createdAt: { gte: today },
      },
    });
    const orderNumber = orderCount + 1;

    // Build order items and calculate totals
    const orderItems: {
      tenantId: string;
      itemId: string;
      itemName: string;
      quantity: number;
      unitPriceMinor: bigint;
      totalPriceMinor: bigint;
      selectedOptions: unknown;
      specialNote?: string;
    }[] = [];

    let subtotalMinor = BigInt(0);

    for (const cartItem of items) {
      const optionsDelta = (cartItem.selectedOptions || []).reduce(
        (sum: number, o: { deltaMinor: number }) => sum + (o.deltaMinor || 0),
        0
      );
      const unitPrice = BigInt(cartItem.unitPriceMinor + optionsDelta);
      const lineTotal = unitPrice * BigInt(cartItem.quantity);

      orderItems.push({
        tenantId: tenant.id,
        itemId: cartItem.itemId,
        itemName: cartItem.itemName,
        quantity: cartItem.quantity,
        unitPriceMinor: BigInt(cartItem.unitPriceMinor),
        totalPriceMinor: lineTotal,
        selectedOptions: cartItem.selectedOptions || [],
        specialNote: cartItem.specialNote || undefined,
      });

      subtotalMinor += lineTotal;
    }

    // Create the order with items
    const order = await prisma.order.create({
      data: {
        tenantId: tenant.id,
        sessionId: session.id,
        orderNumber,
        status: 'pending',
        specialInstructions: specialInstructions || null,
        subtotalMinor,
        taxMinor: BigInt(0), // TODO: calculate tax based on priceTaxPolicy
        totalMinor: subtotalMinor,
        currency: tenant.defaultCurrency,
        items: {
          create: orderItems,
        },
      },
      include: {
        items: true,
      },
    });

    // Serialize BigInt for JSON response
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

    return NextResponse.json({ order: serialized }, { status: 201 });
  } catch (error) {
    console.error('Error creating order:', error);
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    );
  }
}
