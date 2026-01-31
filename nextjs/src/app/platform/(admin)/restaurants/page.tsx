'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Restaurant {
  id: string;
  name: string;
  slug: string;
  email: string | null;
  isActive: boolean;
  createdAt: string;
  subscription?: {
    plan: { name: string };
    status: string;
  };
  _count: {
    dishes: number;
    categories: number;
  };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export default function RestaurantsPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchRestaurants = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '10' });
      if (search) params.set('search', search);

      const res = await fetch(`/api/platform/restaurants?${params}`);
      if (res.ok) {
        const data = await res.json();
        setRestaurants(data.restaurants);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Failed to fetch restaurants:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRestaurants();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchRestaurants(1);
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Restaurants</h1>
        <Link
          href="/platform/restaurants/new"
          className="px-4 py-2 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors"
        >
          + Add Restaurant
        </Link>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="mb-6">
        <div className="flex gap-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search restaurants..."
            className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <button
            type="submit"
            className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Search
          </button>
        </div>
      </form>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">
                Restaurant
              </th>
              <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">
                Plan
              </th>
              <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">
                Dishes
              </th>
              <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">
                Status
              </th>
              <th className="text-right px-6 py-4 text-sm font-medium text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  Loading...
                </td>
              </tr>
            ) : restaurants.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  No restaurants found
                </td>
              </tr>
            ) : (
              restaurants.map((restaurant) => (
                <tr key={restaurant.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-gray-900">{restaurant.name}</p>
                      <p className="text-sm text-gray-500">{restaurant.slug}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-teal-100 text-teal-700 text-sm rounded">
                      {restaurant.subscription?.plan.name || 'No plan'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {restaurant._count.dishes} dishes
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 text-sm rounded ${
                        restaurant.isActive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {restaurant.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/platform/restaurants/${restaurant.id}`}
                      className="text-teal-600 hover:text-teal-700 font-medium"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
              {pagination.total} results
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => fetchRestaurants(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => fetchRestaurants(pagination.page + 1)}
                disabled={pagination.page === pagination.pages}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
