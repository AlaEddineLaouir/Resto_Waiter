import { NextResponse } from 'next/server';
import { getRestaurantSession } from '@/lib/restaurant-auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getRestaurantSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const ingredient = await prisma.ingredient.findFirst({
      where: {
        id,
        tenantId: session.tenantId,
      },
      include: {
        items: {
          include: {
            item: { 
              include: {
                translations: { where: { locale: 'en-US' } }
              }
            },
          },
        },
      },
    });

    if (!ingredient) {
      return NextResponse.json({ error: 'Ingredient not found' }, { status: 404 });
    }

    return NextResponse.json({ ingredient });
  } catch (error) {
    console.error('Get ingredient error:', error);
    return NextResponse.json({ error: 'Failed to get ingredient' }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getRestaurantSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { name, allergenCode, isAllergen } = await req.json();

    // Verify ownership
    const existing = await prisma.ingredient.findFirst({
      where: { id, tenantId: session.tenantId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Ingredient not found' }, { status: 404 });
    }

    const ingredient = await prisma.ingredient.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(allergenCode !== undefined && { allergenCode }),
        ...(isAllergen !== undefined && { isAllergen }),
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId: session.tenantId,
        userId: session.id,
        action: 'UPDATE',
        entityType: 'ingredient',
        entityId: id,
        oldValues: { name: existing.name },
        newValues: { name: ingredient.name },
      },
    });

    return NextResponse.json({ ingredient });
  } catch (error) {
    console.error('Update ingredient error:', error);
    return NextResponse.json({ error: 'Failed to update ingredient' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getRestaurantSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const existing = await prisma.ingredient.findFirst({
      where: { id, tenantId: session.tenantId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Ingredient not found' }, { status: 404 });
    }

    // Check if used by any items
    const usageCount = await prisma.itemIngredient.count({
      where: { ingredientId: id },
    });

    if (usageCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete ingredient. It is used by ${usageCount} items.` },
        { status: 400 }
      );
    }

    await prisma.ingredient.delete({
      where: { id },
    });

    await prisma.auditLog.create({
      data: {
        tenantId: session.tenantId,
        userId: session.id,
        action: 'DELETE',
        entityType: 'ingredient',
        entityId: id,
        oldValues: { name: existing.name },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete ingredient error:', error);
    return NextResponse.json({ error: 'Failed to delete ingredient' }, { status: 500 });
  }
}
