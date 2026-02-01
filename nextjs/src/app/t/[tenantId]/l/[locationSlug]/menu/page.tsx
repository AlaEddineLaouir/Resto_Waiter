import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';

interface LocationMenuPageProps {
  params: Promise<{
    tenantId: string;
    locationSlug: string;
  }>;
}

async function getLocationMenuData(tenantSlug: string, locationSlug: string) {
  try {
    // Find tenant by slug
    const tenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug },
      select: {
        id: true,
        name: true,
        slug: true,
        defaultLocale: true,
      },
    });

    if (!tenant) return null;

    // Find location by slug within this tenant
    const location = await prisma.location.findFirst({
      where: {
        tenantId: tenant.id,
        slug: locationSlug,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        city: true,
        phone: true,
        addressLine1: true,
        brand: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    if (!location) return null;

    // Get menu IDs published to this location
    const publications = await prisma.menuPublication.findMany({
      where: {
        locationId: location.id,
        isCurrent: true,
      },
      select: { menuId: true },
    });

    const menuIds = publications.map((p) => p.menuId);

    // Get published menus for this location using MenuLine (hierarchical structure)
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
            section: {
              include: { translations: true },
            },
            item: {
              include: {
                translations: true,
                priceBase: true,
                ingredients: { include: { ingredient: true } },
                allergens: {
                  include: { allergen: { include: { translations: true } } },
                },
                dietaryFlags: {
                  include: { dietaryFlag: { include: { translations: true } } },
                },
              },
            },
            parentLine: true,
          },
        },
      },
    });

    return { tenant, location, menus };
  } catch (error) {
    console.error('Error fetching location menu:', error);
    return null;
  }
}

// Type definitions
type MenuData = NonNullable<Awaited<ReturnType<typeof getLocationMenuData>>>;
type Menu = MenuData['menus'][0];
type MenuLine = Menu['lines'][0];
type ItemType = NonNullable<MenuLine['item']>;

// Helper to get translation
function getTranslation<T extends { locale: string }>(
  translations: T[],
  locale: string,
  fallback: string = 'en-US'
): T | undefined {
  return (
    translations.find((t) => t.locale === locale) ||
    translations.find((t) => t.locale === fallback) ||
    translations[0]
  );
}

// Build sections with items from MenuLine hierarchy
function buildSectionsFromLines(lines: MenuLine[], locale: string, menuName: string) {
  // Get section lines (lineType = 'section')
  const sectionLines = lines.filter((l) => l.lineType === 'section' && l.section?.isActive);

  return sectionLines.map((sectionLine) => {
    // Get items for this section (items with parentLineId = this section's id)
    const itemLines = lines.filter(
      (l) => l.lineType === 'item' && l.parentLineId === sectionLine.id && l.item?.isVisible
    );

    return {
      id: sectionLine.section!.id,
      translations: sectionLine.section!.translations,
      displayOrder: sectionLine.displayOrder,
      items: itemLines.map((il) => il.item!),
      menuName,
    };
  });
}

export default async function LocationMenuPage({ params }: LocationMenuPageProps) {
  const { tenantId, locationSlug } = await params;
  const data = await getLocationMenuData(tenantId, locationSlug);

  if (!data) {
    notFound();
  }

  const { tenant, location, menus } = data;
  const locale = tenant.defaultLocale || 'en-US';

  // Build sections from menu lines hierarchy
  const allSections = menus.flatMap((menu) => {
    const menuTrans = getTranslation(menu.translations, locale);
    const menuName = menuTrans?.name || menu.code;
    return buildSectionsFromLines(menu.lines, locale, menuName);
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Location Bar */}
      <div className="bg-gradient-to-r from-amber-600 to-orange-600 text-white">
        <div className="max-w-6xl mx-auto px-4 py-2 flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <span className="text-amber-200">📍</span>
            <span className="font-medium">{location.name}</span>
            {location.city && (
              <span className="text-amber-200">• {location.city}</span>
            )}
          </div>
          <Link
            href={`/t/${tenantId}`}
            className="hover:text-amber-200 transition-colors"
          >
            All Locations
          </Link>
        </div>
      </div>

      {/* Header */}
      <header className="bg-gradient-to-r from-teal-600 to-teal-700 text-white">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">{tenant.name}</h1>
              <p className="text-teal-100 mt-1">{location.name} - Menu</p>
            </div>
            <Link
              href={`/t/${tenantId}/l/${locationSlug}`}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors flex items-center gap-2"
            >
              <span>💬</span>
              <span>Chat with AI</span>
            </Link>
          </div>

          {/* Location Info */}
          <div className="mt-4 flex flex-wrap gap-4 text-sm text-teal-100">
            {location.addressLine1 && (
              <div className="flex items-center gap-1">
                <span>📍</span>
                <span>
                  {location.addressLine1}
                  {location.city && `, ${location.city}`}
                </span>
              </div>
            )}
            {location.phone && (
              <div className="flex items-center gap-1">
                <span>📞</span>
                <span>{location.phone}</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Menu Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {allSections.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No menu items available at this location yet.</p>
            <Link
              href={`/t/${tenantId}/menu`}
              className="text-teal-600 hover:text-teal-700 mt-2 inline-block"
            >
              View main menu →
            </Link>
          </div>
        ) : (
          <div className="space-y-12">
            {allSections.map((section) => {
              const sectionTrans = getTranslation(section.translations, locale);
              return (
                <section key={section.id}>
                  <div className="border-b border-gray-200 pb-2 mb-6">
                    <h2 className="text-2xl font-semibold text-gray-800">
                      {sectionTrans?.title || 'Section'}
                    </h2>
                    {sectionTrans?.description && (
                      <p className="text-gray-500 mt-1">{sectionTrans.description}</p>
                    )}
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    {section.items.map((item: ItemType) => {
                      const itemTrans = getTranslation(item.translations, locale);
                      const price = item.priceBase
                        ? (Number(item.priceBase.amountMinor) / 100).toFixed(2)
                        : null;

                      return (
                        <div
                          key={item.id}
                          className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
                        >
                          <div className="p-4">
                            <div className="flex justify-between items-start gap-4">
                              <div className="flex-1">
                                <h3 className="font-semibold text-lg text-gray-800">
                                  {itemTrans?.name || 'Item'}
                                </h3>
                                {itemTrans?.description && (
                                  <p className="text-gray-600 text-sm mt-1">
                                    {itemTrans.description}
                                  </p>
                                )}
                              </div>
                              {price && (
                                <span className="font-bold text-teal-600 text-lg whitespace-nowrap">
                                  €{price}
                                </span>
                              )}
                            </div>

                            {/* Dietary Tags */}
                            {item.dietaryFlags.length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-3">
                                {item.dietaryFlags.map((df) => {
                                  const dfTrans = getTranslation(
                                    df.dietaryFlag.translations,
                                    locale
                                  );
                                  return (
                                    <span
                                      key={df.dietaryFlag.code}
                                      className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full"
                                    >
                                      🏷️ {dfTrans?.name || df.dietaryFlag.code}
                                    </span>
                                  );
                                })}
                              </div>
                            )}

                            {/* Spiciness */}
                            {item.spicinessLevel && item.spicinessLevel > 0 && (
                              <div className="mt-2">
                                <span className="text-xs text-orange-600">
                                  {'🌶️'.repeat(item.spicinessLevel)}
                                </span>
                              </div>
                            )}

                            {/* Ingredients */}
                            {item.ingredients.length > 0 && (
                              <div className="mt-3 pt-3 border-t border-gray-100">
                                <p className="text-xs text-gray-500">
                                  <span className="font-medium">Ingredients: </span>
                                  {item.ingredients
                                    .map((ii) => ii.ingredient.name)
                                    .join(', ')}
                                </p>
                              </div>
                            )}

                            {/* Allergens */}
                            {item.allergens.length > 0 && (
                              <div className="mt-2">
                                <p className="text-xs text-orange-600">
                                  <span className="font-medium">⚠️ Allergens: </span>
                                  {item.allergens
                                    .map((a) => {
                                      const aTrans = getTranslation(
                                        a.allergen.translations,
                                        locale
                                      );
                                      return aTrans?.name || a.allergen.code;
                                    })
                                    .join(', ')}
                                </p>
                              </div>
                            )}

                            {/* Calories */}
                            {item.calories && (
                              <div className="mt-2">
                                <span className="text-xs text-gray-500">
                                  📊 {item.calories} cal
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-gray-100 border-t mt-12">
        <div className="max-w-6xl mx-auto px-4 py-6 text-center text-gray-500 text-sm">
          <p>Have questions about our menu?</p>
          <Link
            href={`/t/${tenantId}/l/${locationSlug}`}
            className="text-teal-600 hover:text-teal-700 font-medium"
          >
            Chat with our AI assistant →
          </Link>
        </div>
      </footer>
    </div>
  );
}

export async function generateMetadata({ params }: LocationMenuPageProps) {
  const { tenantId, locationSlug } = await params;
  const data = await getLocationMenuData(tenantId, locationSlug);

  if (!data) {
    return {
      title: 'Menu Not Found',
    };
  }

  const { tenant, location } = data;

  return {
    title: `Menu - ${tenant.name} ${location.name}`,
    description: `View the full menu at ${tenant.name} ${location.name}${location.city ? ` in ${location.city}` : ''}`,
  };
}
