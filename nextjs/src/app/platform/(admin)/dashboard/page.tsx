'use client';

import { useEffect, useState } from 'react';

interface Analytics {
  overview: {
    totalRestaurants: number;
    activeRestaurants: number;
    totalPlans: number;
    recentRestaurants: number;
    totalMRR: number;
  };
  subscriptionBreakdown: Array<{
    planId: string;
    planName: string;
    count: number;
    revenue: number;
  }>;
}

export default function DashboardPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const res = await fetch('/api/platform/analytics');
        if (res.ok) {
          const data = await res.json();
          setAnalytics(data);
        }
      } catch (error) {
        console.error('Failed to fetch analytics:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-48"></div>
          <div className="grid grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Total Restaurants</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {analytics?.overview.totalRestaurants || 0}
              </p>
            </div>
            <div className="text-4xl">🍽️</div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Active Restaurants</p>
              <p className="text-3xl font-bold text-green-600 mt-1">
                {analytics?.overview.activeRestaurants || 0}
              </p>
            </div>
            <div className="text-4xl">✅</div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">New (30 days)</p>
              <p className="text-3xl font-bold text-blue-600 mt-1">
                {analytics?.overview.recentRestaurants || 0}
              </p>
            </div>
            <div className="text-4xl">📈</div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Monthly Revenue</p>
              <p className="text-3xl font-bold text-teal-600 mt-1">
                €{(analytics?.overview.totalMRR || 0).toFixed(0)}
              </p>
            </div>
            <div className="text-4xl">💰</div>
          </div>
        </div>
      </div>

      {/* Subscription Breakdown */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Subscriptions by Plan
        </h2>
        <div className="space-y-4">
          {analytics?.subscriptionBreakdown.length === 0 ? (
            <p className="text-gray-500">No active subscriptions yet</p>
          ) : (
            analytics?.subscriptionBreakdown.map((sub) => (
              <div
                key={sub.planId}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div>
                  <p className="font-medium text-gray-900">{sub.planName}</p>
                  <p className="text-sm text-gray-500">{sub.count} subscribers</p>
                </div>
                <p className="font-semibold text-teal-600">
                  €{Number(sub.revenue).toFixed(0)}/mo
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
