import { NextResponse } from 'next/server';
import { getRestaurantSession } from '@/lib/restaurant-auth';
import { prisma } from '@/lib/prisma';

// Get all allergens (global vocabulary)
export async function GET(req: Request) {
  try {
    const session = await getRestaurantSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const locale = searchParams.get('locale') || 'en-US';

    const allergens = await prisma.allergen.findMany({
      include: {
        translations: {
          where: { locale },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    // Format response with localized names
    const formattedAllergens = allergens.map((a) => ({
      code: a.code,
      name: a.translations[0]?.name || a.code,
      sortOrder: a.sortOrder,
    }));

    return NextResponse.json({ allergens: formattedAllergens });
  } catch (error) {
    console.error('Get allergens error:', error);
    return NextResponse.json({ error: 'Failed to get allergens' }, { status: 500 });
  }
}
