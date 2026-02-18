'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';

export default function WaiterDashboard() {
  const params = useParams();
  const tenantId = params.tenantId as string;
  const [menuSearch, setMenuSearch] = useState('');

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-br from-yellow-500 to-amber-600 rounded-xl p-6 text-white shadow-lg">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl">🍽️</span>
          <h1 className="text-2xl font-semibold">Waiter Dashboard</h1>
        </div>
        <p className="text-yellow-100 text-sm">Front of house. Manage tables, orders, and assist customers.</p>
      </div>

      {/* Menu Quick Search */}
      <div className="bg-white rounded-lg p-5 border border-gray-200">
        <h2 className="font-semibold text-gray-900 mb-3">🔍 Menu Quick Search</h2>
        <p className="text-sm text-gray-500 mb-3">Look up items for allergens, ingredients, and customer questions.</p>
        <div className="relative">
          <input
            type="text"
            value={menuSearch}
            onChange={(e) => setMenuSearch(e.target.value)}
            placeholder="Search menu items, allergens, ingredients..."
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
          />
          {menuSearch && (
            <button
              onClick={() => setMenuSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          )}
        </div>
        {menuSearch && (
          <div className="mt-3 p-4 bg-gray-50 rounded-lg text-sm text-gray-500 text-center">
            <p>Search results for &quot;{menuSearch}&quot; will appear here.</p>
            <p className="text-xs text-gray-400 mt-1">Full menu search coming soon</p>
          </div>
        )}
      </div>

      {/* My Active Orders */}
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">📦 My Active Orders</h2>
        <div className="flex flex-col items-center justify-center py-10 text-gray-400">
          <span className="text-5xl mb-4">📭</span>
          <p className="text-lg font-medium">No active orders</p>
          <p className="text-sm mt-1">Orders you create will appear here</p>
          <p className="text-xs text-gray-300 mt-4">Order management feature coming soon</p>
        </div>
      </div>

      {/* Quick Actions + Today Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Quick Actions */}
        <div className="bg-white rounded-lg p-5 border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-4">⚡ Quick Actions</h3>
          <div className="space-y-3">
            <button className="w-full text-left px-4 py-3 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg transition-colors text-sm font-medium">
              📝 New Order
            </button>
            <a
              href={`/t/${tenantId}/menu`}
              target="_blank"
              className="block w-full text-left px-4 py-3 bg-blue-50 hover:bg-blue-100 text-blue-800 rounded-lg transition-colors text-sm font-medium"
            >
              👁️ View Menu
            </a>
            <button className="w-full text-left px-4 py-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg transition-colors text-sm font-medium">
              🟢 Mark Table Free
            </button>
          </div>
        </div>

        {/* Today's Summary */}
        <div className="bg-white rounded-lg p-5 border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-4">📊 Today&apos;s Summary</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Orders Served</span>
              <span className="text-2xl font-bold text-gray-900">0</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Total Covers</span>
              <span className="text-2xl font-bold text-gray-900">0</span>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-4">Order tracking coming soon</p>
        </div>
      </div>

      {/* My Tables Placeholder */}
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">🪑 My Tables</h2>
        <div className="flex flex-col items-center justify-center py-10 text-gray-400">
          <span className="text-5xl mb-4">🪑</span>
          <p className="text-lg font-medium">Table management</p>
          <p className="text-sm mt-1">Table grid with status will appear here</p>
          <p className="text-xs text-gray-300 mt-4">Table management feature coming soon</p>
        </div>
      </div>
    </div>
  );
}
