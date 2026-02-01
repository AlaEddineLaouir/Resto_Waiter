'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import LocationMenuTree from '@/components/LocationMenuTree';

interface Brand {
  id: string;
  name: string;
  slug: string;
}

interface MenuNode {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  publicationId: string | null;
  status: string;
  isPublished: boolean;
  sectionCount: number;
  type: 'menu';
}

interface LocationNode {
  id: string;
  name: string;
  city: string | null;
  countryCode: string;
  isActive: boolean;
  type: 'location';
  menus: MenuNode[];
}

interface BrandNode {
  id: string;
  name: string;
  slug: string;
  type: 'brand';
  locations: LocationNode[];
}

// Icons
const Icons = {
  plus: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  ),
  x: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
};

export default function LocationsPage() {
  const router = useRouter();
  const params = useParams();
  const tenantId = params.tenantId as string;

  const [tree, setTree] = useState<BrandNode[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    brandId: '',
    name: '',
    addressLine1: '',
    city: '',
    postalCode: '',
    countryCode: 'NL',
    serviceDineIn: true,
    serviceTakeaway: true,
    serviceDelivery: false,
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [treeRes, brandsRes] = await Promise.all([
        fetch('/api/admin/locations/tree'),
        fetch('/api/admin/brands'),
      ]);

      if (treeRes.status === 401) {
        router.push(`/t/${tenantId}/admin/login`);
        return;
      }

      const treeData = await treeRes.json();
      const brandsData = await brandsRes.json();

      setTree(treeData.tree || []);
      setBrands(brandsData.brands || []);
    } catch {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const url = editingId ? `/api/admin/locations/${editingId}` : '/api/admin/locations';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save');
      }

      setShowForm(false);
      setEditingId(null);
      resetForm();
      setSuccess(editingId ? 'Location updated!' : 'Location created!');
      setTimeout(() => setSuccess(''), 3000);
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    }
  };

  const resetForm = () => {
    setFormData({
      brandId: '',
      name: '',
      addressLine1: '',
      city: '',
      postalCode: '',
      countryCode: 'NL',
      serviceDineIn: true,
      serviceTakeaway: true,
      serviceDelivery: false,
    });
  };

  const handleActivateMenu = async (locationId: string, menuId: string) => {
    try {
      const res = await fetch('/api/admin/publications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locationId, menuId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to activate menu');
      }

      setSuccess('Menu activated!');
      setTimeout(() => setSuccess(''), 3000);
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to activate menu');
    }
  };

  const handleDeactivateMenu = async (publicationId: string) => {
    try {
      const res = await fetch(`/api/admin/publications/${publicationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isCurrent: false }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to deactivate menu');
      }

      setSuccess('Menu deactivated!');
      setTimeout(() => setSuccess(''), 3000);
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to deactivate menu');
    }
  };

  const handleBulkActivateMenus = async (locationId: string, menuIds: string[]) => {
    try {
      // Activate all menus sequentially
      for (const menuId of menuIds) {
        const res = await fetch('/api/admin/publications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ locationId, menuId }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || `Failed to activate menu ${menuId}`);
        }
      }

      setSuccess(`${menuIds.length} menu(s) activated!`);
      setTimeout(() => setSuccess(''), 3000);
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to activate menus');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-[#111827]">Locations & Menus</h1>
          <p className="text-sm text-[#6B7280] mt-1">
            Manage your locations and activate menus per location
          </p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditingId(null); resetForm(); }}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
        >
          {Icons.plus}
          Add Location
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-center justify-between bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
          {error}
          <button onClick={() => setError('')} className="text-red-400 hover:text-red-600">
            {Icons.x}
          </button>
        </div>
      )}
      
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-600 px-4 py-3 rounded-lg text-sm">
          {success}
        </div>
      )}

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-white p-6 rounded-lg border border-[#E5E7EB]">
          <h2 className="text-base font-semibold text-[#111827] mb-4">
            {editingId ? 'Edit Location' : 'Add New Location'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#111827] mb-1.5">Brand</label>
                <select
                  value={formData.brandId}
                  onChange={(e) => setFormData({ ...formData, brandId: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-[#E5E7EB] rounded-lg text-[#111827] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                >
                  <option value="">Select brand...</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#111827] mb-1.5">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-[#E5E7EB] rounded-lg text-[#111827] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="e.g. Downtown Amsterdam"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#111827] mb-1.5">Address</label>
              <input
                type="text"
                value={formData.addressLine1}
                onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-[#E5E7EB] rounded-lg text-[#111827] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Street address"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#111827] mb-1.5">City</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-[#E5E7EB] rounded-lg text-[#111827] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#111827] mb-1.5">Postal Code</label>
                <input
                  type="text"
                  value={formData.postalCode}
                  onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-[#E5E7EB] rounded-lg text-[#111827] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#111827] mb-1.5">Country</label>
                <input
                  type="text"
                  value={formData.countryCode}
                  onChange={(e) => setFormData({ ...formData, countryCode: e.target.value.toUpperCase() })}
                  className="w-full px-3.5 py-2.5 border border-[#E5E7EB] rounded-lg text-[#111827] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  maxLength={2}
                  placeholder="NL"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#111827] mb-2">Services</label>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 text-sm text-[#111827]">
                  <input
                    type="checkbox"
                    checked={formData.serviceDineIn}
                    onChange={(e) => setFormData({ ...formData, serviceDineIn: e.target.checked })}
                    className="w-4 h-4 rounded border-[#E5E7EB] text-indigo-600 focus:ring-indigo-500"
                  />
                  Dine-in
                </label>
                <label className="flex items-center gap-2 text-sm text-[#111827]">
                  <input
                    type="checkbox"
                    checked={formData.serviceTakeaway}
                    onChange={(e) => setFormData({ ...formData, serviceTakeaway: e.target.checked })}
                    className="w-4 h-4 rounded border-[#E5E7EB] text-indigo-600 focus:ring-indigo-500"
                  />
                  Takeaway
                </label>
                <label className="flex items-center gap-2 text-sm text-[#111827]">
                  <input
                    type="checkbox"
                    checked={formData.serviceDelivery}
                    onChange={(e) => setFormData({ ...formData, serviceDelivery: e.target.checked })}
                    className="w-4 h-4 rounded border-[#E5E7EB] text-indigo-600 focus:ring-indigo-500"
                  />
                  Delivery
                </label>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                className="bg-indigo-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
              >
                {editingId ? 'Update Location' : 'Create Location'}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setEditingId(null); }}
                className="bg-white text-[#6B7280] border border-[#E5E7EB] px-4 py-2.5 rounded-lg font-medium hover:bg-[#F9FAFB] transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tree View */}
      <LocationMenuTree
        tree={tree}
        tenantId={tenantId}
        onActivateMenu={handleActivateMenu}
        onDeactivateMenu={handleDeactivateMenu}
        onBulkActivate={handleBulkActivateMenus}
      />
    </div>
  );
}
