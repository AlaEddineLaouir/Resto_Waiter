'use client';

import { useState } from 'react';

export default function ChefDashboard() {
  const [, setLoading] = useState(false);

  // Placeholder: In a real implementation, this would fetch active orders
  const orderQueue = {
    pending: 0,
    inProgress: 0,
    ready: 0,
  };

  const handleRefresh = () => {
    setLoading(true);
    // Simulate refresh
    setTimeout(() => setLoading(false), 500);
  };

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">👨‍🍳</span>
              <h1 className="text-2xl font-semibold">Chef Dashboard</h1>
            </div>
            <p className="text-orange-100 text-sm">Kitchen view. Track orders, items, and ingredients.</p>
          </div>
          <button
            onClick={handleRefresh}
            className="bg-white/20 hover:bg-white/30 transition-colors rounded-lg px-4 py-2 text-sm font-medium"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Order Queue */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-6 border-2 border-amber-200 shadow-sm">
          <div className="text-center">
            <span className="text-4xl mb-2 block">🕐</span>
            <p className="text-5xl font-bold text-amber-600 mb-1">{orderQueue.pending}</p>
            <p className="text-sm font-medium text-gray-600">Pending</p>
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 border-2 border-blue-200 shadow-sm">
          <div className="text-center">
            <span className="text-4xl mb-2 block">🔥</span>
            <p className="text-5xl font-bold text-blue-600 mb-1">{orderQueue.inProgress}</p>
            <p className="text-sm font-medium text-gray-600">In Progress</p>
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 border-2 border-emerald-200 shadow-sm">
          <div className="text-center">
            <span className="text-4xl mb-2 block">✅</span>
            <p className="text-5xl font-bold text-emerald-600 mb-1">{orderQueue.ready}</p>
            <p className="text-sm font-medium text-gray-600">Ready</p>
          </div>
        </div>
      </div>

      {/* Active Orders */}
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">🍳 Active Orders</h2>
        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
          <span className="text-5xl mb-4">📭</span>
          <p className="text-lg font-medium">No active orders</p>
          <p className="text-sm mt-1">New orders will appear here in real-time</p>
          <p className="text-xs text-gray-300 mt-4">Order management feature coming soon</p>
        </div>
      </div>

      {/* Today's Summary + Ingredient Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg p-5 border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-3">📊 My Completed Today</h3>
          <div className="text-center py-6">
            <p className="text-4xl font-bold text-gray-900">0</p>
            <p className="text-sm text-gray-500 mt-1">Orders marked as ready</p>
          </div>
        </div>
        <div className="bg-white rounded-lg p-5 border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-3">⚠️ Ingredient Alerts</h3>
          <div className="flex items-center justify-center h-20 text-gray-400 text-sm">
            <p>No alerts at this time</p>
          </div>
          <p className="text-xs text-gray-400 mt-3">Allergen and stock alerts coming soon</p>
        </div>
      </div>
    </div>
  );
}
