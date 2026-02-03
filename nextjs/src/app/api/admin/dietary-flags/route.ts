import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/rbac';

// Get all dietary flags (global vocabulary)
export async function GET(req: Request) {
  try {
    const guard = await requirePermission('dietary.read');
    if (!guard.authorized) return guard.response;

    const { searchParams } = new URL(req.url);
    const locale = searchParams.get('locale') || 'en-US';

    const dietaryFlags = await prisma.dietaryFlag.findMany({
      include: {
        translations: {
          where: { locale },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    // Format response with localized names
    const formattedFlags = dietaryFlags.map((f) => ({
      code: f.code,
      name: f.translations[0]?.name || f.code,
      sortOrder: f.sortOrder,
    }));

    return NextResponse.json({ dietaryFlags: formattedFlags });
  } catch (error) {
    console.error('Get dietary flags error:', error);
    return NextResponse.json({ error: 'Failed to get dietary flags' }, { status: 500 });
  }
}
