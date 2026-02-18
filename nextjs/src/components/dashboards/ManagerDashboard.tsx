'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface ManagerDashboardData {
  stats: {
    totalMenus: number;
    totalItems: number;
    totalSections: number;
    publishedMenus: number;
    draftMenus: number;
  };
}

export default function ManagerDashboard() {
  const params = useParams();
  const tenantId = params.tenantId as string;
  const [data, setData] = useState<ManagerDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/admin/dashboard');
        if (res.ok) {
          const json = await res.json();
          setData({
            stats: {
              totalMenus: json.stats?.totalMenus || 0,
              totalItems: json.stats?.totalItems || 0,
              totalSections: 0,
              publishedMenus: 0,
              draftMenus: json.stats?.totalMenus || 0,
            },
          });
        }
      } catch (err) {
        console.error('Failed to load manager dashboard:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const menuStats = [
    { label: 'Total Menus', value: data?.stats.totalMenus || 0, icon: '📋', color: 'bg-blue-50 text-blue-600' },
    { label: 'Menu Items', value: data?.stats.totalItems || 0, icon: '📖', color: 'bg-violet-50 text-violet-600' },
    { label: 'Published', value: data?.stats.publishedMenus || 0, icon: '✅', color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Drafts', value: data?.stats.draftMenus || 0, icon: '📝', color: 'bg-amber-50 text-amber-600' },
  ];

  const quickActions = [
    { label: 'Edit Menu', description: 'Modify existing menus', href: `/t/${tenantId}/admin/menus`, icon: '✏️' },
    { label: 'Add Item', description: 'Create a new menu item', href: `/t/${tenantId}/admin/items`, icon: '➕' },
    { label: 'Publish Menu', description: 'Publish to locations', href: `/t/${tenantId}/admin/menus`, icon: '📤' },
    { label: 'Manage Staff', description: 'View and manage team', href: `/t/${tenantId}/admin/users`, icon: '👥' },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-6 text-white shadow-lg">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl">📊</span>
          <h1 className="text-2xl font-semibold">Manager Dashboard</h1>
        </div>
        <p className="text-blue-100 text-sm">Oversee daily operations. Manage menus, orders, and staff.</p>
      </div>

      {/* Menu Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {menuStats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-lg p-5 border border-gray-200">
            <div className="flex items-center gap-3 mb-3">
              <span className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${stat.color}`}>
                {stat.icon}
              </span>
              <span className="text-sm text-gray-500">{stat.label}</span>
            </div>
            <p className="text-3xl font-semibold text-gray-900">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Order Activity Placeholder */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg p-5 border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-3">📦 Order Activity</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500">Today&apos;s Orders</span>
              <span className="font-medium text-gray-900">—</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500">Pending</span>
              <span className="font-medium text-amber-600">—</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500">Completed</span>
              <span className="font-medium text-emerald-600">—</span>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-3">Order tracking coming soon</p>
        </div>

        <div className="bg-white rounded-lg p-5 border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-3">⚠️ Availability Alerts</h3>
          <div className="flex items-center justify-center h-20 text-gray-400 text-sm">
            <p>No alerts at this time</p>
          </div>
          <p className="text-xs text-gray-400 mt-3">Item availability tracking coming soon</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className="bg-white rounded-lg p-5 border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all group"
            >
              <span className="text-2xl mb-3 block">{action.icon}</span>
              <h3 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">{action.label}</h3>
              <p className="text-sm text-gray-500 mt-1">{action.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
