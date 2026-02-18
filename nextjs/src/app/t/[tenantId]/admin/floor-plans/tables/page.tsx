'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface FloorTableItem {
  id: string;
  label: string;
  friendlyName: string | null;
  shape: string;
  capacity: number;
  minCapacity: number;
  category: string;
  status: string;
  isActive: boolean;
  notes: string | null;
  layout: {
    id: string;
    name: string;
    status: string;
    location: { id: string; name: string };
  };
  zone: { id: string; name: string } | null;
  _count: { chairs: number };
  mergedGroupLink: Array<{
    group: { id: string; groupLabel: string; capacity: number };
  }>;
}

const categoryLabels: Record<string, { label: string; color: string; icon: string }> = {
  dine_in: { label: 'Dine In', color: 'bg-blue-100 text-blue-800', icon: '🍽️' },
  outdoor: { label: 'Outdoor', color: 'bg-green-100 text-green-800', icon: '🌿' },
  vip: { label: 'VIP', color: 'bg-purple-100 text-purple-800', icon: '⭐' },
  bar: { label: 'Bar', color: 'bg-amber-100 text-amber-800', icon: '🍺' },
  staff: { label: 'Staff', color: 'bg-gray-100 text-gray-800', icon: '👤' },
};

const shapeIcons: Record<string, string> = {
  round: '⬤',
  square: '◼',
  rectangle: '▬',
  oval: '⬮',
  polygon: '⬡',
};

export default function FloorTablesPage() {
  const params = useParams();
  const router = useRouter();
  const tenantId = params.tenantId as string;

  const [tables, setTables] = useState<FloorTableItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');

  const fetchTables = useCallback(async () => {
    try {
      const p = new URLSearchParams();
      if (filterCategory) p.set('category', filterCategory);
      if (filterStatus) p.set('status', filterStatus);
      const res = await fetch(`/api/admin/floor-tables?${p}`);
      if (res.ok) {
        const data = await res.json();
        setTables(data.tables);
      }
    } catch (error) {
      console.error('Failed to fetch tables:', error);
    } finally {
      setLoading(false);
    }
  }, [filterCategory, filterStatus]);

  useEffect(() => { fetchTables(); }, [fetchTables]);

  const filtered = tables.filter((t) => {
    if (search) {
      const s = search.toLowerCase();
      return t.label.toLowerCase().includes(s) ||
        (t.friendlyName?.toLowerCase().includes(s)) ||
        t.layout.name.toLowerCase().includes(s) ||
        t.layout.location.name.toLowerCase().includes(s);
    }
    return true;
  });

  const totalCapacity = filtered.reduce((sum, t) => sum + t.capacity, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tables Overview</h1>
          <p className="mt-1 text-sm text-gray-500">
            {filtered.length} tables · {totalCapacity} total capacity
          </p>
        </div>
        <button
          onClick={() => router.push(`/t/${tenantId}/admin/floor-plans`)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6z" />
          </svg>
          Open Designer
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <svg className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tables, layouts, locations..."
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
          />
        </div>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
        >
          <option value="">All Categories</option>
          {Object.entries(categoryLabels).map(([key, { label }]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="disabled">Disabled</option>
          <option value="seasonal">Seasonal</option>
        </select>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {Object.entries(categoryLabels).map(([key, { label, color, icon }]) => {
          const count = tables.filter((t) => t.category === key).length;
          const cap = tables.filter((t) => t.category === key).reduce((s, t) => s + t.capacity, 0);
          return (
            <div key={key} className="bg-white rounded-lg border border-gray-200 p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{icon}</span>
                <span className="text-xs font-medium text-gray-500">{label}</span>
              </div>
              <p className="text-xl font-bold text-gray-900">{count}</p>
              <p className="text-xs text-gray-400">{cap} seats</p>
            </div>
          );
        })}
      </div>

      {/* Table List */}
      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full mx-auto" />
          <p className="text-sm text-gray-500 mt-3">Loading tables...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-lg font-semibold text-gray-900">No tables found</p>
          <p className="text-sm text-gray-500 mt-1">Create a floor plan and add tables to get started.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Table</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Shape</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Capacity</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Category</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Zone</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Layout</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Merged</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((table) => {
                const cat = categoryLabels[table.category] || categoryLabels.dine_in;
                const mergedGroup = table.mergedGroupLink?.[0]?.group;
                return (
                  <tr
                    key={table.id}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => router.push(`/t/${tenantId}/admin/floor-plans/${table.layout.id}`)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">{table.label}</span>
                        {table.friendlyName && (
                          <span className="text-xs text-gray-400">{table.friendlyName}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      <span className="mr-1">{shapeIcons[table.shape] || '◻'}</span>
                      {table.shape}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-900">{table.capacity}</span>
                      <span className="text-xs text-gray-400 ml-1">({table._count.chairs} chairs)</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${cat.color}`}>
                        {cat.icon} {cat.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {table.zone?.name || <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-600">{table.layout.name}</div>
                      <div className="text-xs text-gray-400">{table.layout.location.name}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                        table.status === 'active' ? 'bg-green-100 text-green-800' :
                        table.status === 'disabled' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {table.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {mergedGroup ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-indigo-100 text-indigo-800">
                          🔗 {mergedGroup.groupLabel}
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
