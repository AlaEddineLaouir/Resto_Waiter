import { NextResponse } from 'next/server';
import { getRestaurantSession } from '@/lib/restaurant-auth';
import { prisma } from '@/lib/prisma';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getRestaurantSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { ingredientIds } = await req.json();

    // Verify dish belongs to tenant
    const dish = await prisma.dish.findFirst({
      where: { id, tenantId: session.tenantId },
    });

    if (!dish) {
      return NextResponse.json({ error: 'Dish not found' }, { status: 404 });
    }

    // Clear existing and add new
    await prisma.dishIngredient.deleteMany({
      where: { dishId: id },
    });

    if (ingredientIds && ingredientIds.length > 0) {
      await prisma.dishIngredient.createMany({
        data: ingredientIds.map((ingredientId: string, index: number) => ({
          dishId: id,
          ingredientId,
          quantity: '1',
          displayOrder: index,
        })),
      });
    }

    const updated = await prisma.dish.findUnique({
      where: { id },
      include: {
        ingredients: {
          include: { ingredient: true },
        },
      },
    });

    return NextResponse.json({ dish: updated });
  } catch (error) {
    console.error('Update dish ingredients error:', error);
    return NextResponse.json({ error: 'Failed to update ingredients' }, { status: 500 });
  }
}
