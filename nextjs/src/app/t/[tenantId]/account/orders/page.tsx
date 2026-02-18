'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useCustomerAuth } from '@/lib/customer-auth-context';

interface OrderItem {
  id: string;
  itemName: string;
  quantity: number;
  unitPriceMinor: number;
  totalPriceMinor: number;
  selectedOptions: { groupName: string; optionName: string }[];
  specialNote?: string;
}

interface Order {
  id: string;
  orderNumber: number;
  status: string;
  subtotalMinor: number;
  taxMinor: number;
  totalMinor: number;
  currency: string;
  createdAt: string;
  confirmedAt?: string;
  readyAt?: string;
  servedAt?: string;
  cancelledAt?: string;
  cancelReason?: string;
  specialInstructions?: string;
  items: OrderItem[];
  session: {
    sessionCode: string;
    table: { label: string; friendlyName?: string };
    openedAt: string;
    closedAt?: string;
  };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700', icon: '⏳' },
  confirmed: { label: 'Confirmed', color: 'bg-blue-100 text-blue-700', icon: '✅' },
  preparing: { label: 'Preparing', color: 'bg-orange-100 text-orange-700', icon: '👨‍🍳' },
  ready: { label: 'Ready', color: 'bg-green-100 text-green-700', icon: '🔔' },
  served: { label: 'Served', color: 'bg-teal-100 text-teal-700', icon: '🍽️' },
  completed: { label: 'Completed', color: 'bg-gray-100 text-gray-700', icon: '✔️' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700', icon: '❌' },
};

function formatPrice(minor: number, currency: string = 'EUR') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(minor / 100);
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function OrderHistoryPage() {
  const params = useParams();
  const { customer, loading: authLoading } = useCustomerAuth();
  const tenantSlug = params.tenantId as string;

  const [orders, setOrders] = useState<Order[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/t/${tenantSlug}/customer/orders?page=${p}&limit=10`);
      if (!res.ok) {
        if (res.status === 401) {
          setError('Please sign in to view your order history');
        } else {
          setError('Failed to load orders');
        }
        setLoading(false);
        return;
      }
      const data = await res.json();
      setOrders(data.orders);
      setPagination(data.pagination);
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, [tenantSlug]);

  useEffect(() => {
    if (!authLoading && customer) {
      fetchOrders(page);
    } else if (!authLoading && !customer) {
      setLoading(false);
    }
  }, [authLoading, customer, page, fetchOrders]);

  // Not logged in
  if (!authLoading && !customer) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-56px)] px-4">
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-4">📋</div>
          <h1 className="text-2xl font-bold text-gray-900">Order History</h1>
          <p className="text-gray-500 mt-2">
            Sign in to your account to see all your past orders.
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
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Order History</h1>
          <p className="text-gray-500 text-sm mt-1">
            {pagination ? `${pagination.total} order${pagination.total !== 1 ? 's' : ''} total` : ''}
          </p>
        </div>
        <Link
          href={`/t/${tenantSlug}/account`}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Account
        </Link>
      </div>

      {loading && orders.length === 0 ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-3" />
              <div className="h-3 bg-gray-100 rounded w-1/2 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-1/4" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-700 px-6 py-4 rounded-xl text-center">
          {error}
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">🍽️</div>
          <h2 className="text-xl font-semibold text-gray-900">No orders yet</h2>
          <p className="text-gray-500 mt-2">
            Your order history will appear here after you place your first order.
          </p>
          <Link
            href={`/t/${tenantSlug}`}
            className="inline-block mt-6 px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-lg transition-colors"
          >
            Browse Menu
          </Link>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {orders.map((order) => {
              const status = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
              return (
                <div
                  key={order.id}
                  className="bg-white rounded-xl border border-gray-100 hover:shadow-sm transition-shadow overflow-hidden"
                >
                  {/* Order Header */}
                  <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${status.color}`}>
                        {status.icon} {status.label}
                      </span>
                      <span className="text-sm font-semibold text-gray-900">
                        Order #{order.orderNumber}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">
                        {formatPrice(order.totalMinor, order.currency)}
                      </p>
                      <p className="text-xs text-gray-400">{timeAgo(order.createdAt)}</p>
                    </div>
                  </div>

                  {/* Table Info */}
                  <div className="px-5 py-2 bg-gray-50 text-xs text-gray-500 flex items-center gap-4">
                    <span>🪑 Table {order.session.table.label}</span>
                    <span>📅 {new Date(order.createdAt).toLocaleDateString('en-US', {
                      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
                    })}</span>
                    <span>🕐 {new Date(order.createdAt).toLocaleTimeString('en-US', {
                      hour: '2-digit', minute: '2-digit',
                    })}</span>
                  </div>

                  {/* Items */}
                  <div className="px-5 py-3 divide-y divide-gray-50">
                    {order.items.map((item) => (
                      <div key={item.id} className="py-2 flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-gray-400 bg-gray-100 rounded px-1.5 py-0.5">
                              ×{item.quantity}
                            </span>
                            <span className="text-sm font-medium text-gray-900">
                              {item.itemName}
                            </span>
                          </div>
                          {item.selectedOptions.length > 0 && (
                            <p className="text-xs text-gray-500 ml-8 mt-0.5">
                              {item.selectedOptions.map((o) => o.optionName).join(', ')}
                            </p>
                          )}
                          {item.specialNote && (
                            <p className="text-xs text-amber-600 ml-8 mt-0.5 italic">
                              {item.specialNote}
                            </p>
                          )}
                        </div>
                        <span className="text-sm text-gray-600 ml-4">
                          {formatPrice(item.totalPriceMinor, order.currency)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Cancel reason */}
                  {order.status === 'cancelled' && order.cancelReason && (
                    <div className="px-5 py-2 bg-red-50 text-xs text-red-600">
                      Reason: {order.cancelReason}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-50 transition-colors"
              >
                ← Previous
              </button>
              <span className="text-sm text-gray-500">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page === pagination.totalPages}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-50 transition-colors"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
