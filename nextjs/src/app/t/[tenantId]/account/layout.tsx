'use client';

import { CustomerAuthProvider } from '@/lib/customer-auth-context';
import GuestHeader from '@/components/GuestHeader';
import { useParams } from 'next/navigation';

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const tenantSlug = params.tenantId as string;

  return (
    <CustomerAuthProvider tenantSlug={tenantSlug}>
      <GuestHeader
        tenantSlug={tenantSlug}
        restaurantName=""
        currentPage="account"
      />
      <main className="min-h-screen bg-gray-50 pt-14">
        {children}
      </main>
    </CustomerAuthProvider>
  );
}
