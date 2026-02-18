import Link from 'next/link';
import { prisma } from '@/lib/prisma';

async function getAllRestaurants() {
  return prisma.tenant.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      slug: true,
      email: true,
      phone: true,
      address: true,
      branding: true,
      locations: {
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          slug: true,
          city: true,
          addressLine1: true,
          phone: true,
          serviceDineIn: true,
          serviceTakeaway: true,
          serviceDelivery: true,
          menuPublications: {
            where: { isCurrent: true },
            select: {
              id: true,
              menu: {
                select: {
                  id: true,
                  code: true,
                  translations: {
                    where: { locale: 'en-US' },
                    select: { name: true, description: true },
                    take: 1,
                  },
                },
              },
            },
            take: 5,
          },
        },
        orderBy: { name: 'asc' },
      },
    },
    orderBy: { name: 'asc' },
  });
}

export default async function Home() {
  const restaurants = await getAllRestaurants();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header / Nav */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">🍽️</span>
            <span className="font-bold text-lg text-gray-900">Menu AI</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/platform"
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Restaurant Owner?
            </Link>
            <Link
              href="/platform"
              className="px-4 py-1.5 text-sm font-medium bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors"
            >
              Admin Login
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-br from-amber-50 via-white to-orange-50 py-16 md:py-24">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Discover Restaurants Near You
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Browse menus, chat with our AI assistant, and order from your favorite restaurants.
            Create an account to track your orders.
          </p>
        </div>
      </section>

      {/* Restaurants Grid */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-8">
          All Restaurants
          <span className="text-base font-normal text-gray-400 ml-2">
            ({restaurants.length})
          </span>
        </h2>

        {restaurants.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🏪</div>
            <h3 className="text-xl font-semibold text-gray-900">No restaurants yet</h3>
            <p className="text-gray-500 mt-2">Check back later or register your restaurant.</p>
            <Link
              href="/platform"
              className="inline-block mt-6 px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-lg transition-colors"
            >
              Register Restaurant
            </Link>
          </div>
        ) : (
          <div className="space-y-10">
            {restaurants.map((restaurant) => {
              const branding = restaurant.branding as Record<string, string> | null;
              const primary = branding?.primaryColor || '#f59e0b';
              const secondary = branding?.secondaryColor || '#d97706';

              return (
                <div
                  key={restaurant.id}
                  className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                >
                  {/* Restaurant Header */}
                  <div
                    className="px-6 py-5 text-white"
                    style={{
                      background: `linear-gradient(135deg, ${primary}, ${secondary})`,
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-2xl font-bold">{restaurant.name}</h3>
                        <div className="flex items-center gap-4 mt-1 text-sm opacity-90">
                          {restaurant.address && (
                            <span>📍 {restaurant.address}</span>
                          )}
                          {restaurant.phone && (
                            <span>📞 {restaurant.phone}</span>
                          )}
                          {restaurant.email && (
                            <span>✉️ {restaurant.email}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Link
                          href={`/t/${restaurant.slug}`}
                          className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white text-sm font-medium rounded-lg backdrop-blur transition-colors"
                        >
                          View Restaurant
                        </Link>
                        <Link
                          href={`/t/${restaurant.slug}/chat`}
                          className="px-4 py-2 bg-white text-gray-900 text-sm font-medium rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          💬 AI Chat
                        </Link>
                      </div>
                    </div>
                  </div>

                  {/* Locations */}
                  {restaurant.locations.length > 0 ? (
                    <div className="p-6">
                      <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                        📍 Locations ({restaurant.locations.length})
                      </h4>
                      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {restaurant.locations.map((loc) => (
                          <div
                            key={loc.id}
                            className="border border-gray-100 rounded-xl p-4 hover:border-amber-200 hover:bg-amber-50/30 transition-colors group"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h5 className="font-semibold text-gray-900 group-hover:text-amber-700 transition-colors">
                                  {loc.name}
                                </h5>
                                {(loc.city || loc.addressLine1) && (
                                  <p className="text-sm text-gray-500 mt-0.5">
                                    {loc.addressLine1}{loc.addressLine1 && loc.city ? ', ' : ''}{loc.city}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Services badges */}
                            <div className="flex flex-wrap gap-1.5 mb-3">
                              {loc.serviceDineIn && (
                                <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">
                                  🍽️ Dine-in
                                </span>
                              )}
                              {loc.serviceTakeaway && (
                                <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                                  📦 Takeaway
                                </span>
                              )}
                              {loc.serviceDelivery && (
                                <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">
                                  🚗 Delivery
                                </span>
                              )}
                            </div>

                            {/* Published Menus */}
                            {loc.menuPublications.length > 0 && (
                              <div className="mb-3">
                                <p className="text-xs font-medium text-gray-400 mb-1">Menus:</p>
                                <div className="flex flex-wrap gap-1">
                                  {loc.menuPublications.map((pub) => (
                                    <span
                                      key={pub.id}
                                      className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded"
                                    >
                                      📋 {pub.menu.translations[0]?.name || pub.menu.code}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Action Links */}
                            <div className="flex gap-2 pt-2 border-t border-gray-50">
                              <Link
                                href={`/t/${restaurant.slug}/l/${loc.slug}/menu`}
                                className="text-xs font-medium text-amber-600 hover:text-amber-700 transition-colors"
                              >
                                View Menu →
                              </Link>
                              <Link
                                href={`/t/${restaurant.slug}/l/${loc.slug}`}
                                className="text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
                              >
                                AI Chat →
                              </Link>
                              {loc.phone && (
                                <a
                                  href={`tel:${loc.phone}`}
                                  className="text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors ml-auto"
                                >
                                  📞 Call
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 text-center text-gray-400 text-sm">
                      No locations available yet
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 py-8">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-400">
          <p>© {new Date().getFullYear()} Menu AI. Powered by Next.js & AI.</p>
          <div className="flex gap-6">
            <Link href="/platform" className="hover:text-gray-600 transition-colors">
              Restaurant Admin
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
