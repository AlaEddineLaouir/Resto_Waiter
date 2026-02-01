'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface Menu {
  id: string;
  code: string;
  status: string;
  translations: { locale: string; name: string }[];
}

interface OptionItem {
  id: string;
  code: string | null;
  displayOrder: number;
  isDefault: boolean;
  isActive: boolean;
  translations: { locale: string; name: string; description: string | null }[];
  price: { currency: string; deltaMinor: string } | null;
}

interface OptionGroup {
  id: string;
  code: string | null;
  selectionMode: string;
  minSelect: number;
  maxSelect: number | null;
  isRequired: boolean;
  displayOrder: number;
  isActive: boolean;
  menuId: string;
  menu: Menu;
  translations: { locale: string; name: string; description: string | null }[];
  options: OptionItem[];
  items: { item: { id: string; translations: { name: string }[] } }[];
}

export default function OptionGroupsPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;

  const [optionGroups, setOptionGroups] = useState<OptionGroup[]>([]);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    menuId: '',
    code: '',
    name: '',
    description: '',
    selectionMode: 'single',
    minSelect: 0,
    maxSelect: 1,
    isRequired: false,
    displayOrder: 0,
    isActive: true,
  });

  // Options form
  const [showOptionsForm, setShowOptionsForm] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [optionFormData, setOptionFormData] = useState({
    name: '',
    price: '',
    currency: 'EUR',
    isDefault: false,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [groupsRes, menusRes] = await Promise.all([
        fetch('/api/admin/option-groups'),
        fetch('/api/admin/menus'),
      ]);

      if (groupsRes.ok) {
        const data = await groupsRes.json();
        setOptionGroups(data.optionGroups || []);
      }

      if (menusRes.ok) {
        const data = await menusRes.json();
        setMenus(data.menus || []);
      }
    } catch (err) {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const url = editingId
      ? `/api/admin/option-groups/${editingId}`
      : '/api/admin/option-groups';
    const method = editingId ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          menuId: formData.menuId,
          code: formData.code || null,
          selectionMode: formData.selectionMode,
          minSelect: formData.minSelect,
          maxSelect: formData.maxSelect,
          isRequired: formData.isRequired,
          displayOrder: formData.displayOrder,
          isActive: formData.isActive,
          translations: [
            {
              locale: 'en-US',
              name: formData.name,
              description: formData.description || null,
            },
          ],
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save');
      }

      resetForm();
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    }
  };

  const handleEdit = (group: OptionGroup) => {
    const trans = group.translations[0];
    setFormData({
      menuId: group.menuId,
      code: group.code || '',
      name: trans?.name || '',
      description: trans?.description || '',
      selectionMode: group.selectionMode,
      minSelect: group.minSelect,
      maxSelect: group.maxSelect || 1,
      isRequired: group.isRequired,
      displayOrder: group.displayOrder,
      isActive: group.isActive,
    });
    setEditingId(group.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this option group and all its options?')) return;

    try {
      const res = await fetch(`/api/admin/option-groups/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      fetchData();
    } catch (err) {
      setError('Failed to delete');
    }
  };

  const handleAddOption = (groupId: string) => {
    setSelectedGroupId(groupId);
    setOptionFormData({ name: '', price: '', currency: 'EUR', isDefault: false });
    setShowOptionsForm(true);
  };

  const handleOptionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroupId) return;

    // For now, we'll need to update the full group to add an option
    // This could be a separate API endpoint in production
    setError('Option management requires updating the full option group');
    setShowOptionsForm(false);
  };

  const resetForm = () => {
    setFormData({
      menuId: '',
      code: '',
      name: '',
      description: '',
      selectionMode: 'single',
      minSelect: 0,
      maxSelect: 1,
      isRequired: false,
      displayOrder: 0,
      isActive: true,
    });
    setEditingId(null);
    setShowForm(false);
  };

  const getMenuLabel = (menu: Menu) => {
    const menuName = menu.translations[0]?.name || menu.code;
    const statusBadge = menu.status === 'published' ? '✓' : menu.status === 'draft' ? '○' : '⊗';
    return `${statusBadge} ${menuName}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href={`/t/${tenantId}/admin`} className="text-gray-500 hover:text-gray-700">
                ← Back
              </Link>
              <h1 className="text-2xl font-bold text-gray-800">Option Groups</h1>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
            >
              + Add Option Group
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            {error}
            <button onClick={() => setError('')} className="ml-2 text-red-800">
              ✕
            </button>
          </div>
        )}

        {/* Info Box */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-medium text-blue-800 mb-2">📋 What are Option Groups?</h3>
          <p className="text-sm text-blue-700">
            Option groups define customizations for menu items like sizes (Small, Medium, Large),
            sides (Fries, Salad), or add-ons (Extra Cheese, Bacon). They can be assigned to multiple
            items.
          </p>
        </div>

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-lg mx-4">
              <h2 className="text-xl font-bold mb-4">
                {editingId ? 'Edit Option Group' : 'Add Option Group'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Menu *
                  </label>
                  <select
                    required
                    value={formData.menuId}
                    onChange={(e) => setFormData({ ...formData, menuId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    disabled={!!editingId}
                  >
                    <option value="">Select menu...</option>
                    {menus.map((m) => (
                      <option key={m.id} value={m.id}>
                        {getMenuLabel(m)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="e.g., Size, Extras"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
                    <input
                      type="text"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="Optional code"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Selection Mode
                  </label>
                  <select
                    value={formData.selectionMode}
                    onChange={(e) => setFormData({ ...formData, selectionMode: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="single">Single (Radio buttons)</option>
                    <option value="multiple">Multiple (Checkboxes)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Min Selections
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.minSelect}
                      onChange={(e) =>
                        setFormData({ ...formData, minSelect: parseInt(e.target.value) || 0 })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max Selections
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.maxSelect}
                      onChange={(e) =>
                        setFormData({ ...formData, maxSelect: parseInt(e.target.value) || 1 })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.isRequired}
                      onChange={(e) => setFormData({ ...formData, isRequired: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Required</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Active</span>
                  </label>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
                  >
                    {editingId ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Option Groups List */}
        {optionGroups.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm">
            <p className="text-gray-500">No option groups yet. Create one to get started!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {optionGroups.map((group) => {
              const trans = group.translations[0];
              return (
                <div key={group.id} className="bg-white rounded-lg shadow-sm border p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-800">
                        {trans?.name || 'Untitled'}
                        {group.code && (
                          <span className="ml-2 text-sm text-gray-500">({group.code})</span>
                        )}
                      </h3>
                      <p className="text-sm text-gray-500">{getMenuLabel(group.menu)}</p>
                    </div>
                    <div className="flex gap-2">
                      <span
                        className={`px-2 py-1 text-xs rounded ${
                          group.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {group.isActive ? 'Active' : 'Inactive'}
                      </span>
                      <span className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-700">
                        {group.selectionMode === 'single' ? 'Single' : 'Multiple'}
                      </span>
                      {group.isRequired && (
                        <span className="px-2 py-1 text-xs rounded bg-orange-100 text-orange-700">
                          Required
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Options */}
                  <div className="mb-3">
                    <div className="text-sm font-medium text-gray-600 mb-2">
                      Options ({group.options.length}):
                    </div>
                    {group.options.length === 0 ? (
                      <p className="text-sm text-gray-400 italic">No options defined</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {group.options.map((opt) => {
                          const optTrans = opt.translations[0];
                          const price = opt.price
                            ? (parseInt(opt.price.deltaMinor) / 100).toFixed(2)
                            : null;
                          return (
                            <span
                              key={opt.id}
                              className={`px-2 py-1 text-sm rounded border ${
                                opt.isDefault ? 'bg-teal-50 border-teal-300' : 'bg-gray-50'
                              }`}
                            >
                              {optTrans?.name || opt.code || 'Option'}
                              {price && price !== '0.00' && (
                                <span className="ml-1 text-teal-600">+€{price}</span>
                              )}
                              {opt.isDefault && (
                                <span className="ml-1 text-xs text-teal-600">✓</span>
                              )}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Assigned Items */}
                  {group.items.length > 0 && (
                    <div className="mb-3 text-sm text-gray-500">
                      Used by: {group.items.map((i) => i.item.translations[0]?.name).join(', ')}
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-2 border-t">
                    <button
                      onClick={() => handleAddOption(group.id)}
                      className="text-sm text-purple-600 hover:text-purple-700"
                    >
                      + Add Option
                    </button>
                    <button
                      onClick={() => handleEdit(group)}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(group.id)}
                      className="text-sm text-red-600 hover:text-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
