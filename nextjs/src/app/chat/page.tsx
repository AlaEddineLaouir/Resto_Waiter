import ChatInterface from '@/components/ChatInterface';

export default function ChatPage() {
  // Default tenant for non-tenant-specific access
  return <ChatInterface tenantId="default" restaurantName="Menu AI Restaurant" />;
}
