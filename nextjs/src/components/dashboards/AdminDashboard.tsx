'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface AdminDashboardData {
  stats: {
    totalBrands: number;
    totalLocations: number;
    totalMenus: number;
    totalItems: number;
    todayChatSessions: number;
    monthlyChatSessions: number;
  };
  staffOverview?: {
    total: number;
    byRole: Record<string, number>;
  };
  recentActivity?: Array<{
    id: string;
    action: string;
    entity: string;
    createdAt: string;
    user?: string;
  }>;
}

export default function AdminDashboard() {
  const params = useParams();
  const tenantId = params.tenantId as string;
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/admin/dashboard');
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (err) {
        console.error('Failed to load admin dashboard:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const stats = [
    { label: 'Brands', value: data?.stats.totalBrands || 0, color: 'bg-indigo-50 text-indigo-600', icon: '🏢', href: `/t/${tenantId}/admin/brands` },
    { label: 'Locations', value: data?.stats.totalLocations || 0, color: 'bg-emerald-50 text-emerald-600', icon: '📍', href: `/t/${tenantId}/admin/locations` },
    { label: 'Menus', value: data?.stats.totalMenus || 0, color: 'bg-amber-50 text-amber-600', icon: '📋', href: `/t/${tenantId}/admin/menus` },
    { label: 'Menu Items', value: data?.stats.totalItems || 0, color: 'bg-violet-50 text-violet-600', icon: '📖', href: `/t/${tenantId}/admin/items` },
  ];

  const quickActions = [
    { label: 'Add New Item', description: 'Create a new menu item', href: `/t/${tenantId}/admin/items`, icon: '➕' },
    { label: 'Manage Menus', description: 'Create and publish menus', href: `/t/${tenantId}/admin/menus`, icon: '🚀' },
    { label: 'Manage Staff', description: 'Add or edit staff members', href: `/t/${tenantId}/admin/users`, icon: '👥' },
    { label: 'Publish Menu', description: 'Publish menu to locations', href: `/t/${tenantId}/admin/menus`, icon: '📤' },
    { label: 'View Live Menu', description: 'See your public menu', href: `/t/${tenantId}/menu`, icon: '👁️' },
  ];

  const steps = [
    { title: 'Create a Brand', desc: 'Set up your restaurant brand', done: (data?.stats.totalBrands || 0) > 0 },
    { title: 'Add a Menu', desc: 'Create menus like Lunch or Dinner', done: (data?.stats.totalMenus || 0) > 0 },
    { title: 'Create Sections', desc: 'Organize items into sections', done: false },
    { title: 'Add Menu Items', desc: 'Add dishes with prices, allergens and dietary info', done: (data?.stats.totalItems || 0) > 0 },
    { title: 'Publish Your Menu', desc: 'Make your menu visible to customers', done: false },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-xl p-6 text-white shadow-lg">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl">👑</span>
          <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
        </div>
        <p className="text-indigo-100 text-sm">Full control over your restaurant. Manage everything from menus to staff.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="bg-white rounded-lg p-5 border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all group"
          >
            <div className="flex items-center justify-between mb-4">
              <span className={`w-11 h-11 rounded-lg flex items-center justify-center text-xl ${stat.color}`}>
                {stat.icon}
              </span>
              <span className="text-gray-300 group-hover:text-indigo-400 transition-colors">→</span>
            </div>
            <p className="text-3xl font-semibold text-gray-900">{stat.value}</p>
            <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
          </Link>
        ))}
      </div>

      {/* Chat Sessions + Staff Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg p-5 border border-gray-200">
          <div className="flex items-center gap-4">
            <span className="w-11 h-11 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center text-xl">💬</span>
            <div>
              <p className="text-sm text-gray-500">Chat Sessions Today</p>
              <p className="text-2xl font-semibold text-gray-900">{data?.stats.todayChatSessions || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg p-5 border border-gray-200">
          <div className="flex items-center gap-4">
            <span className="w-11 h-11 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center text-xl">📊</span>
            <div>
              <p className="text-sm text-gray-500">Chat Sessions This Month</p>
              <p className="text-2xl font-semibold text-gray-900">{data?.stats.monthlyChatSessions || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg p-5 border border-gray-200">
          <div className="flex items-center gap-4">
            <span className="w-11 h-11 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center text-xl">👥</span>
            <div>
              <p className="text-sm text-gray-500">Staff Members</p>
              <p className="text-2xl font-semibold text-gray-900">{data?.staffOverview?.total || '—'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {quickActions.map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className="bg-white rounded-lg p-5 border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all group"
            >
              <span className="text-2xl mb-3 block">{action.icon}</span>
              <h3 className="font-medium text-gray-900 group-hover:text-indigo-600 transition-colors">{action.label}</h3>
              <p className="text-sm text-gray-500 mt-1">{action.description}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      {data?.recentActivity && data.recentActivity.length > 0 && (
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Recent Activity</h2>
          <div className="space-y-3">
            {data.recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-center gap-3 text-sm">
                <span className="w-2 h-2 rounded-full bg-indigo-400 flex-shrink-0"></span>
                <span className="text-gray-700">{activity.user && <strong>{activity.user}</strong>} {activity.action} {activity.entity}</span>
                <span className="text-gray-400 ml-auto text-xs">{new Date(activity.createdAt).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Getting Started Guide */}
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Getting Started</h2>
        <div className="space-y-4">
          {steps.map((step, idx) => (
            <div key={step.title} className="flex items-start gap-4">
              <span className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0 ${
                step.done ? 'bg-emerald-100 text-emerald-600' : 'bg-indigo-100 text-indigo-600'
              }`}>
                {step.done ? '✓' : idx + 1}
              </span>
              <div>
                <h3 className={`font-medium ${step.done ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{step.title}</h3>
                <p className="text-sm text-gray-500">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
