'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { usePermissions, RequirePermission, Can } from '@/lib/permissions';

interface Brand {
  id: string;
  name: string;
}

interface Location {
  id: string;
  name: string;
  brandId: string;
  brand: Brand;
}

interface Translation {
  locale: string;
  name: string;
  description?: string;
}

interface Menu {
  id: string;
  code: string;
  status: 'draft' | 'published' | 'archived';
  isActive: boolean;
  brand: Brand;
  translations: Translation[];
  _count?: {
    menuSections?: number;
    publications?: number;
    lines?: number;
  };
}

type StatusFilter = 'all' | 'draft' | 'published' | 'archived';

export default function MenusPage() {
  const router = useRouter();
  const params = useParams();
  const tenantId = params.tenantId as string;

  const [menus, setMenus] = useState<Menu[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState<string>('');
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedMenuIds, setSelectedMenuIds] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [formData, setFormData] = useState({
    brandId: '',
    code: '',
    nameEn: '',
    nameFr: '',
    descriptionEn: '',
    descriptionFr: '',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [menusRes, brandsRes, locationsRes] = await Promise.all([
        fetch('/api/admin/menus'),
        fetch('/api/admin/brands'),
        fetch('/api/admin/locations'),
      ]);

      if (menusRes.status === 401) {
        router.push(`/t/${tenantId}/admin/login`);
        return;
      }

      const menusData = await menusRes.json();
      const brandsData = await brandsRes.json();
      const locationsData = await locationsRes.json();

      setMenus(menusData.menus || []);
      setBrands(brandsData.brands || []);
      setLocations(locationsData.locations || []);
    } catch {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const translations = [
      { locale: 'en-US', name: formData.nameEn, description: formData.descriptionEn },
      { locale: 'fr-FR', name: formData.nameFr || formData.nameEn, description: formData.descriptionFr },
    ].filter(t => t.name);

    try {
      const url = editingId ? `/api/admin/menus/${editingId}` : '/api/admin/menus';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandId: formData.brandId,
          code: formData.code,
          translations,
        }),
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
      brandId: '',
      code: '',
      nameEn: '',
      nameFr: '',
      descriptionEn: '',
      descriptionFr: '',
    });
  };

  const handleEdit = (menu: Menu) => {
    const enTrans = menu.translations.find(t => t.locale === 'en-US');
    const frTrans = menu.translations.find(t => t.locale === 'fr-FR');

    setFormData({
      brandId: menu.brand.id,
      code: menu.code,
      nameEn: enTrans?.name || '',
      nameFr: frTrans?.name || '',
      descriptionEn: enTrans?.description || '',
      descriptionFr: frTrans?.description || '',
    });
    setEditingId(menu.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure? This will delete this menu and its sections.')) return;

    try {
      const res = await fetch(`/api/admin/menus/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      fetchData();
    } catch {
      setError('Failed to delete menu');
    }
  };

  const getMenuName = (menu: Menu) => {
    const enTrans = menu.translations.find(t => t.locale === 'en-US');
    return enTrans?.name || menu.code;
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: 'bg-yellow-100 text-yellow-800',
      published: 'bg-green-100 text-green-800',
      archived: 'bg-gray-100 text-gray-600',
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
  };

  const handleRowClick = (menuId: string) => {
    router.push(`/t/${tenantId}/admin/menus/${menuId}`);
  };

  const toggleSelectMenu = (menuId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedMenuIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(menuId)) {
        newSet.delete(menuId);
      } else {
        newSet.add(menuId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedMenuIds.size === filteredMenus.length) {
      setSelectedMenuIds(new Set());
    } else {
      setSelectedMenuIds(new Set(filteredMenus.map(m => m.id)));
    }
  };

  const handleBulkStatusChange = async (newStatus: 'published' | 'draft' | 'archived') => {
    if (selectedMenuIds.size === 0) return;
    
    const action = newStatus === 'published' ? 'publish' : newStatus === 'archived' ? 'archive' : 'unpublish';
    if (!confirm(`Are you sure you want to ${action} ${selectedMenuIds.size} menu(s)?`)) return;
    
    setBulkActionLoading(true);
    try {
      const promises = Array.from(selectedMenuIds).map(id =>
        fetch(`/api/admin/menus/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        })
      );
      
      await Promise.all(promises);
      setSelectedMenuIds(new Set());
      fetchData();
    } catch {
      setError(`Failed to ${action} menus`);
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Filter menus by brand, status, and location
  const filteredMenus = menus.filter(menu => {
    // Brand filter
    if (selectedBrandId && menu.brand.id !== selectedBrandId) return false;
    
    // Status filter
    if (statusFilter !== 'all' && menu.status !== statusFilter) return false;
    
    // Location filter - filter by brand of the selected location
    if (selectedLocationId) {
      const selectedLocation = locations.find(l => l.id === selectedLocationId);
      if (selectedLocation && menu.brand.id !== selectedLocation.brandId) return false;
    }
    
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <RequirePermission entity="menus" action="read">
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-4">
              <Link href={`/t/${tenantId}/admin`} className="text-gray-500 hover:text-gray-700">
                ← Back
              </Link>
              <h1 className="text-xl font-bold text-gray-900">Menus</h1>
            </div>
            <Can entity="menus" action="create">
            <button
              onClick={() => { setShowForm(true); setEditingId(null); resetForm(); }}
              className="bg-orange-500 text-white px-4 py-2 rounded-md hover:bg-orange-600"
            >
              + Add Menu
            </button>
            </Can>
          </div>
          
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Brand:</label>
              <select
                value={selectedBrandId}
                onChange={(e) => setSelectedBrandId(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
              >
                <option value="">All brands</option>
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Status:</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
              >
                <option value="all">All statuses</option>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Location:</label>
              <select
                value={selectedLocationId}
                onChange={(e) => setSelectedLocationId(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
              >
                <option value="">All locations</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name} ({loc.brand.name})
                  </option>
                ))}
              </select>
            </div>

            {(selectedBrandId || statusFilter !== 'all' || selectedLocationId) && (
              <button
                onClick={() => {
                  setSelectedBrandId('');
                  setStatusFilter('all');
                  setSelectedLocationId('');
                }}
                className="text-sm text-gray-500 hover:text-gray-700 underline"
              >
                Clear filters
              </button>
            )}
          </div>

          {/* Bulk Actions Bar */}
          {selectedMenuIds.size > 0 && (
            <div className="mt-4 flex items-center gap-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <span className="text-sm font-medium text-blue-800">
                {selectedMenuIds.size} menu(s) selected
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => handleBulkStatusChange('published')}
                  disabled={bulkActionLoading}
                  className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                >
                  Publish
                </button>
                <button
                  onClick={() => handleBulkStatusChange('draft')}
                  disabled={bulkActionLoading}
                  className="px-3 py-1 text-sm bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:opacity-50"
                >
                  Unpublish
                </button>
                <button
                  onClick={() => handleBulkStatusChange('archived')}
                  disabled={bulkActionLoading}
                  className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50"
                >
                  Archive
                </button>
              </div>
              <button
                onClick={() => setSelectedMenuIds(new Set())}
                className="ml-auto text-sm text-blue-600 hover:text-blue-800"
              >
                Clear selection
              </button>
            </div>
          )}
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
            <h2 className="text-lg font-semibold mb-4">{editingId ? 'Edit Menu' : 'Add Menu'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
                  <select
                    value={formData.brandId}
                    onChange={(e) => setFormData({ ...formData, brandId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  >
                    <option value="">Select brand...</option>
                    {brands.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="LUNCH, DINNER, DRINKS..."
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name (English)</label>
                  <input
                    type="text"
                    value={formData.nameEn}
                    onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name (French)</label>
                  <input
                    type="text"
                    value={formData.nameFr}
                    onChange={(e) => setFormData({ ...formData, nameFr: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description (English)</label>
                  <textarea
                    value={formData.descriptionEn}
                    onChange={(e) => setFormData({ ...formData, descriptionEn: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    rows={2}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description (French)</label>
                  <textarea
                    value={formData.descriptionFr}
                    onChange={(e) => setFormData({ ...formData, descriptionFr: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    rows={2}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="bg-orange-500 text-white px-4 py-2 rounded-md hover:bg-orange-600">
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

        <div className="bg-white rounded-lg shadow overflow-hidden">
          {filteredMenus.length === 0 ? (
            <p className="p-6 text-gray-500 text-center">
              {(selectedBrandId || statusFilter !== 'all' || selectedLocationId) 
                ? 'No menus match your filters.' 
                : 'No menus yet. Add one to get started!'}
            </p>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={selectedMenuIds.size === filteredMenus.length && filteredMenus.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Brand</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sections</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredMenus.map((menu) => (
                  <tr 
                    key={menu.id} 
                    onClick={() => handleRowClick(menu.id)}
                    className={`hover:bg-gray-50 cursor-pointer transition-colors ${selectedMenuIds.has(menu.id) ? 'bg-blue-50' : ''}`}
                  >
                    <td className="px-3 py-4">
                      <input
                        type="checkbox"
                        checked={selectedMenuIds.has(menu.id)}
                        onChange={() => {}}
                        onClick={(e) => toggleSelectMenu(menu.id, e)}
                        className="rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                      />
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900">{getMenuName(menu)}</td>
                    <td className="px-6 py-4 text-gray-500 font-mono text-sm">{menu.code}</td>
                    <td className="px-6 py-4 text-gray-600">{menu.brand.name}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getStatusBadge(menu.status)}`}>
                        {menu.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {(menu._count?.menuSections ?? 0) + (menu._count?.lines ?? 0)} sections
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Can entity="menus" action="update">
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleEdit(menu); }} 
                        className="text-blue-500 hover:text-blue-700 mr-3"
                      >
                        Edit
                      </button>
                      </Can>
                      <Can entity="menus" action="delete">
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDelete(menu.id); }} 
                        className="text-red-500 hover:text-red-700"
                      >
                        Delete
                      </button>
                      </Can>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        
        <div className="mt-4 text-sm text-gray-500 text-center">
          Showing {filteredMenus.length} of {menus.length} menus
        </div>
      </div>
    </div>
    </RequirePermission>
  );
}
