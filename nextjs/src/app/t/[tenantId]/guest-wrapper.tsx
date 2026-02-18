'use client';

import { CustomerAuthProvider } from '@/lib/customer-auth-context';
import GuestHeader from '@/components/GuestHeader';

interface GuestPageWrapperProps {
  children: React.ReactNode;
  tenantSlug: string;
  restaurantName: string;
  currentPage?: 'home' | 'menu' | 'account' | 'orders' | 'chat';
  locationSlug?: string;
}

export function GuestPageWrapper({
  children,
  tenantSlug,
  restaurantName,
  currentPage,
  locationSlug,
}: GuestPageWrapperProps) {
  return (
    <CustomerAuthProvider tenantSlug={tenantSlug}>
      <div className="min-h-screen flex flex-col bg-gray-50">
        <GuestHeader
          tenantSlug={tenantSlug}
          restaurantName={restaurantName}
          currentPage={currentPage}
          locationSlug={locationSlug}
        />
        <main className="flex-1">{children}</main>
      </div>
    </CustomerAuthProvider>
  );
}
