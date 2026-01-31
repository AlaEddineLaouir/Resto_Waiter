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
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
      },
    });

    if (!tenant) return null;

    const categories = await prisma.category.findMany({
      where: { tenantId },
      orderBy: { displayOrder: 'asc' },
      include: {
        dishes: {
          where: { isAvailable: true },
          orderBy: { displayOrder: 'asc' },
          include: {
            ingredients: {
              include: {
                ingredient: true,
              },
            },
          },
        },
      },
    });

    return { tenant, categories };
  } catch (error) {
    console.error('Error fetching menu:', error);
    return null;
  }
}

export default async function MenuPage({ params }: MenuPageProps) {
  const { tenantId } = await params;
  const data = await getMenuData(tenantId);

  if (!data) {
    notFound();
  }

  const { tenant, categories } = data;

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
        {categories.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No menu items available yet.</p>
          </div>
        ) : (
          <div className="space-y-12">
            {categories.map((category) => (
              <section key={category.id}>
                <div className="border-b border-gray-200 pb-2 mb-6">
                  <h2 className="text-2xl font-semibold text-gray-800">{category.name}</h2>
                  {category.description && (
                    <p className="text-gray-500 mt-1">{category.description}</p>
                  )}
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  {category.dishes.map((dish) => (
                    <div
                      key={dish.id}
                      className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
                    >
                      {dish.imageUrl && (
                        <div className="h-48 bg-gray-100">
                          <img
                            src={dish.imageUrl}
                            alt={dish.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="p-4">
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg text-gray-800">{dish.name}</h3>
                            {dish.description && (
                              <p className="text-gray-600 text-sm mt-1">{dish.description}</p>
                            )}
                          </div>
                          <span className="font-bold text-teal-600 text-lg whitespace-nowrap">
                            €{Number(dish.price).toFixed(2)}
                          </span>
                        </div>

                        {/* Dietary Tags */}
                        <div className="flex flex-wrap gap-2 mt-3">
                          {dish.isVegetarian && (
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                              🥬 Vegetarian
                            </span>
                          )}
                        </div>

                        {/* Ingredients */}
                        {dish.ingredients.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <p className="text-xs text-gray-500">
                              <span className="font-medium">Ingredients: </span>
                              {dish.ingredients
                                .map((di) => di.ingredient.name)
                                .join(', ')}
                            </p>
                          </div>
                        )}

                        {/* Allergens */}
                        {dish.allergens && dish.allergens.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs text-orange-600">
                              <span className="font-medium">⚠️ Allergens: </span>
                              {dish.allergens.join(', ')}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
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
