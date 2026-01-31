'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

interface DashboardData {
  stats: {
    totalCategories: number;
    totalDishes: number;
    totalIngredients: number;
    todayChatSessions: number;
    monthlyChatSessions: number;
  };
  recentSessions: Array<{
    id: string;
    createdAt: string;
    messageCount: number;
  }>;
}

interface AdminUser {
  id: string;
  username: string;
  email: string;
  role: string;
}

export default function RestaurantAdminDashboard() {
  const router = useRouter();
  const params = useParams();
  const tenantId = params.tenantId as string;
  
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Check auth
        const authRes = await fetch('/api/admin/auth/me');
        if (!authRes.ok) {
          router.push(`/t/${tenantId}/admin/login`);
          return;
        }
        const authData = await authRes.json();
        setAdmin(authData.admin);

        // Fetch dashboard
        const dashRes = await fetch('/api/admin/dashboard');
        if (dashRes.ok) {
          const dashData = await dashRes.json();
          setDashboard(dashData);
        }
      } catch (err) {
        setError('Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router, tenantId]);

  const handleLogout = async () => {
    await fetch('/api/admin/auth/logout', { method: 'POST' });
    router.push(`/t/${tenantId}/admin/login`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">Restaurant Admin</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-600">{admin?.email}</span>
            <button
              onClick={handleLogout}
              className="text-red-500 hover:text-red-700"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-gray-500 text-sm">Categories</h3>
            <p className="text-3xl font-bold">{dashboard?.stats.totalCategories || 0}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-gray-500 text-sm">Dishes</h3>
            <p className="text-3xl font-bold">{dashboard?.stats.totalDishes || 0}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-gray-500 text-sm">Ingredients</h3>
            <p className="text-3xl font-bold">{dashboard?.stats.totalIngredients || 0}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-gray-500 text-sm">Ingredients</h3>
            <p className="text-3xl font-bold">{dashboard?.stats.totalIngredients || 0}</p>
          </div>
        </div>

        {/* Usage */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-gray-500 text-sm mb-2">Chat Sessions Today</h3>
            <p className="text-3xl font-bold text-orange-500">{dashboard?.stats.todayChatSessions || 0}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-gray-500 text-sm mb-2">Chat Sessions This Month</h3>
            <p className="text-3xl font-bold text-orange-500">{dashboard?.stats.monthlyChatSessions || 0}</p>
          </div>
        </div>

        {/* Navigation */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href={`/t/${tenantId}/admin/categories`}
            className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow"
          >
            <h3 className="text-lg font-semibold mb-2">📂 Categories</h3>
            <p className="text-gray-600">Manage menu categories</p>
          </Link>
          <Link
            href={`/t/${tenantId}/admin/dishes`}
            className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow"
          >
            <h3 className="text-lg font-semibold mb-2">🍽️ Dishes</h3>
            <p className="text-gray-600">Manage dishes and prices</p>
          </Link>
          <Link
            href={`/t/${tenantId}/admin/ingredients`}
            className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow"
          >
            <h3 className="text-lg font-semibold mb-2">🥗 Ingredients</h3>
            <p className="text-gray-600">Manage ingredients and allergens</p>
          </Link>
        </div>

        {/* Back link */}
        <div className="mt-8 text-center">
          <Link href={`/t/${tenantId}`} className="text-orange-500 hover:underline">
            ← Back to Chat
          </Link>
        </div>
      </div>
    </div>
  );
}
