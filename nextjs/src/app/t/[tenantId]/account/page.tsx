'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCustomerAuth } from '@/lib/customer-auth-context';

export default function AccountPage() {
  const params = useParams();
  const router = useRouter();
  const { customer, loading, logout } = useCustomerAuth();
  const tenantSlug = params.tenantId as string;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-56px)]">
        <div className="animate-spin h-8 w-8 border-2 border-amber-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-56px)] px-4">
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-4">👤</div>
          <h1 className="text-2xl font-bold text-gray-900">Sign In Required</h1>
          <p className="text-gray-500 mt-2">
            Create an account or sign in to view your profile and order history.
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <Link
              href={`/t/${tenantSlug}/account/login`}
              className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-lg transition-colors"
            >
              Sign In
            </Link>
            <Link
              href={`/t/${tenantSlug}/account/register`}
              className="px-6 py-2.5 border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold rounded-lg transition-colors"
            >
              Create Account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Profile Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold text-white">
              {(customer.name || customer.email)[0].toUpperCase()}
            </div>
            <div className="text-white">
              <h1 className="text-xl font-bold">
                {customer.name || 'Guest'}
              </h1>
              <p className="text-white/80 text-sm">{customer.email}</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InfoField label="Email" value={customer.email} />
            <InfoField label="Name" value={customer.name || '—'} />
            <InfoField label="Phone" value={customer.phone || '—'} />
            <InfoField label="Account Type" value={customer.isGuest ? 'Guest' : 'Registered'} />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href={`/t/${tenantSlug}/account/orders`}
          className="bg-white rounded-xl border border-gray-100 p-5 hover:border-amber-300 hover:shadow-md transition-all group"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">📋</span>
            <div>
              <h3 className="font-semibold text-gray-900 group-hover:text-amber-600 transition-colors">
                Order History
              </h3>
              <p className="text-sm text-gray-500">View your past orders</p>
            </div>
          </div>
        </Link>

        <Link
          href={`/t/${tenantSlug}`}
          className="bg-white rounded-xl border border-gray-100 p-5 hover:border-amber-300 hover:shadow-md transition-all group"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">🍽️</span>
            <div>
              <h3 className="font-semibold text-gray-900 group-hover:text-amber-600 transition-colors">
                Browse Menu
              </h3>
              <p className="text-sm text-gray-500">Explore our dishes</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Sign Out */}
      <div className="mt-8 text-center">
        <button
          onClick={async () => {
            await logout();
            router.push(`/t/${tenantSlug}`);
          }}
          className="text-sm text-red-500 hover:text-red-700 transition-colors"
        >
          🚪 Sign out of your account
        </button>
      </div>
    </div>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-sm font-medium text-gray-900 mt-0.5">{value}</p>
    </div>
  );
}
