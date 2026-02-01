'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import AIDescriptionHelper from '@/components/AIDescriptionHelper';

interface Section {
  id: string;
  translations: { locale: string; title: string }[];
  menuSections?: {
    menuId: string;
    menu: {
      id: string;
      code: string;
      status: string;
      translations: { locale: string; name: string }[];
    };
  }[];
}

interface Allergen {
  code: string;
  translations: { locale: string; name: string }[];
}

interface DietaryFlag {
  code: string;
  translations: { locale: string; name: string }[];
}

interface Ingredient {
  id: string;
  name: string;
}

interface Item {
  id: string;
  sku: string | null;
  isVisible: boolean;
  spicinessLevel: number | null;
  calories: number | null;
  sectionId: string;
  section: Section;
  translations: {
    id: string;
    locale: string;
    name: string;
    description: string | null;
  }[];
  priceBase: {
    currency: string;
    amountMinor: string;
  } | null;
  allergens: { allergenCode: string; allergen: Allergen }[];
  dietaryFlags: { dietaryFlagCode: string; dietaryFlag: DietaryFlag }[];
  ingredients: { ingredientId: string; ingredient: Ingredient }[];
  menuItems?: { menuId: string; displayOrder: number }[];
}

// Icons
const Icons = {
  Plus: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  ),
  Edit: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  ),
  Trash: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  ),
  Link: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
  ),
  Back: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  ),
  Close: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  Check: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  Eye: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ),
  EyeOff: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  ),
  Food: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  ),
  Grid: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  ),
  List: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
    </svg>
  ),
};

// Confirmation Modal
function ConfirmModal({
  isOpen, title, message, confirmText, cancelText, confirmColor, onConfirm, onCancel, icon,
}: {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  confirmColor: 'red' | 'blue' | 'amber';
  onConfirm: () => void;
  onCancel: () => void;
  icon?: React.ReactNode;
}) {
  if (!isOpen) return null;

  const colorClasses = {
    red: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
    blue: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
    amber: 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500',
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl">
        <div className="flex items-start gap-4">
          {icon && (
            <div className={`p-3 rounded-full ${confirmColor === 'red' ? 'bg-red-100 text-red-600' : confirmColor === 'amber' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
              {icon}
            </div>
          )}
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <p className="mt-2 text-sm text-gray-600">{message}</p>
          </div>
        </div>
        <div className="mt-6 flex gap-3 justify-end">
          <button onClick={onCancel} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
            {cancelText}
          </button>
          <button onClick={onConfirm} className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${colorClasses[confirmColor]}`}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ItemsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const tenantId = params.tenantId as string;
  const filterSectionId = searchParams.get('sectionId') || '';

  const [items, setItems] = useState<Item[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [allergens, setAllergens] = useState<Allergen[]>([]);
  const [dietaryFlags, setDietaryFlags] = useState<DietaryFlag[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    sectionId: filterSectionId,
    sku: '',
    name: '',
    description: '',
    price: '',
    currency: 'EUR',
    isVisible: true,
    spicinessLevel: 0,
    calories: '',
    allergenCodes: [] as string[],
    dietaryFlagCodes: [] as string[],
    ingredientIds: [] as string[],
  });

  // Confirmation modal
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    cancelText: string;
    confirmColor: 'red' | 'blue' | 'amber';
    onConfirm: () => void;
    icon?: React.ReactNode;
  }>({ isOpen: false, title: '', message: '', confirmText: '', cancelText: '', confirmColor: 'blue', onConfirm: () => {} });

  // Filter state
  const [selectedSectionId, setSelectedSectionId] = useState(filterSectionId);

  useEffect(() => { fetchData(); }, []);
  useEffect(() => { if (successMessage) { const t = setTimeout(() => setSuccessMessage(''), 3000); return () => clearTimeout(t); } }, [successMessage]);

  const fetchData = async () => {
    try {
      const [itemsRes, sectionsRes, allergensRes, flagsRes, ingredientsRes] = await Promise.all([
        fetch('/api/admin/items'),
        fetch('/api/admin/sections'),
        fetch('/api/admin/allergens'),
        fetch('/api/admin/dietary-flags'),
        fetch('/api/admin/ingredients'),
      ]);

      if (itemsRes.ok) { const data = await itemsRes.json(); setItems(data.items || []); }
      if (sectionsRes.ok) { const data = await sectionsRes.json(); setSections(data.sections || []); }
      if (allergensRes.ok) { const data = await allergensRes.json(); setAllergens(data.allergens || []); }
      if (flagsRes.ok) { const data = await flagsRes.json(); setDietaryFlags(data.dietaryFlags || []); }
      if (ingredientsRes.ok) { const data = await ingredientsRes.json(); setIngredients(data.ingredients || []); }
    } catch { setError('Failed to load data'); } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const url = editingId ? `/api/admin/items/${editingId}` : '/api/admin/items';
    const method = editingId ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sectionId: formData.sectionId,
          sku: formData.sku || null,
          isVisible: formData.isVisible,
          spicinessLevel: formData.spicinessLevel || null,
          calories: formData.calories ? parseInt(formData.calories) : null,
          translations: [{ locale: 'en-US', name: formData.name, description: formData.description || null }],
          price: formData.price ? parseFloat(formData.price) : null,
          currency: formData.currency,
          allergens: formData.allergenCodes,
          dietaryFlags: formData.dietaryFlagCodes,
        }),
      });

      if (!res.ok) { const data = await res.json(); throw new Error(data.error || 'Failed to save item'); }

      setSuccessMessage(editingId ? 'Item updated successfully!' : 'Item created successfully!');
      resetForm();
      fetchData();
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to save'); }
  };

  const handleEdit = (item: Item) => {
    const trans = (item.translations || [])[0];
    setFormData({
      sectionId: item.sectionId,
      sku: item.sku || '',
      name: trans?.name || '',
      description: trans?.description || '',
      price: item.priceBase ? (parseInt(item.priceBase.amountMinor) / 100).toString() : '',
      currency: item.priceBase?.currency || 'EUR',
      isVisible: item.isVisible,
      spicinessLevel: item.spicinessLevel || 0,
      calories: item.calories?.toString() || '',
      allergenCodes: (item.allergens || []).map((a) => a.allergenCode),
      dietaryFlagCodes: (item.dietaryFlags || []).map((d) => d.dietaryFlagCode),
      ingredientIds: (item.ingredients || []).map((i) => i.ingredientId),
    });
    setEditingId(item.id);
    setShowForm(true);
  };

  const handleDeleteConfirm = (item: Item) => {
    const trans = (item.translations || [])[0];
    setConfirmModal({
      isOpen: true,
      title: 'Delete Item Permanently',
      message: `Are you sure you want to delete "${trans?.name || 'this item'}"? This action cannot be undone.`,
      confirmText: 'Delete Permanently',
      cancelText: 'Keep Item',
      confirmColor: 'red',
      icon: <Icons.Trash />,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/admin/items/${item.id}`, { method: 'DELETE' });
          if (!res.ok) throw new Error('Failed to delete');
          setSuccessMessage('Item deleted successfully!');
          fetchData();
        } catch { setError('Failed to delete item'); }
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  const handleToggleVisible = async (item: Item) => {
    try {
      await fetch(`/api/admin/items/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isVisible: !item.isVisible }),
      });
      setSuccessMessage(`Item ${item.isVisible ? 'hidden' : 'shown'} successfully!`);
      fetchData();
    } catch { setError('Failed to update item'); }
  };

  const resetForm = () => {
    setFormData({
      sectionId: selectedSectionId,
      sku: '',
      name: '',
      description: '',
      price: '',
      currency: 'EUR',
      isVisible: true,
      spicinessLevel: 0,
      calories: '',
      allergenCodes: [],
      dietaryFlagCodes: [],
      ingredientIds: [],
    });
    setEditingId(null);
    setShowForm(false);
  };

  const getSectionLabel = (section: Section | undefined) => {
    if (!section) return 'Unknown Section';
    const sectionTitle = section.translations?.[0]?.title || 'Section';
    if (section.menuSections && section.menuSections.length > 0) {
      const ms = section.menuSections[0];
      const menuName = ms.menu?.translations?.[0]?.name || ms.menu?.code || 'Menu';
      return `${menuName} > ${sectionTitle}`;
    }
    return sectionTitle;
  };

  const filteredItems = selectedSectionId ? items.filter((i) => i.sectionId === selectedSectionId) : items;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading items...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href={`/t/${tenantId}/admin`} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors">
                <Icons.Back />
                <span>Back to Dashboard</span>
              </Link>
            </div>
            <h1 className="text-2xl font-bold text-gray-800">Menu Items</h1>
            <button
              onClick={() => { setFormData({ ...formData, sectionId: selectedSectionId }); setShowForm(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors shadow-sm"
            >
              <Icons.Plus />
              <span>Create Item</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Messages */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError('')} className="text-red-800 hover:text-red-900"><Icons.Close /></button>
          </div>
        )}
        {successMessage && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg flex items-center gap-2">
            <Icons.Check />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Info Banner */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>💡 Tip:</strong> Items are reusable entities that belong to a section. 
            You can link items to multiple menus for maximum flexibility.
          </p>
        </div>

        {/* Filter & View Toggle */}
        <div className="mb-6 bg-white p-4 rounded-lg shadow-sm border flex flex-wrap items-center justify-between gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Section</label>
            <select
              value={selectedSectionId}
              onChange={(e) => setSelectedSectionId(e.target.value)}
              className="w-full md:w-80 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            >
              <option value="">All Items ({items.length})</option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>{s.translations?.[0]?.title || 'Section'}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">View:</span>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${viewMode === 'list' ? 'bg-teal-100 text-teal-700' : 'bg-gray-100 text-gray-600'}`}
            >
              <Icons.List />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded ${viewMode === 'grid' ? 'bg-teal-100 text-teal-700' : 'bg-gray-100 text-gray-600'}`}
            >
              <Icons.Grid />
            </button>
          </div>
        </div>

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto py-8">
            <div className="bg-white rounded-xl p-6 w-full max-w-2xl mx-4 my-auto shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">{editingId ? 'Edit Item' : 'Create New Item'}</h2>
                <button onClick={resetForm} className="text-gray-400 hover:text-gray-600"><Icons.Close /></button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Section Select */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Section <span className="text-red-500">*</span></label>
                  <select
                    required
                    value={formData.sectionId}
                    onChange={(e) => setFormData({ ...formData, sectionId: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  >
                    <option value="">Select section...</option>
                    {sections.map((s) => (
                      <option key={s.id} value={s.id}>{s.translations?.[0]?.title || 'Section'}</option>
                    ))}
                  </select>
                </div>

                {/* Name & SKU */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Item Name <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      placeholder="e.g., Margherita Pizza"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">SKU <span className="text-gray-400">(optional)</span></label>
                    <input
                      type="text"
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      placeholder="PIZZA-001"
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-gray-700">Description</label>
                    <AIDescriptionHelper
                      context={formData.name}
                      contextType="item"
                      onGenerate={(desc) => setFormData({ ...formData, description: desc })}
                      disabled={!formData.name.trim()}
                    />
                  </div>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    rows={3}
                    placeholder="Describe this delicious item..."
                  />
                </div>

                {/* Price, Currency, Calories, Spiciness */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Price <span className="text-red-500">*</span></label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      placeholder="12.50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                    <select
                      value={formData.currency}
                      onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    >
                      <option value="EUR">EUR €</option>
                      <option value="USD">USD $</option>
                      <option value="GBP">GBP £</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Calories</label>
                    <input
                      type="number"
                      value={formData.calories}
                      onChange={(e) => setFormData({ ...formData, calories: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      placeholder="450"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Spiciness 🌶️</label>
                    <select
                      value={formData.spicinessLevel}
                      onChange={(e) => setFormData({ ...formData, spicinessLevel: parseInt(e.target.value) })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    >
                      <option value={0}>None</option>
                      <option value={1}>🌶️ Mild</option>
                      <option value={2}>🌶️🌶️ Medium</option>
                      <option value={3}>🌶️🌶️🌶️ Hot</option>
                      <option value={4}>🌶️🌶️🌶️🌶️ Very Hot</option>
                      <option value={5}>🌶️🌶️🌶️🌶️🌶️ Extreme</option>
                    </select>
                  </div>
                </div>

                {/* Allergens & Dietary Flags */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Allergens ⚠️</label>
                    <div className="border border-gray-300 rounded-lg p-3 max-h-40 overflow-y-auto bg-gray-50">
                      {allergens.map((a) => (
                        <label key={a.code} className="flex items-center gap-2 py-1 hover:bg-white px-2 rounded cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.allergenCodes.includes(a.code)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({ ...formData, allergenCodes: [...formData.allergenCodes, a.code] });
                              } else {
                                setFormData({ ...formData, allergenCodes: formData.allergenCodes.filter((c) => c !== a.code) });
                              }
                            }}
                            className="w-4 h-4 text-teal-600 rounded"
                          />
                          <span className="text-sm">{a.translations?.[0]?.name || a.code}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Dietary Flags 🏷️</label>
                    <div className="border border-gray-300 rounded-lg p-3 max-h-40 overflow-y-auto bg-gray-50">
                      {dietaryFlags.map((d) => (
                        <label key={d.code} className="flex items-center gap-2 py-1 hover:bg-white px-2 rounded cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.dietaryFlagCodes.includes(d.code)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({ ...formData, dietaryFlagCodes: [...formData.dietaryFlagCodes, d.code] });
                              } else {
                                setFormData({ ...formData, dietaryFlagCodes: formData.dietaryFlagCodes.filter((c) => c !== d.code) });
                              }
                            }}
                            className="w-4 h-4 text-teal-600 rounded"
                          />
                          <span className="text-sm">{d.translations?.[0]?.name || d.code}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Visibility Toggle */}
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isVisible}
                      onChange={(e) => setFormData({ ...formData, isVisible: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                  </label>
                  <div>
                    <span className="text-sm font-medium text-gray-700">Visible on Menu</span>
                    <p className="text-xs text-gray-500">Hidden items won&apos;t appear to customers</p>
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex gap-3 pt-4 border-t">
                  <button type="button" onClick={resetForm} className="flex-1 px-4 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors">
                    Cancel
                  </button>
                  <button type="submit" className="flex-1 px-4 py-2.5 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors">
                    {editingId ? 'Save Changes' : 'Create Item'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Confirmation Modal */}
        <ConfirmModal
          isOpen={confirmModal.isOpen}
          title={confirmModal.title}
          message={confirmModal.message}
          confirmText={confirmModal.confirmText}
          cancelText={confirmModal.cancelText}
          confirmColor={confirmModal.confirmColor}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
          icon={confirmModal.icon}
        />

        {/* Items List/Grid */}
        {filteredItems.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl shadow-sm border">
            <div className="text-gray-400 mb-4"><Icons.Food /></div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No items found</h3>
            <p className="text-gray-500 mb-6">Create your first menu item to get started</p>
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
            >
              <Icons.Plus />
              Create First Item
            </button>
          </div>
        ) : viewMode === 'list' ? (
          <div className="space-y-3">
            {filteredItems.map((item) => {
              const trans = (item.translations || [])[0];
              const price = item.priceBase ? (parseInt(item.priceBase.amountMinor) / 100).toFixed(2) : null;

              return (
                <div key={item.id} className={`bg-white rounded-xl shadow-sm border overflow-hidden hover:shadow-md transition-shadow ${!item.isVisible ? 'opacity-70' : ''}`}>
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900 truncate">{trans?.name || 'Untitled'}</h3>
                          {price && (
                            <span className="font-bold text-teal-600 whitespace-nowrap">
                              {item.priceBase?.currency === 'EUR' ? '€' : item.priceBase?.currency === 'GBP' ? '£' : '$'}{price}
                            </span>
                          )}
                          <button
                            onClick={() => handleToggleVisible(item)}
                            className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full transition-colors ${
                              item.isVisible ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            {item.isVisible ? <><Icons.Eye /> Visible</> : <><Icons.EyeOff /> Hidden</>}
                          </button>
                        </div>
                        
                        {trans?.description && (
                          <p className="text-sm text-gray-500 mb-2 line-clamp-2">{trans.description}</p>
                        )}

                        <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                          <span className="bg-gray-100 px-2 py-1 rounded">{getSectionLabel(item.section)}</span>
                          {item.sku && <span className="bg-gray-100 px-2 py-1 rounded">SKU: {item.sku}</span>}
                          {item.calories && <span className="bg-gray-100 px-2 py-1 rounded">{item.calories} cal</span>}
                        </div>

                        {/* Tags */}
                        <div className="flex flex-wrap gap-1.5">
                          {(item.dietaryFlags || []).map((d) => (
                            <span key={d.dietaryFlagCode} className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                              {d.dietaryFlag?.translations?.[0]?.name || d.dietaryFlagCode}
                            </span>
                          ))}
                          {(item.allergens || []).length > 0 && (
                            <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-full font-medium">
                              ⚠️ {item.allergens.length} allergen{item.allergens.length > 1 ? 's' : ''}
                            </span>
                          )}
                          {item.spicinessLevel && item.spicinessLevel > 0 && (
                            <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full font-medium">
                              {'🌶️'.repeat(item.spicinessLevel)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleEdit(item)}
                          className="flex items-center gap-1.5 px-3 py-2 text-sm text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors font-medium"
                        >
                          <Icons.Edit />
                          <span className="hidden sm:inline">Edit</span>
                        </button>
                        <button
                          onClick={() => handleDeleteConfirm(item)}
                          className="flex items-center gap-1.5 px-3 py-2 text-sm text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors font-medium"
                        >
                          <Icons.Trash />
                          <span className="hidden sm:inline">Delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Grid View */
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems.map((item) => {
              const trans = (item.translations || [])[0];
              const price = item.priceBase ? (parseInt(item.priceBase.amountMinor) / 100).toFixed(2) : null;

              return (
                <div key={item.id} className={`bg-white rounded-xl shadow-sm border p-5 hover:shadow-md transition-shadow ${!item.isVisible ? 'opacity-70' : ''}`}>
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">{trans?.name || 'Untitled'}</h3>
                      {item.sku && <span className="text-xs text-gray-500">SKU: {item.sku}</span>}
                    </div>
                    {price && (
                      <span className="font-bold text-teal-600 ml-2">
                        {item.priceBase?.currency === 'EUR' ? '€' : item.priceBase?.currency === 'GBP' ? '£' : '$'}{price}
                      </span>
                    )}
                  </div>

                  {trans?.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{trans.description}</p>
                  )}

                  <div className="text-xs text-gray-500 mb-3">{getSectionLabel(item.section)}</div>

                  <div className="flex flex-wrap gap-1 mb-4">
                    {(item.dietaryFlags || []).map((d) => (
                      <span key={d.dietaryFlagCode} className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                        {d.dietaryFlag?.translations?.[0]?.name || d.dietaryFlagCode}
                      </span>
                    ))}
                    {(item.allergens || []).length > 0 && (
                      <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-full">
                        ⚠️ {item.allergens.length}
                      </span>
                    )}
                    {item.spicinessLevel && item.spicinessLevel > 0 && (
                      <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">
                        {'🌶️'.repeat(item.spicinessLevel)}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t">
                    <button
                      onClick={() => handleToggleVisible(item)}
                      className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full transition-colors ${
                        item.isVisible ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {item.isVisible ? <><Icons.Eye /> Visible</> : <><Icons.EyeOff /> Hidden</>}
                    </button>
                    <div className="flex gap-2">
                      <button onClick={() => handleEdit(item)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                        <Icons.Edit />
                      </button>
                      <button onClick={() => handleDeleteConfirm(item)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                        <Icons.Trash />
                      </button>
                    </div>
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
