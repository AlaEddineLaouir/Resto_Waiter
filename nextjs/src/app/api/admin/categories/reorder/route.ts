import { NextResponse } from 'next/server';
import { getRestaurantSession } from '@/lib/restaurant-auth';
import { prisma } from '@/lib/prisma';

export async function PUT(req: Request) {
  try {
    const session = await getRestaurantSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { categories } = await req.json();

    if (!Array.isArray(categories)) {
      return NextResponse.json({ error: 'Categories array required' }, { status: 400 });
    }

    // Update display orders
    await prisma.$transaction(
      categories.map((cat: { id: string; displayOrder: number }) =>
        prisma.category.update({
          where: { id: cat.id },
          data: { displayOrder: cat.displayOrder },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Reorder categories error:', error);
    return NextResponse.json({ error: 'Failed to reorder categories' }, { status: 500 });
  }
}
