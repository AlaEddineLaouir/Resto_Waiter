import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/t/[tenantId]/l/[locationSlug]/menu — Get published menu for location
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; locationSlug: string }> }
) {
  try {
    const { tenantId: tenantSlug, locationSlug } = await params;

    // Find tenant
    const tenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug },
      select: { id: true, name: true, slug: true, defaultLocale: true, defaultCurrency: true },
    });
    if (!tenant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    // Find location
    const location = await prisma.location.findFirst({
      where: { tenantId: tenant.id, slug: locationSlug, isActive: true },
      select: { id: true, name: true, slug: true, city: true },
    });
    if (!location) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 });
    }

    // Get published menus for this location
    const publications = await prisma.menuPublication.findMany({
      where: { locationId: location.id, isCurrent: true },
      select: { menuId: true },
    });
    const menuIds = publications.map((p) => p.menuId);

    const menus = await prisma.menu.findMany({
      where: {
        tenantId: tenant.id,
        id: { in: menuIds },
        status: 'published',
      },
      include: {
        translations: true,
        lines: {
          where: { isEnabled: true },
          orderBy: { displayOrder: 'asc' },
          include: {
            section: { include: { translations: true } },
            item: {
              include: {
                translations: true,
                priceBase: true,
                ingredients: { include: { ingredient: true } },
                allergens: { include: { allergen: { include: { translations: true } } } },
                dietaryFlags: { include: { dietaryFlag: { include: { translations: true } } } },
                optionGroups: {
                  orderBy: { displayOrder: 'asc' },
                  include: {
                    optionGroup: {
                      include: {
                        translations: true,
                        options: {
                          where: { isActive: true },
                          orderBy: { displayOrder: 'asc' },
                          include: {
                            translations: true,
                            price: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            parentLine: true,
          },
        },
      },
    });

    const locale = tenant.defaultLocale || 'en-US';

    // Build sections from menu lines
    const sections = menus.flatMap((menu) => {
      const menuTrans = menu.translations.find((t) => t.locale === locale) ||
        menu.translations.find((t) => t.locale === 'en-US') ||
        menu.translations[0];
      const menuName = menuTrans?.name || menu.code;

      const sectionLines = menu.lines.filter(
        (l) => l.lineType === 'section' && l.section?.isActive
      );

      return sectionLines.map((sectionLine) => {
        const itemLines = menu.lines.filter(
          (l) => l.lineType === 'item' && l.parentLineId === sectionLine.id && l.item?.isVisible
        );

        return {
          id: sectionLine.section!.id,
          translations: sectionLine.section!.translations,
          displayOrder: sectionLine.displayOrder,
          items: itemLines.map((il) => {
            const item = il.item!;
            return {
              ...item,
              priceBase: item.priceBase
                ? {
                    amountMinor: String(item.priceBase.amountMinor),
                    currency: item.priceBase.currency,
                  }
                : null,
              optionGroups: item.optionGroups.map((iog) => ({
                optionGroup: {
                  ...iog.optionGroup,
                  options: iog.optionGroup.options.map((opt) => ({
                    ...opt,
                    price: opt.price
                      ? { deltaMinor: String(opt.price.deltaMinor), currency: opt.price.currency }
                      : null,
                  })),
                },
              })),
            };
          }),
          menuName,
        };
      });
    });

    return NextResponse.json({
      tenant: {
        name: tenant.name,
        slug: tenant.slug,
        defaultLocale: tenant.defaultLocale,
      },
      location: {
        name: location.name,
        slug: location.slug,
        city: location.city,
      },
      sections,
    });
  } catch (error) {
    console.error('Error fetching location menu:', error);
    return NextResponse.json({ error: 'Failed to fetch menu' }, { status: 500 });
  }
}
