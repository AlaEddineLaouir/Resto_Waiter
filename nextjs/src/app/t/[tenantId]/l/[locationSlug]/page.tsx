import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import ChatInterface from '@/components/ChatInterface';
import Link from 'next/link';

interface LocationPageProps {
  params: Promise<{
    tenantId: string;
    locationSlug: string;
  }>;
}

async function getLocationData(tenantSlug: string, locationSlug: string) {
  try {
    // Find tenant by slug
    const tenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug },
      select: {
        id: true,
        name: true,
        slug: true,
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
      include: {
        brand: {
          select: { name: true, slug: true },
        },
      },
    });

    if (!location) return null;

    return { tenant, location };
  } catch (error) {
    console.error('Error fetching location:', error);
    return null;
  }
}

export default async function LocationChatPage({ params }: LocationPageProps) {
  const { tenantId, locationSlug } = await params;
  const data = await getLocationData(tenantId, locationSlug);

  if (!data) {
    notFound();
  }

  const { tenant, location } = data;
  const displayName = `${tenant.name} - ${location.name}`;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Location Header */}
      <div className="bg-gradient-to-r from-amber-600 to-orange-600 text-white px-4 py-2">
        <div className="max-w-4xl mx-auto flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <span className="text-amber-200">📍</span>
            <span className="font-medium">{location.name}</span>
            {location.city && (
              <span className="text-amber-200">• {location.city}</span>
            )}
          </div>
          <div className="flex items-center gap-4">
            <Link
              href={`/t/${tenantId}/l/${locationSlug}/menu`}
              className="hover:text-amber-200 transition-colors"
            >
              View Menu
            </Link>
            <Link
              href={`/t/${tenantId}`}
              className="hover:text-amber-200 transition-colors"
            >
              All Locations
            </Link>
          </div>
        </div>
      </div>

      {/* Chat Interface */}
      <div className="flex-1">
        <ChatInterface
          tenantId={tenant.id}
          restaurantName={displayName}
        />
      </div>
    </div>
  );
}

export async function generateMetadata({ params }: LocationPageProps) {
  const { tenantId, locationSlug } = await params;
  const data = await getLocationData(tenantId, locationSlug);

  if (!data) {
    return {
      title: 'Location Not Found',
    };
  }

  const { tenant, location } = data;

  return {
    title: `${tenant.name} - ${location.name} | Menu Assistant`,
    description: `Chat with the AI menu assistant at ${tenant.name} ${location.name}${location.city ? ` in ${location.city}` : ''}`,
  };
}
