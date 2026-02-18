import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { GuestPageWrapper } from './guest-wrapper';

interface TenantPageProps {
  params: Promise<{ tenantId: string }>;
}

async function getTenantData(tenantSlug: string) {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug },
      select: {
        id: true,
        name: true,
        slug: true,
        email: true,
        phone: true,
        address: true,
        defaultLocale: true,
        branding: true,
      },
    });
    if (!tenant) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(tenantSlug)) {
        return prisma.tenant.findUnique({
          where: { id: tenantSlug },
          select: {
            id: true, name: true, slug: true, email: true, phone: true,
            address: true, defaultLocale: true, branding: true,
          },
        });
      }
      return null;
    }
    return tenant;
  } catch {
    return null;
  }
}

async function getLocations(tenantId: string) {
  return prisma.location.findMany({
    where: { tenantId, isActive: true },
    select: {
      id: true, name: true, slug: true, addressLine1: true, city: true,
      phone: true, email: true,
      serviceDineIn: true, serviceTakeaway: true, serviceDelivery: true,
      brand: { select: { name: true } },
    },
    orderBy: { name: 'asc' },
  });
}

async function getFeaturedItems(tenantId: string, locale: string) {
  const publications = await prisma.menuPublication.findMany({
    where: { menu: { tenantId, status: 'published' }, isCurrent: true },
    select: { menuId: true },
    take: 5,
  });
  const menuIds = publications.map((p) => p.menuId);
  if (menuIds.length === 0) return [];

  const lines = await prisma.menuLine.findMany({
    where: {
      menuId: { in: menuIds },
      lineType: 'item',
      isEnabled: true,
      item: { isVisible: true },
    },
    include: {
      item: {
        include: {
          translations: true,
          priceBase: true,
          dietaryFlags: {
            include: { dietaryFlag: { include: { translations: true } } },
          },
        },
      },
    },
    take: 8,
    orderBy: { displayOrder: 'asc' },
  });

  return lines.filter((l) => l.item).map((l) => {
    const item = l.item!;
    const trans =
      item.translations.find((t) => t.locale === locale) ||
      item.translations.find((t) => t.locale === 'en-US') ||
      item.translations[0];
    return {
      id: item.id,
      name: trans?.name || 'Item',
      description: trans?.description || null,
      price: item.priceBase ? (Number(item.priceBase.amountMinor) / 100).toFixed(2) : null,
      currency: item.priceBase?.currency || 'EUR',
      dietaryFlags: item.dietaryFlags.map((df) => {
        const dfTrans = df.dietaryFlag.translations.find((t) => t.locale === locale) || df.dietaryFlag.translations[0];
        return dfTrans?.name || df.dietaryFlag.code;
      }),
      calories: item.calories,
    };
  });
}

export default async function TenantHomePage({ params }: TenantPageProps) {
  const { tenantId: tenantSlug } = await params;
  const tenant = await getTenantData(tenantSlug);
  if (!tenant) notFound();

  const locale = tenant.defaultLocale || 'en-US';
  const [locations, featuredItems] = await Promise.all([
    getLocations(tenant.id),
    getFeaturedItems(tenant.id, locale),
  ]);

  const branding = (tenant.branding || {}) as { primaryColor?: string; secondaryColor?: string };
  const slug = tenant.slug;

  return (
    <GuestPageWrapper tenantSlug={slug} restaurantName={tenant.name} currentPage="home">
      {/* Hero Section */}
      <section
        className="relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${branding.primaryColor || '#4a90a4'} 0%, ${branding.secondaryColor || '#2c3e50'} 100%)`,
        }}
      >
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 25% 25%, white 1px, transparent 1px), radial-gradient(circle at 75% 75%, white 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }} />
        </div>
        <div className="relative max-w-6xl mx-auto px-4 py-16 md:py-24">
          <div className="text-center text-white">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">{tenant.name}</h1>
            <p className="mt-4 text-lg md:text-xl text-white/80 max-w-2xl mx-auto">
              Welcome! Browse our locations, explore the menu, and place your order.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              {locations.length === 1 && (
                <Link href={`/t/${slug}/l/${locations[0].slug}/menu`}
                  className="px-6 py-3 bg-white text-gray-900 font-semibold rounded-xl hover:bg-gray-100 transition-colors shadow-lg">
                  📋 View Menu
                </Link>
              )}
              <Link href="#locations"
                className="px-6 py-3 bg-white/20 backdrop-blur text-white font-semibold rounded-xl hover:bg-white/30 transition-colors border border-white/30">
                📍 Our Locations
              </Link>
              <Link href={`/t/${slug}/account/register`}
                className="px-6 py-3 bg-amber-500 text-white font-semibold rounded-xl hover:bg-amber-600 transition-colors shadow-lg">
                ✨ Create Account
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Info Bar */}
      <section className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-600">
            {tenant.address && (
              <span className="flex items-center gap-1.5"><span className="text-base">📍</span> {tenant.address}</span>
            )}
            {tenant.phone && (
              <span className="flex items-center gap-1.5"><span className="text-base">📞</span> {tenant.phone}</span>
            )}
            {tenant.email && (
              <span className="flex items-center gap-1.5"><span className="text-base">✉️</span> {tenant.email}</span>
            )}
            <span className="flex items-center gap-1.5">
              <span className="text-base">🏠</span> {locations.length} location{locations.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </section>

      {/* Featured Menu Items */}
      {featuredItems.length > 0 && (
        <section className="bg-gray-50 py-12">
          <div className="max-w-6xl mx-auto px-4">
            <div className="text-center mb-8">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Featured Dishes</h2>
              <p className="text-gray-500 mt-2">A taste of what we have to offer</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {featuredItems.map((item) => (
                <div key={item.id} className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden group">
                  <div className="h-32 bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center">
                    <span className="text-4xl opacity-60 group-hover:scale-110 transition-transform">🍽️</span>
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-gray-900 text-sm leading-tight">{item.name}</h3>
                      {item.price && (
                        <span className="text-amber-600 font-bold text-sm whitespace-nowrap">€{item.price}</span>
                      )}
                    </div>
                    {item.description && (
                      <p className="text-gray-500 text-xs mt-1 line-clamp-2">{item.description}</p>
                    )}
                    {item.dietaryFlags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {item.dietaryFlags.map((flag) => (
                          <span key={flag} className="px-1.5 py-0.5 bg-green-50 text-green-700 text-[10px] rounded-full">{flag}</span>
                        ))}
                      </div>
                    )}
                    {item.calories && <p className="text-gray-400 text-[10px] mt-1">📊 {item.calories} cal</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Locations Section */}
      <section id="locations" className="py-12 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Our Locations</h2>
            <p className="text-gray-500 mt-2">Find a restaurant near you</p>
          </div>
          {locations.length === 0 ? (
            <p className="text-center text-gray-500">No locations available yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {locations.map((loc) => (
                <div key={loc.id} className="bg-white rounded-xl border border-gray-200 hover:border-amber-300 hover:shadow-lg transition-all overflow-hidden">
                  <div className="h-24 flex items-end p-4" style={{
                    background: `linear-gradient(135deg, ${branding.primaryColor || '#4a90a4'}99 0%, ${branding.secondaryColor || '#2c3e50'}99 100%)`,
                  }}>
                    <div>
                      <h3 className="text-white font-bold text-lg">{loc.name}</h3>
                      {loc.brand && <p className="text-white/70 text-xs">{loc.brand.name}</p>}
                    </div>
                  </div>
                  <div className="p-4 space-y-3">
                    {(loc.addressLine1 || loc.city) && (
                      <p className="text-sm text-gray-600 flex items-start gap-2">
                        <span className="mt-0.5">📍</span>
                        <span>{loc.addressLine1}{loc.city && <>, {loc.city}</>}</span>
                      </p>
                    )}
                    {loc.phone && (
                      <p className="text-sm text-gray-600 flex items-center gap-2"><span>📞</span> {loc.phone}</p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {loc.serviceDineIn && <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full">🍽️ Dine-in</span>}
                      {loc.serviceTakeaway && <span className="px-2 py-0.5 bg-green-50 text-green-700 text-xs rounded-full">🥡 Takeaway</span>}
                      {loc.serviceDelivery && <span className="px-2 py-0.5 bg-purple-50 text-purple-700 text-xs rounded-full">🚗 Delivery</span>}
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Link href={`/t/${slug}/l/${loc.slug}/menu`}
                        className="flex-1 text-center px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg transition-colors">
                        View Menu
                      </Link>
                      <Link href={`/t/${slug}/l/${loc.slug}`}
                        className="px-3 py-2 border border-gray-200 hover:border-amber-300 text-gray-600 hover:text-amber-600 text-sm rounded-lg transition-colors"
                        title="Chat with AI">
                        💬
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Account CTA */}
      <section className="bg-gradient-to-r from-amber-50 to-orange-50 py-12">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold text-gray-900">Track Your Orders & More</h2>
          <p className="text-gray-600 mt-2">
            Create a free account to view your order history, save your favorites,
            and get a personalized dining experience.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href={`/t/${slug}/account/register`}
              className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl transition-colors shadow-md">
              Create Free Account
            </Link>
            <Link href={`/t/${slug}/account/login`}
              className="px-6 py-3 bg-white hover:bg-gray-50 text-gray-700 font-semibold rounded-xl transition-colors border border-gray-200">
              Already have an account? Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <p className="font-bold text-white">{tenant.name}</p>
              {tenant.address && <p className="text-sm mt-1">{tenant.address}</p>}
            </div>
            <div className="flex gap-6 text-sm">
              <Link href={`/t/${slug}`} className="hover:text-white transition-colors">Home</Link>
              <Link href={`/t/${slug}/account`} className="hover:text-white transition-colors">My Account</Link>
              <Link href={`/t/${slug}/account/orders`} className="hover:text-white transition-colors">Order History</Link>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-6 pt-6 text-center text-xs text-gray-500">
            Powered by MenuAI
          </div>
        </div>
      </footer>
    </GuestPageWrapper>
  );
}

export async function generateMetadata({ params }: TenantPageProps) {
  const { tenantId } = await params;
  const tenant = await getTenantData(tenantId);
  if (!tenant) return { title: 'Restaurant Not Found' };
  return {
    title: `${tenant.name} - Welcome`,
    description: `Welcome to ${tenant.name}. Browse our locations, explore the menu, and place your order.`,
  };
}
