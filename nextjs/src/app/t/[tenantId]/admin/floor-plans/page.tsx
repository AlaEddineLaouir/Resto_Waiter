'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface Location {
  id: string;
  name: string;
  slug: string;
}

interface FloorLayout {
  id: string;
  name: string;
  description: string | null;
  floor: number;
  status: string;
  version: number;
  canvasWidth: number;
  canvasHeight: number;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  location: { id: string; name: string; slug: string };
  _count: { tables: number; zones: number; obstacles: number };
}

export default function FloorPlansPage() {
  const params = useParams();
  const router = useRouter();
  const tenantId = params.tenantId as string;

  const [layouts, setLayouts] = useState<FloorLayout[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterLocation, setFilterLocation] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newLayout, setNewLayout] = useState({ locationId: '', name: '', description: '', floor: 0 });

  const fetchLayouts = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterLocation) params.set('locationId', filterLocation);
      if (filterStatus) params.set('status', filterStatus);
      const res = await fetch(`/api/admin/floor-layouts?${params}`);
      if (res.ok) {
        const data = await res.json();
        setLayouts(data.layouts);
      }
    } catch (error) {
      console.error('Failed to fetch layouts:', error);
    } finally {
      setLoading(false);
    }
  }, [filterLocation, filterStatus]);

  const fetchLocations = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/locations');
      if (res.ok) {
        const data = await res.json();
        setLocations(data.locations);
      }
    } catch (error) {
      console.error('Failed to fetch locations:', error);
    }
  }, []);

  useEffect(() => { fetchLocations(); }, [fetchLocations]);
  useEffect(() => { fetchLayouts(); }, [fetchLayouts]);

  const handleCreate = async () => {
    if (!newLayout.locationId || !newLayout.name) return;
    setCreating(true);
    try {
      const res = await fetch('/api/admin/floor-layouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLayout),
      });
      if (res.ok) {
        const data = await res.json();
        setShowCreateModal(false);
        setNewLayout({ locationId: '', name: '', description: '', floor: 0 });
        router.push(`/t/${tenantId}/admin/floor-plans/${data.layout.id}`);
      }
    } catch (error) {
      console.error('Failed to create layout:', error);
    } finally {
      setCreating(false);
    }
  };

  const handlePublish = async (id: string) => {
    if (!confirm('Publish this layout? This will archive any other published layout for the same location and floor.')) return;
    try {
      const res = await fetch(`/api/admin/floor-layouts/${id}/publish`, { method: 'POST' });
      if (res.ok) fetchLayouts();
    } catch (error) {
      console.error('Failed to publish:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this layout?')) return;
    try {
      const res = await fetch(`/api/admin/floor-layouts/${id}`, { method: 'DELETE' });
      if (res.ok) fetchLayouts();
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

  const statusColors: Record<string, string> = {
    draft: 'bg-yellow-100 text-yellow-800',
    published: 'bg-green-100 text-green-800',
    archived: 'bg-gray-100 text-gray-600',
  };

  const floorLabel = (floor: number) => {
    if (floor === 0) return 'Ground Floor';
    if (floor === -1) return 'Basement';
    if (floor < 0) return `B${Math.abs(floor)}`;
    return `Floor ${floor}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Floor Plans</h1>
          <p className="mt-1 text-sm text-gray-500">
            Design and manage your restaurant floor layouts
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Layout
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <select
          value={filterLocation}
          onChange={(e) => setFilterLocation(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
        >
          <option value="">All Locations</option>
          {locations.map((loc) => (
            <option key={loc.id} value={loc.id}>{loc.name}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
        >
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {/* Layout Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
              <div className="h-5 bg-gray-200 rounded w-3/4 mb-3" />
              <div className="h-4 bg-gray-100 rounded w-1/2 mb-4" />
              <div className="h-32 bg-gray-50 rounded" />
            </div>
          ))}
        </div>
      ) : layouts.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">No floor plans yet</h3>
          <p className="text-sm text-gray-500 mb-4">Create your first floor plan to start designing your restaurant layout.</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Floor Plan
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {layouts.map((layout) => (
            <div
              key={layout.id}
              className="bg-white rounded-xl border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer group"
              onClick={() => router.push(`/t/${tenantId}/admin/floor-plans/${layout.id}`)}
            >
              {/* Preview area */}
              <div className="h-36 bg-gradient-to-br from-gray-50 to-indigo-50 rounded-t-xl flex items-center justify-center border-b border-gray-100 relative overflow-hidden">
                <div className="text-center">
                  <div className="flex items-center gap-3 text-gray-400">
                    <div className="w-8 h-8 bg-indigo-200/50 rounded" />
                    <div className="w-6 h-6 bg-indigo-200/50 rounded-full" />
                    <div className="w-10 h-6 bg-indigo-200/50 rounded" />
                  </div>
                  <p className="text-xs text-gray-400 mt-2">{layout._count.tables} tables · {layout._count.zones} zones</p>
                </div>
                {/* Status badge */}
                <span className={`absolute top-3 right-3 px-2 py-0.5 text-xs font-medium rounded-full ${statusColors[layout.status] || 'bg-gray-100'}`}>
                  {layout.status}
                </span>
              </div>

              {/* Info */}
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                  {layout.name}
                </h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  {layout.location.name} · {floorLabel(layout.floor)} · v{layout.version}
                </p>
                {layout.description && (
                  <p className="text-xs text-gray-400 mt-1 line-clamp-1">{layout.description}</p>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/t/${tenantId}/admin/floor-plans/${layout.id}`);
                    }}
                    className="flex-1 text-center py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                  >
                    Edit
                  </button>
                  {layout.status === 'draft' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePublish(layout.id);
                      }}
                      className="flex-1 text-center py-1.5 text-xs font-medium text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                    >
                      Publish
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(layout.id);
                    }}
                    className="py-1.5 px-2.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">New Floor Plan</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location *</label>
                <select
                  value={newLayout.locationId}
                  onChange={(e) => setNewLayout({ ...newLayout, locationId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="">Select location...</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Layout Name *</label>
                <input
                  type="text"
                  value={newLayout.name}
                  onChange={(e) => setNewLayout({ ...newLayout, name: e.target.value })}
                  placeholder="e.g., Lunch Layout, Weekend Setup"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={newLayout.description}
                  onChange={(e) => setNewLayout({ ...newLayout, description: e.target.value })}
                  placeholder="Optional description..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Floor</label>
                <select
                  value={newLayout.floor}
                  onChange={(e) => setNewLayout({ ...newLayout, floor: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value={-2}>Basement 2</option>
                  <option value={-1}>Basement</option>
                  <option value={0}>Ground Floor</option>
                  <option value={1}>1st Floor</option>
                  <option value={2}>2nd Floor</option>
                  <option value={3}>3rd Floor</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !newLayout.locationId || !newLayout.name}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? 'Creating...' : 'Create & Open Editor'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
