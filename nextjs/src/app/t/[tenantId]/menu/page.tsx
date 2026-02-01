import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';

interface MenuPageProps {
  params: Promise<{
    tenantId: string;
  }>;
}

async function getMenuData(tenantId: string) {
  try {
    // Try to find by slug first, then by id
    let tenant = await prisma.tenant.findUnique({
      where: { slug: tenantId },
      select: {
        id: true,
        name: true,
        defaultLocale: true,
      },
    });

    // If not found by slug, try by id (for UUID-based lookups)
    if (!tenant) {
      tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: {
          id: true,
          name: true,
          defaultLocale: true,
        },
      });
    }

    if (!tenant) return null;

    // Get published menus with sections and items via join tables
    const menus = await prisma.menu.findMany({
      where: { tenantId: tenant.id, status: 'published' },
      include: {
        translations: true,
        menuSections: {
          where: { section: { isActive: true } },
          orderBy: { displayOrder: 'asc' },
          include: {
            section: {
              include: {
                translations: true,
              },
            },
          },
        },
        menuItems: {
          orderBy: { displayOrder: 'asc' },
          include: {
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
          },
        },
      },
    });

    return { tenant, menus };
  } catch (error) {
    console.error('Error fetching menu:', error);
    return null;
  }
}

// Type definitions for type inference
type MenuData = NonNullable<Awaited<ReturnType<typeof getMenuData>>>;
type MenuItem = MenuData['menus'][0]['menuItems'][0]['item'];
type SectionTranslation = MenuData['menus'][0]['menuSections'][0]['section']['translations'][0];
type MenuTranslation = MenuData['menus'][0]['translations'][0];
type ItemTranslation = MenuItem['translations'][0];

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

export default async function MenuPage({ params }: MenuPageProps) {
  const { tenantId } = await params;
  const data = await getMenuData(tenantId);

  if (!data) {
    notFound();
  }

  const { tenant, menus } = data;
  const locale = tenant.defaultLocale || 'en-US';

  // Flatten all sections from all published menus (via join tables)
  // Items are now linked via menuItems join table
  const allSections = menus.flatMap((menu) =>
    menu.menuSections.map((ms) => {
      // Get items for this section from menuItems, sorted by displayOrder (filter visible items)
      const sectionItems = menu.menuItems
        .filter((mi) => mi.sectionId === ms.sectionId && mi.item.isVisible)
        .sort((a, b) => a.displayOrder - b.displayOrder)
        .map((mi) => mi.item);
      
      return {
        ...ms.section,
        displayOrder: ms.displayOrder,
        items: sectionItems,
        menuName: (getTranslation(menu.translations, locale) as MenuTranslation | undefined)?.name || menu.code,
      };
    })
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-teal-600 to-teal-700 text-white">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">{tenant.name}</h1>
              <p className="text-teal-100 mt-1">Our Menu</p>
            </div>
            <Link
              href={`/t/${tenantId}`}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors flex items-center gap-2"
            >
              <span>💬</span>
              <span>Chat with AI</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Menu Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {allSections.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No menu items available yet.</p>
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
                    {section.items.map((item) => {
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
            href={`/t/${tenantId}`}
            className="text-teal-600 hover:text-teal-700 font-medium"
          >
            Chat with our AI assistant →
          </Link>
        </div>
      </footer>
    </div>
  );
}

export async function generateMetadata({ params }: MenuPageProps) {
  const { tenantId } = await params;
  const data = await getMenuData(tenantId);

  if (!data) {
    return {
      title: 'Menu Not Found',
    };
  }

  return {
    title: `Menu - ${data.tenant.name}`,
    description: `View the full menu at ${data.tenant.name}`,
  };
}
