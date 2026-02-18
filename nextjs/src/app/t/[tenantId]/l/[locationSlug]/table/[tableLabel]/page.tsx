'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useCart } from '@/lib/cart-context';

export default function TableEntryPage() {
  const router = useRouter();
  const params = useParams();
  const { setSession } = useCart();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const tenantSlug = params.tenantId as string;
  const locationSlug = params.locationSlug as string;
  const tableLabel = params.tableLabel as string;

  useEffect(() => {
    async function createSession() {
      try {
        const res = await fetch(`/api/t/${tenantSlug}/table-session`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tableLabel, locationSlug }),
        });

        if (!res.ok) {
          const data = await res.json();
          setError(data.error || 'Failed to start session');
          setLoading(false);
          return;
        }

        const data = await res.json();
        const { session } = data;

        // Store session in cart context
        setSession({
          sessionCode: session.sessionCode,
          tenantId: tenantSlug,
          locationId: locationSlug,
          tableLabel,
        });

        // Store session code in localStorage for recovery
        localStorage.setItem('active-session-code', session.sessionCode);

        // Redirect to ordering menu
        router.replace(
          `/t/${tenantSlug}/l/${locationSlug}/table/${tableLabel}/menu`
        );
      } catch {
        setError('Connection error. Please try again.');
        setLoading(false);
      }
    }

    createSession();
  }, [tenantSlug, locationSlug, tableLabel, setSession, router]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="text-5xl mb-4">😕</div>
            <h1 className="text-xl font-bold text-gray-800 mb-2">
              Couldn&apos;t start your session
            </h1>
            <p className="text-gray-500 mb-6">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-700">
            Setting up your table...
          </h1>
          <p className="text-gray-500 mt-2">
            Table {decodeURIComponent(tableLabel)}
          </p>
        </div>
      </div>
    );
  }

  return null;
}
