import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/rbac';

// Get all allergens (global vocabulary)
export async function GET(req: Request) {
  try {
    const guard = await requirePermission('allergen.read');
    if (!guard.authorized) return guard.response;

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
