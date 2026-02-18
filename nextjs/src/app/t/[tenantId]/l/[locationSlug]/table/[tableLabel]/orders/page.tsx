'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { formatPrice } from '@/lib/cart-context';

// ============================================
// Types
// ============================================
interface OrderItem {
  id: string;
  itemName: string;
  quantity: number;
  unitPriceMinor: number;
  totalPriceMinor: number;
  selectedOptions: { optionName: string; deltaMinor: number }[];
  specialNote: string | null;
  status: string;
}

interface Order {
  id: string;
  orderNumber: number;
  status: string;
  specialInstructions: string | null;
  subtotalMinor: number;
  totalMinor: number;
  currency: string;
  items: OrderItem[];
  createdAt: string;
  confirmedAt: string | null;
  prepStartedAt: string | null;
  readyAt: string | null;
  servedAt: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; emoji: string; color: string; bgColor: string }> = {
  pending: { label: 'Waiting for confirmation', emoji: '⏳', color: 'text-yellow-700', bgColor: 'bg-yellow-50 border-yellow-200' },
  confirmed: { label: 'Confirmed — Sent to kitchen', emoji: '✅', color: 'text-blue-700', bgColor: 'bg-blue-50 border-blue-200' },
  preparing: { label: 'Being prepared', emoji: '👨‍🍳', color: 'text-orange-700', bgColor: 'bg-orange-50 border-orange-200' },
  ready: { label: 'Ready! Coming to your table', emoji: '🔔', color: 'text-green-700', bgColor: 'bg-green-50 border-green-200' },
  served: { label: 'Served', emoji: '🍽️', color: 'text-gray-600', bgColor: 'bg-gray-50 border-gray-200' },
  completed: { label: 'Completed', emoji: '✨', color: 'text-gray-500', bgColor: 'bg-gray-50 border-gray-200' },
  cancelled: { label: 'Cancelled', emoji: '❌', color: 'text-red-600', bgColor: 'bg-red-50 border-red-200' },
};

export default function OrderTrackerPage() {
  const params = useParams();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const tenantSlug = params.tenantId as string;
  const locationSlug = params.locationSlug as string;
  const tableLabel = params.tableLabel as string;

  const fetchOrders = useCallback(async () => {
    const sessionCode = localStorage.getItem('active-session-code');
    if (!sessionCode) {
      setError('No active session found. Please scan the QR code again.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/t/${tenantSlug}/sessions/${sessionCode}/orders`);
      if (!res.ok) throw new Error('Failed to fetch orders');
      const data = await res.json();
      setOrders(data.orders || []);
      setError(null);
    } catch {
      setError('Unable to load orders.');
    } finally {
      setLoading(false);
    }
  }, [tenantSlug]);

  // Initial load
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Poll every 10 seconds
  useEffect(() => {
    const interval = setInterval(fetchOrders, 10000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-500">Loading your orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-600 to-teal-700 text-white">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <Link
            href={`/t/${tenantSlug}/l/${locationSlug}/table/${tableLabel}/menu`}
            className="text-teal-200 hover:text-white text-sm flex items-center gap-1 mb-2"
          >
            ← Back to Menu
          </Link>
          <h1 className="text-2xl font-bold">Your Orders</h1>
          <p className="text-teal-100 text-sm mt-1">
            Table {decodeURIComponent(tableLabel)} • Live tracking
          </p>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 py-6">
        {error && (
          <div className="bg-red-50 text-red-700 rounded-lg p-4 text-sm mb-4">
            {error}
          </div>
        )}

        {orders.length === 0 && !error ? (
          <div className="text-center py-12">
            <div className="text-5xl mb-4">📋</div>
            <h2 className="text-xl font-semibold text-gray-700 mb-2">No orders yet</h2>
            <p className="text-gray-500 mb-6">
              Browse the menu and place your first order!
            </p>
            <Link
              href={`/t/${tenantSlug}/l/${locationSlug}/table/${tableLabel}/menu`}
              className="px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium inline-block"
            >
              Browse Menu
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const statusCfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
              return (
                <div
                  key={order.id}
                  className={`rounded-xl border-2 overflow-hidden ${statusCfg.bgColor}`}
                >
                  {/* Order Header */}
                  <div className="p-4 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{statusCfg.emoji}</span>
                        <span className={`font-bold ${statusCfg.color}`}>
                          Order #{order.orderNumber}
                        </span>
                      </div>
                      <p className={`text-sm mt-0.5 ${statusCfg.color}`}>
                        {statusCfg.label}
                      </p>
                    </div>
                    <span className="text-sm text-gray-500">
                      {new Date(order.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  {/* Items */}
                  <div className="bg-white/50 px-4 py-3 space-y-2">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <div>
                          <span className="text-gray-800">
                            {item.quantity}× {item.itemName}
                          </span>
                          {item.selectedOptions.length > 0 && (
                            <p className="text-gray-500 text-xs">
                              {item.selectedOptions.map((o) => o.optionName).join(', ')}
                            </p>
                          )}
                        </div>
                        <span className="text-gray-600 font-medium">
                          {formatPrice(item.totalPriceMinor, order.currency)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Total */}
                  <div className="px-4 py-3 flex justify-between bg-white/30 border-t">
                    <span className="font-semibold text-gray-800">Total</span>
                    <span className="font-bold text-teal-600">
                      {formatPrice(order.totalMinor, order.currency)}
                    </span>
                  </div>

                  {/* Timeline */}
                  {(order.confirmedAt || order.prepStartedAt || order.readyAt || order.servedAt) && (
                    <div className="px-4 py-3 text-xs text-gray-500 space-y-1 border-t bg-white/20">
                      {order.confirmedAt && (
                        <p>✅ Confirmed at {new Date(order.confirmedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      )}
                      {order.prepStartedAt && (
                        <p>👨‍🍳 Prep started at {new Date(order.prepStartedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      )}
                      {order.readyAt && (
                        <p>🔔 Ready at {new Date(order.readyAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      )}
                      {order.servedAt && (
                        <p>🍽️ Served at {new Date(order.servedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Fixed Bottom: Order More Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t shadow-lg z-40">
        <Link
          href={`/t/${tenantSlug}/l/${locationSlug}/table/${tableLabel}/menu`}
          className="block w-full max-w-3xl mx-auto bg-teal-600 text-white rounded-xl py-4 px-6 font-semibold text-center hover:bg-teal-700 transition-colors"
        >
          🍽️ Order More
        </Link>
      </div>
    </div>
  );
}
