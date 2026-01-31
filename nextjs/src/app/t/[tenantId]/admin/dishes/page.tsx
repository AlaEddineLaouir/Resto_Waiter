'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

interface Category {
  id: string;
  name: string;
}

interface Dish {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  isAvailable: boolean;
  isVegetarian: boolean;
  allergens: string[];
  category: Category;
}

export default function DishesPage() {
  const router = useRouter();
  const params = useParams();
  const tenantId = params.tenantId as string;

  const [dishes, setDishes] = useState<Dish[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    categoryId: '',
    isAvailable: true,
    isVegetarian: false,
    allergens: '',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [dishesRes, categoriesRes] = await Promise.all([
        fetch('/api/admin/dishes'),
        fetch('/api/admin/categories'),
      ]);

      if (dishesRes.status === 401) {
        router.push(`/t/${tenantId}/admin/login`);
        return;
      }

      const dishesData = await dishesRes.json();
      const categoriesData = await categoriesRes.json();

      setDishes(dishesData.dishes || []);
      setCategories(categoriesData.categories || []);
    } catch (err) {
      setError('Failed to load dishes');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const url = editingId 
        ? `/api/admin/dishes/${editingId}` 
        : '/api/admin/dishes';
      const method = editingId ? 'PUT' : 'POST';

      const body = {
        ...formData,
        price: parseFloat(formData.price),
        allergens: formData.allergens.split(',').map(a => a.trim()).filter(Boolean),
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save');
      }

      setShowForm(false);
      setEditingId(null);
      resetForm();
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      categoryId: '',
      isAvailable: true,
      isVegetarian: false,
      allergens: '',
    });
  };

  const handleEdit = (dish: Dish) => {
    setFormData({
      name: dish.name,
      description: dish.description || '',
      price: dish.price.toString(),
      categoryId: dish.category.id,
      isAvailable: dish.isAvailable,
      isVegetarian: dish.isVegetarian,
      allergens: dish.allergens.join(', '),
    });
    setEditingId(dish.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this dish?')) return;

    try {
      const res = await fetch(`/api/admin/dishes/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete');
      }
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    }
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
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href={`/t/${tenantId}/admin`} className="text-gray-500 hover:text-gray-700">
              ← Back
            </Link>
            <h1 className="text-xl font-bold text-gray-900">Dishes</h1>
          </div>
          <button
            onClick={() => { setShowForm(true); setEditingId(null); resetForm(); }}
            className="bg-orange-500 text-white px-4 py-2 rounded-md hover:bg-orange-600"
          >
            + Add Dish
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
            <button onClick={() => setError('')} className="float-right">×</button>
          </div>
        )}

        {showForm && (
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <h2 className="text-lg font-semibold mb-4">
              {editingId ? 'Edit Dish' : 'Add Dish'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={formData.categoryId}
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                >
                  <option value="">Select category...</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Allergens (comma-separated)</label>
                <input
                  type="text"
                  value={formData.allergens}
                  onChange={(e) => setFormData({ ...formData, allergens: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="gluten, dairy, nuts"
                />
              </div>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.isAvailable}
                    onChange={(e) => setFormData({ ...formData, isAvailable: e.target.checked })}
                    className="mr-2"
                  />
                  Available
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.isVegetarian}
                    onChange={(e) => setFormData({ ...formData, isVegetarian: e.target.checked })}
                    className="mr-2"
                  />
                  Vegetarian
                </label>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="bg-orange-500 text-white px-4 py-2 rounded-md hover:bg-orange-600"
                >
                  {editingId ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setEditingId(null); }}
                  className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white rounded-lg shadow overflow-x-auto">
          {dishes.length === 0 ? (
            <p className="p-6 text-gray-500 text-center">No dishes yet. Add one to get started!</p>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {dishes.map((dish) => (
                  <tr key={dish.id}>
                    <td className="px-6 py-4">
                      <div className="font-medium">{dish.name}</div>
                      {dish.isVegetarian && <span className="text-xs text-green-600">🌱 Vegetarian</span>}
                    </td>
                    <td className="px-6 py-4 text-gray-500">{dish.category.name}</td>
                    <td className="px-6 py-4">€{Number(dish.price).toFixed(2)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        dish.isAvailable ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {dish.isAvailable ? 'Available' : 'Unavailable'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleEdit(dish)}
                        className="text-blue-500 hover:text-blue-700 mr-3"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(dish.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
