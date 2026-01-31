import { NextResponse } from 'next/server';
import { getRestaurantSession } from '@/lib/restaurant-auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getRestaurantSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const categories = await prisma.category.findMany({
      where: {
        tenantId: session.tenantId,
        deletedAt: null,
      },
      include: {
        _count: { select: { dishes: true } },
      },
      orderBy: { displayOrder: 'asc' },
    });

    return NextResponse.json({ categories });
  } catch (error) {
    console.error('Get categories error:', error);
    return NextResponse.json({ error: 'Failed to get categories' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getRestaurantSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, description, displayOrder } = await req.json();

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Get max display order if not provided
    let order = displayOrder;
    if (order === undefined) {
      const maxOrder = await prisma.category.findFirst({
        where: { tenantId: session.tenantId },
        orderBy: { displayOrder: 'desc' },
        select: { displayOrder: true },
      });
      order = (maxOrder?.displayOrder || 0) + 1;
    }

    const category = await prisma.category.create({
      data: {
        tenantId: session.tenantId,
        name,
        description,
        displayOrder: order,
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        tenantId: session.tenantId,
        userId: session.id,
        action: 'CREATE',
        entityType: 'category',
        entityId: category.id,
        newValues: { name, description },
      },
    });

    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    console.error('Create category error:', error);
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
  }
}
