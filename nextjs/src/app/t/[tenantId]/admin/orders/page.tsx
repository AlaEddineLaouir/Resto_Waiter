'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

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

interface OrderSession {
  sessionCode: string;
  locationId: string;
  table: { label: string; friendlyName: string | null };
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
  session: OrderSession;
  createdAt: string;
  confirmedAt: string | null;
}

const STATUS_TABS = ['pending', 'confirmed', 'preparing', 'ready', 'served'] as const;

const STATUS_COLORS: Record<string, { bg: string; text: string; badge: string }> = {
  pending: { bg: 'bg-yellow-50', text: 'text-yellow-700', badge: 'bg-yellow-500' },
  confirmed: { bg: 'bg-blue-50', text: 'text-blue-700', badge: 'bg-blue-500' },
  preparing: { bg: 'bg-orange-50', text: 'text-orange-700', badge: 'bg-orange-500' },
  ready: { bg: 'bg-green-50', text: 'text-green-700', badge: 'bg-green-500' },
  served: { bg: 'bg-gray-50', text: 'text-gray-600', badge: 'bg-gray-400' },
};

function formatPrice(minor: number, currency: string = 'EUR') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(minor / 100);
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m ago`;
}

export default function WaiterOrdersDashboard() {
  const params = useParams();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('pending');
  const [updating, setUpdating] = useState<string | null>(null);

  const tenantId = params.tenantId as string;

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/orders?limit=100');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setOrders(data.orders || []);
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Poll every 10 seconds
  useEffect(() => {
    const interval = setInterval(fetchOrders, 10000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  async function updateStatus(orderId: string, newStatus: string, cancelReason?: string) {
    setUpdating(orderId);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, cancelReason }),
      });
      if (res.ok) {
        fetchOrders();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update order');
      }
    } catch {
      alert('Connection error');
    } finally {
      setUpdating(null);
    }
  }

  const filteredOrders = orders.filter((o) => o.status === activeTab);
  const pendingCount = orders.filter((o) => o.status === 'pending').length;
  const readyCount = orders.filter((o) => o.status === 'ready').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <p className="text-sm text-gray-500">Manage incoming and active orders</p>
        </div>
        <div className="flex items-center gap-3">
          {pendingCount > 0 && (
            <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium animate-pulse">
              🔔 {pendingCount} pending
            </span>
          )}
          {readyCount > 0 && (
            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
              ✅ {readyCount} ready to serve
            </span>
          )}
        </div>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        {STATUS_TABS.map((tab) => {
          const count = orders.filter((o) => o.status === tab).length;
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all capitalize ${
                isActive
                  ? 'bg-white shadow text-gray-900'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab}
              {count > 0 && (
                <span className={`ml-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full text-xs text-white ${STATUS_COLORS[tab]?.badge || 'bg-gray-400'}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-4xl mb-2">📋</p>
          <p>No {activeTab} orders</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const colors = STATUS_COLORS[order.status] || STATUS_COLORS.pending;
            return (
              <div
                key={order.id}
                className={`rounded-xl border ${colors.bg} overflow-hidden`}
              >
                {/* Order Header */}
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-white rounded-lg px-3 py-1 shadow-sm">
                      <span className="text-lg font-bold text-gray-800">
                        #{order.orderNumber}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">
                        Table {order.session.table.label}
                        {order.session.table.friendlyName && (
                          <span className="text-gray-500 font-normal ml-1">
                            ({order.session.table.friendlyName})
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500">{timeAgo(order.createdAt)}</p>
                    </div>
                  </div>
                  <span className={`text-sm font-medium capitalize ${colors.text}`}>
                    {order.status}
                  </span>
                </div>

                {/* Items */}
                <div className="bg-white px-4 py-3 space-y-1.5">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <div>
                        <span className="font-medium text-gray-800">
                          {item.quantity}× {item.itemName}
                        </span>
                        {item.selectedOptions.length > 0 && (
                          <p className="text-gray-500 text-xs">
                            {item.selectedOptions.map((o) => o.optionName).join(', ')}
                          </p>
                        )}
                        {item.specialNote && (
                          <p className="text-orange-600 text-xs">📝 {item.specialNote}</p>
                        )}
                      </div>
                      <span className="text-gray-600">
                        {formatPrice(item.totalPriceMinor, order.currency)}
                      </span>
                    </div>
                  ))}
                  {order.specialInstructions && (
                    <div className="pt-2 border-t mt-2">
                      <p className="text-sm text-orange-600">
                        ⚠️ {order.specialInstructions}
                      </p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="p-4 flex items-center justify-between border-t">
                  <span className="font-bold text-gray-800">
                    {formatPrice(order.totalMinor, order.currency)}
                  </span>
                  <div className="flex gap-2">
                    {order.status === 'pending' && (
                      <>
                        <button
                          onClick={() => updateStatus(order.id, 'cancelled', 'Rejected by waiter')}
                          disabled={updating === order.id}
                          className="px-4 py-2 text-sm border border-red-300 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => updateStatus(order.id, 'confirmed')}
                          disabled={updating === order.id}
                          className="px-4 py-2 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50"
                        >
                          {updating === order.id ? 'Updating...' : '✅ Confirm'}
                        </button>
                      </>
                    )}
                    {order.status === 'ready' && (
                      <button
                        onClick={() => updateStatus(order.id, 'served')}
                        disabled={updating === order.id}
                        className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                      >
                        {updating === order.id ? 'Updating...' : '🍽️ Mark Served'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
