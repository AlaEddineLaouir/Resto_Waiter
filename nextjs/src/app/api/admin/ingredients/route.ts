import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/rbac';

export async function GET() {
  try {
    const guard = await requirePermission('ingredients.read');
    if (!guard.authorized) return guard.response;
    const session = guard.user!;

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
    const guard = await requirePermission('ingredients.create');
    if (!guard.authorized) return guard.response;
    const session = guard.user!;

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
