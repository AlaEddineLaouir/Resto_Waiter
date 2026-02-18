'use client';

import { useEffect, useState, useCallback } from 'react';

// ============================================
// Types
// ============================================
interface OrderItem {
  id: string;
  itemName: string;
  quantity: number;
  selectedOptions: { optionName: string }[];
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
  totalMinor: number;
  currency: string;
  items: OrderItem[];
  session: OrderSession;
  createdAt: string;
  confirmedAt: string | null;
  prepStartedAt: string | null;
  readyAt: string | null;
}

interface KitchenQueue {
  confirmed: Order[];
  preparing: Order[];
  ready: Order[];
}

function timeElapsed(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '< 1m';
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

const LANE_CONFIG = {
  confirmed: {
    title: '📋 To Prepare',
    subtitle: 'Confirmed by waiter',
    headerBg: 'bg-blue-600',
    cardBorder: 'border-blue-200',
    cardBg: 'bg-blue-50',
    action: 'Start Preparing',
    nextStatus: 'preparing',
    actionBg: 'bg-orange-500 hover:bg-orange-600',
  },
  preparing: {
    title: '👨‍🍳 In Progress',
    subtitle: 'Currently being prepared',
    headerBg: 'bg-orange-500',
    cardBorder: 'border-orange-200',
    cardBg: 'bg-orange-50',
    action: 'Mark Ready',
    nextStatus: 'ready',
    actionBg: 'bg-green-500 hover:bg-green-600',
  },
  ready: {
    title: '✅ Ready',
    subtitle: 'Waiting to be served',
    headerBg: 'bg-green-600',
    cardBorder: 'border-green-200',
    cardBg: 'bg-green-50',
    action: null,
    nextStatus: null,
    actionBg: '',
  },
};

export default function KitchenDisplayPage() {
  const [queue, setQueue] = useState<KitchenQueue>({
    confirmed: [],
    preparing: [],
    ready: [],
  });
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchQueue = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/kitchen/queue');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setQueue(data.queue);
    } catch (err) {
      console.error('Failed to fetch kitchen queue:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  // Poll every 5 seconds (kitchen needs faster updates)
  useEffect(() => {
    const interval = setInterval(fetchQueue, 5000);
    return () => clearInterval(interval);
  }, [fetchQueue]);

  async function updateStatus(orderId: string, newStatus: string) {
    setUpdating(orderId);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        fetchQueue();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update');
      }
    } catch {
      alert('Connection error');
    } finally {
      setUpdating(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-teal-400 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-400">Loading kitchen queue...</p>
        </div>
      </div>
    );
  }

  const totalOrders =
    queue.confirmed.length + queue.preparing.length + queue.ready.length;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 px-6 py-4 flex items-center justify-between border-b border-gray-700">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold">🔥 Kitchen Display</h1>
          <span className="text-gray-400 text-sm">
            {totalOrders} active order{totalOrders !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="text-gray-400 text-sm">
          {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          {' • '}Auto-refresh every 5s
        </div>
      </div>

      {/* Swim Lanes */}
      <div className="grid grid-cols-3 gap-4 p-4 h-[calc(100vh-4rem)]">
        {(Object.keys(LANE_CONFIG) as Array<keyof typeof LANE_CONFIG>).map((lane) => {
          const config = LANE_CONFIG[lane];
          const orders = queue[lane];
          return (
            <div key={lane} className="flex flex-col bg-gray-800 rounded-xl overflow-hidden">
              {/* Lane Header */}
              <div className={`${config.headerBg} px-4 py-3`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-bold text-lg">{config.title}</h2>
                    <p className="text-white/70 text-xs">{config.subtitle}</p>
                  </div>
                  <span className="bg-white/20 rounded-full w-8 h-8 flex items-center justify-center font-bold text-lg">
                    {orders.length}
                  </span>
                </div>
              </div>

              {/* Order Cards */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {orders.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p className="text-3xl mb-2">✨</p>
                    <p className="text-sm">All clear!</p>
                  </div>
                ) : (
                  orders.map((order) => (
                    <div
                      key={order.id}
                      className={`rounded-lg border ${config.cardBorder} ${config.cardBg} text-gray-900 overflow-hidden`}
                    >
                      {/* Card Header */}
                      <div className="px-3 py-2 flex items-center justify-between border-b border-gray-200">
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-black">#{order.orderNumber}</span>
                          <span className="text-sm font-medium text-gray-600">
                            T-{order.session.table.label}
                          </span>
                        </div>
                        <span className="text-xs font-mono text-gray-500">
                          ⏱️ {timeElapsed(
                            lane === 'confirmed'
                              ? order.confirmedAt || order.createdAt
                              : lane === 'preparing'
                              ? order.prepStartedAt || order.createdAt
                              : order.readyAt || order.createdAt
                          )}
                        </span>
                      </div>

                      {/* Items */}
                      <div className="px-3 py-2 space-y-1">
                        {order.items.map((item) => (
                          <div key={item.id} className="flex items-start gap-2">
                            <span className="font-bold text-gray-800 min-w-[24px]">
                              {item.quantity}×
                            </span>
                            <div className="flex-1">
                              <span className="font-semibold text-gray-800">
                                {item.itemName}
                              </span>
                              {item.selectedOptions.length > 0 && (
                                <p className="text-xs text-gray-500">
                                  {item.selectedOptions.map((o) => o.optionName).join(', ')}
                                </p>
                              )}
                              {item.specialNote && (
                                <p className="text-xs text-red-600 font-medium">
                                  ⚠️ {item.specialNote}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                        {order.specialInstructions && (
                          <div className="pt-1 border-t mt-1">
                            <p className="text-xs text-red-600 font-medium">
                              📝 {order.specialInstructions}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Action Button */}
                      {config.action && config.nextStatus && (
                        <div className="px-3 py-2 border-t">
                          <button
                            onClick={() => updateStatus(order.id, config.nextStatus!)}
                            disabled={updating === order.id}
                            className={`w-full py-2 text-white rounded-lg font-semibold text-sm transition-colors disabled:opacity-50 ${config.actionBg}`}
                          >
                            {updating === order.id ? 'Updating...' : config.action}
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
