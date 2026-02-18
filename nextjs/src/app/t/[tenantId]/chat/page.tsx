import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import ChatInterface from '@/components/ChatInterface';
import { GuestPageWrapper } from '../guest-wrapper';

interface ChatPageProps {
  params: Promise<{ tenantId: string }>;
}

export default async function TenantChatPage({ params }: ChatPageProps) {
  const { tenantId } = await params;

  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantId },
    select: { id: true, name: true, slug: true },
  });

  if (!tenant) {
    notFound();
  }

  return (
    <GuestPageWrapper
      tenantSlug={tenant.slug}
      restaurantName={tenant.name}
      currentPage="chat"
    >
      <div className="flex-1 h-[calc(100vh-56px)]">
        <ChatInterface
          tenantId={tenant.id}
          restaurantName={tenant.name}
        />
      </div>
    </GuestPageWrapper>
  );
}

export async function generateMetadata({ params }: ChatPageProps) {
  const { tenantId } = await params;

  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantId },
    select: { name: true },
  });

  return {
    title: tenant ? `${tenant.name} | AI Assistant` : 'AI Assistant',
    description: tenant
      ? `Chat with the AI menu assistant at ${tenant.name}`
      : 'Chat with the AI menu assistant',
  };
}
