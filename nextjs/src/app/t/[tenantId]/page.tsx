import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import ChatInterface from '@/components/ChatInterface';

interface TenantPageProps {
  params: Promise<{
    tenantId: string;
  }>;
}

async function getTenant(tenantIdOrSlug: string) {
  try {
    // Try to find by slug first
    const tenant = await prisma.tenant.findUnique({
      where: { slug: tenantIdOrSlug },
      select: {
        id: true,
        name: true,
      },
    });
    
    if (tenant) {
      return tenant;
    }
    
    // Only try by ID if it looks like a UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(tenantIdOrSlug)) {
      return await prisma.tenant.findUnique({
        where: { id: tenantIdOrSlug },
        select: {
          id: true,
          name: true,
        },
      });
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching tenant:', error);
    return null;
  }
}

export default async function TenantChatPage({ params }: TenantPageProps) {
  const { tenantId } = await params;
  const tenant = await getTenant(tenantId);

  if (!tenant) {
    notFound();
  }

  return (
    <ChatInterface 
      tenantId={tenant.id} 
      restaurantName={tenant.name} 
    />
  );
}

export async function generateMetadata({ params }: TenantPageProps) {
  const { tenantId } = await params;
  const tenant = await getTenant(tenantId);

  if (!tenant) {
    return {
      title: 'Restaurant Not Found',
    };
  }

  return {
    title: `${tenant.name} - Menu Assistant`,
    description: `Chat with the AI menu assistant at ${tenant.name}`,
  };
}
