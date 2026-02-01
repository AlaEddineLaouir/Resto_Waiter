'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

interface Ingredient {
  id: string;
  name: string;
  allergenCode: string | null;
  isAllergen: boolean;
  _count?: { items: number };
}

export default function IngredientsPage() {
  const router = useRouter();
  const params = useParams();
  const tenantId = params.tenantId as string;

  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', allergenCode: '', isAllergen: false });
  const [error, setError] = useState('');

  useEffect(() => {
    fetchIngredients();
  }, []);

  const fetchIngredients = async () => {
    try {
      const res = await fetch('/api/admin/ingredients');
      if (res.status === 401) {
        router.push(`/t/${tenantId}/admin/login`);
        return;
      }
      const data = await res.json();
      setIngredients(data.ingredients || []);
    } catch (err) {
      setError('Failed to load ingredients');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const url = editingId 
        ? `/api/admin/ingredients/${editingId}` 
        : '/api/admin/ingredients';
      const method = editingId ? 'PUT' : 'POST';

      const body = {
        name: formData.name,
        allergenCode: formData.allergenCode || null,
        isAllergen: formData.isAllergen,
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
      setFormData({ name: '', allergenCode: '', isAllergen: false });
      fetchIngredients();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    }
  };

  const handleEdit = (ingredient: Ingredient) => {
    setFormData({ 
      name: ingredient.name, 
      allergenCode: ingredient.allergenCode || '',
      isAllergen: ingredient.isAllergen,
    });
    setEditingId(ingredient.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this ingredient?')) return;

    try {
      const res = await fetch(`/api/admin/ingredients/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete');
      }
      fetchIngredients();
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
            <h1 className="text-xl font-bold text-gray-900">Ingredients</h1>
          </div>
          <button
            onClick={() => { setShowForm(true); setEditingId(null); setFormData({ name: '', allergenCode: '', isAllergen: false }); }}
            className="bg-orange-500 text-white px-4 py-2 rounded-md hover:bg-orange-600"
          >
            + Add Ingredient
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
              {editingId ? 'Edit Ingredient' : 'Add Ingredient'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Allergen Code</label>
                <input
                  type="text"
                  value={formData.allergenCode}
                  onChange={(e) => setFormData({ ...formData, allergenCode: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="e.g., gluten, milk, nuts"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isAllergen"
                  checked={formData.isAllergen}
                  onChange={(e) => setFormData({ ...formData, isAllergen: e.target.checked })}
                  className="w-4 h-4 text-orange-500"
                />
                <label htmlFor="isAllergen" className="text-sm font-medium text-gray-700">
                  This ingredient is an allergen
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

        <div className="bg-white rounded-lg shadow">
          {ingredients.length === 0 ? (
            <p className="p-6 text-gray-500 text-center">No ingredients yet. Add one to get started!</p>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Allergen</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Used in Items</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {ingredients.map((ingredient) => (
                  <tr key={ingredient.id}>
                    <td className="px-6 py-4 font-medium">{ingredient.name}</td>
                    <td className="px-6 py-4 text-gray-500">
                      {ingredient.isAllergen && ingredient.allergenCode ? (
                        <span className="inline-block bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">
                          {ingredient.allergenCode}
                        </span>
                      ) : ingredient.isAllergen ? (
                        <span className="inline-block bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">
                          ⚠️ Allergen
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-6 py-4">{ingredient._count?.items || 0}</td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleEdit(ingredient)}
                        className="text-blue-500 hover:text-blue-700 mr-3"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(ingredient.id)}
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
