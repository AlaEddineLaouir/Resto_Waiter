import { NextResponse } from 'next/server';
import { getRestaurantSession } from '@/lib/restaurant-auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getRestaurantSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ingredients = await prisma.ingredient.findMany({
      where: {
        tenantId: session.tenantId,
      },
      include: {
        _count: { select: { items: true } },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ ingredients });
  } catch (error) {
    console.error('Get ingredients error:', error);
    return NextResponse.json({ error: 'Failed to get ingredients' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getRestaurantSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, allergenCode, isAllergen } = await req.json();

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const ingredient = await prisma.ingredient.create({
      data: {
        tenantId: session.tenantId,
        name,
        allergenCode,
        isAllergen: isAllergen || false,
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId: session.tenantId,
        userId: session.id,
        action: 'CREATE',
        entityType: 'ingredient',
        entityId: ingredient.id,
        newValues: { name, isAllergen },
      },
    });

    return NextResponse.json({ ingredient }, { status: 201 });
  } catch (error) {
    console.error('Create ingredient error:', error);
    return NextResponse.json({ error: 'Failed to create ingredient' }, { status: 500 });
  }
}
