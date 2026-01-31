'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Restaurant {
  id: string;
  name: string;
  slug: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  isActive: boolean;
  createdAt: string;
  subscription?: {
    plan: { name: string; priceMonthly: number };
    status: string;
    startDate: string;
  };
  categories: Array<{
    id: string;
    name: string;
    _count: { dishes: number };
  }>;
  _count: {
    dishes: number;
    chatSessions: number;
  };
}

export default function RestaurantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    isActive: true,
  });

  useEffect(() => {
    async function fetchRestaurant() {
      try {
        const res = await fetch(`/api/platform/restaurants/${id}`);
        if (res.ok) {
          const data = await res.json();
          setRestaurant(data.restaurant);
          setFormData({
            name: data.restaurant.name,
            email: data.restaurant.email || '',
            phone: data.restaurant.phone || '',
            address: data.restaurant.address || '',
            isActive: data.restaurant.isActive,
          });
        }
      } catch (error) {
        console.error('Failed to fetch restaurant:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchRestaurant();
  }, [id]);

  const handleSave = async () => {
    try {
      const res = await fetch(`/api/platform/restaurants/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        const data = await res.json();
        setRestaurant(data.restaurant);
        setEditing(false);
      }
    } catch (error) {
      console.error('Failed to update restaurant:', error);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this restaurant?')) return;

    try {
      const res = await fetch(`/api/platform/restaurants/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        router.push('/platform/restaurants');
      }
    } catch (error) {
      console.error('Failed to delete restaurant:', error);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-64"></div>
          <div className="bg-white rounded-xl p-6">
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-6 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="p-8">
        <p className="text-gray-500">Restaurant not found</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link
            href="/platform/restaurants"
            className="text-gray-500 hover:text-gray-700 text-sm mb-2 inline-block"
          >
            ← Back to Restaurants
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{restaurant.name}</h1>
        </div>
        <div className="flex gap-4">
          {editing ? (
            <>
              <button
                onClick={() => setEditing(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
              >
                Save Changes
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setEditing(true)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Edit
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Details */}
        <div className="lg:col-span-2 bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-lg text-gray-900 mb-4">Details</h2>

          {editing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  rows={3}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded text-teal-600"
                />
                <label htmlFor="isActive" className="text-sm text-gray-700">
                  Active
                </label>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">Slug</span>
                <span className="font-medium">{restaurant.slug}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">Email</span>
                <span className="font-medium">{restaurant.email || '-'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">Phone</span>
                <span className="font-medium">{restaurant.phone || '-'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">Address</span>
                <span className="font-medium">{restaurant.address || '-'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">Status</span>
                <span
                  className={`px-2 py-1 text-sm rounded ${
                    restaurant.isActive
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {restaurant.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-500">Created</span>
                <span className="font-medium">
                  {new Date(restaurant.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Stats & Subscription */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h2 className="font-semibold text-lg text-gray-900 mb-4">Stats</h2>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-500">Dishes</span>
                <span className="font-bold text-xl">{restaurant._count.dishes}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Categories</span>
                <span className="font-bold text-xl">{restaurant.categories.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Chat Sessions</span>
                <span className="font-bold text-xl">{restaurant._count.chatSessions}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h2 className="font-semibold text-lg text-gray-900 mb-4">Subscription</h2>
            {restaurant.subscription ? (
              <div className="space-y-2">
                <p className="text-2xl font-bold text-teal-600">
                  {restaurant.subscription.plan.name}
                </p>
                <p className="text-gray-500">
                  €{Number(restaurant.subscription.plan.priceMonthly).toFixed(0)}/month
                </p>
                <p className="text-sm text-gray-400">
                  Since {new Date(restaurant.subscription.startDate).toLocaleDateString()}
                </p>
              </div>
            ) : (
              <p className="text-gray-500">No active subscription</p>
            )}
          </div>

          <div className="bg-teal-50 rounded-xl p-6 border border-teal-100">
            <h2 className="font-semibold text-lg text-teal-900 mb-2">Quick Links</h2>
            <div className="space-y-2">
              <Link
                href={`/t/${restaurant.id}`}
                target="_blank"
                className="block text-teal-600 hover:text-teal-700"
              >
                → Open Chat Interface
              </Link>
              <Link
                href={`/t/${restaurant.id}/menu`}
                target="_blank"
                className="block text-teal-600 hover:text-teal-700"
              >
                → View Menu Page
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
