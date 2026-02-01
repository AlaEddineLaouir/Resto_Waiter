import { NextResponse } from 'next/server';
import { getRestaurantSession } from '@/lib/restaurant-auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/admin/locations/tree
 * Returns hierarchical tree: Brand → Location → Menus with publication status
 */
export async function GET() {
  try {
    const session = await getRestaurantSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all brands with their locations
    const brands = await prisma.brand.findMany({
      where: { tenantId: session.tenantId },
      include: {
        locations: {
          include: {
            menuPublications: {
              include: {
                menu: {
                  include: {
                    translations: {
                      where: { locale: 'en-US' },
                      take: 1,
                    },
                  },
                },
              },
            },
          },
          orderBy: { name: 'asc' },
        },
        menus: {
          include: {
            translations: {
              where: { locale: 'en-US' },
              take: 1,
            },
            _count: { select: { menuSections: true } },
          },
          orderBy: { code: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Transform into tree structure
    const tree = brands.map((brand) => ({
      id: brand.id,
      name: brand.name,
      slug: brand.slug,
      type: 'brand' as const,
      locations: brand.locations.map((location) => {
        // Get active menu publications for this location
        const activePublications = location.menuPublications.filter((p) => p.isCurrent);
        const activeMenuIds = new Set(activePublications.map((p) => p.menu.id));

        return {
          id: location.id,
          name: location.name,
          city: location.city,
          countryCode: location.countryCode,
          isActive: location.isActive,
          type: 'location' as const,
          menus: brand.menus.map((menu) => {
            const isActive = activeMenuIds.has(menu.id);
            const publication = activePublications.find((p) => p.menu.id === menu.id);

            return {
              id: menu.id,
              code: menu.code,
              name: menu.translations[0]?.name || menu.code,
              status: menu.status,
              isActive,
              publicationId: publication?.id || null,
              isPublished: menu.status === 'published',
              sectionCount: menu._count.menuSections,
              type: 'menu' as const,
            };
          }),
        };
      }),
    }));

    return NextResponse.json({ tree });
  } catch (error) {
    console.error('Get location tree error:', error);
    return NextResponse.json({ error: 'Failed to get location tree' }, { status: 500 });
  }
}
