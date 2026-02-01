'use client';

import { useState } from 'react';
import Link from 'next/link';

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

interface LocationMenuTreeProps {
  tree: BrandNode[];
  tenantId: string;
  onActivateMenu?: (locationId: string, menuId: string) => Promise<void>;
  onDeactivateMenu?: (publicationId: string) => Promise<void>;
  onBulkActivate?: (locationId: string, menuIds: string[]) => Promise<void>;
  onBulkDeactivate?: (publicationIds: string[]) => Promise<void>;
}

// Icons
const Icons = {
  building: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
    </svg>
  ),
  location: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
    </svg>
  ),
  menu: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
    </svg>
  ),
  chevronDown: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
    </svg>
  ),
  chevronRight: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
  ),
  check: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  ),
  edit: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
    </svg>
  ),
  power: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.636 5.636a9 9 0 1012.728 0M12 3v9" />
    </svg>
  ),
};

export default function LocationMenuTree({
  tree,
  tenantId,
  onActivateMenu,
  onDeactivateMenu,
  onBulkActivate,
  onBulkDeactivate,
}: LocationMenuTreeProps) {
  const [expandedBrands, setExpandedBrands] = useState<Set<string>>(new Set(tree.map((b) => b.id)));
  const [expandedLocations, setExpandedLocations] = useState<Set<string>>(new Set());
  const [activatingMenu, setActivatingMenu] = useState<string | null>(null);
  const [selectedMenus, setSelectedMenus] = useState<Map<string, Set<string>>>(new Map()); // locationId -> Set of menuIds
  const [bulkLoading, setBulkLoading] = useState(false);

  const toggleBrand = (brandId: string) => {
    setExpandedBrands((prev) => {
      const next = new Set(prev);
      if (next.has(brandId)) {
        next.delete(brandId);
      } else {
        next.add(brandId);
      }
      return next;
    });
  };

  const toggleLocation = (locationId: string) => {
    setExpandedLocations((prev) => {
      const next = new Set(prev);
      if (next.has(locationId)) {
        next.delete(locationId);
      } else {
        next.add(locationId);
      }
      return next;
    });
  };

  const handleActivate = async (locationId: string, menu: MenuNode) => {
    if (!onActivateMenu || menu.status !== 'published') return;
    
    setActivatingMenu(`${locationId}-${menu.id}`);
    try {
      await onActivateMenu(locationId, menu.id);
    } finally {
      setActivatingMenu(null);
    }
  };

  const handleDeactivate = async (menu: MenuNode) => {
    if (!onDeactivateMenu || !menu.publicationId) return;
    
    setActivatingMenu(menu.id);
    try {
      await onDeactivateMenu(menu.publicationId);
    } finally {
      setActivatingMenu(null);
    }
  };

  // Selection helpers for bulk activation
  const toggleMenuSelection = (locationId: string, menuId: string) => {
    setSelectedMenus((prev) => {
      const next = new Map(prev);
      const locationSet = next.get(locationId) || new Set();
      if (locationSet.has(menuId)) {
        locationSet.delete(menuId);
      } else {
        locationSet.add(menuId);
      }
      next.set(locationId, locationSet);
      return next;
    });
  };

  const isMenuSelected = (locationId: string, menuId: string): boolean => {
    return selectedMenus.get(locationId)?.has(menuId) || false;
  };

  const getSelectedCount = (locationId: string): number => {
    return selectedMenus.get(locationId)?.size || 0;
  };

  const selectAllPublished = (location: LocationNode) => {
    setSelectedMenus((prev) => {
      const next = new Map(prev);
      const publishedMenus = location.menus.filter(m => m.status === 'published' && !m.isActive);
      next.set(location.id, new Set(publishedMenus.map(m => m.id)));
      return next;
    });
  };

  const clearSelection = (locationId: string) => {
    setSelectedMenus((prev) => {
      const next = new Map(prev);
      next.delete(locationId);
      return next;
    });
  };

  const handleBulkActivate = async (locationId: string) => {
    const menuIds = Array.from(selectedMenus.get(locationId) || []);
    if (menuIds.length === 0) return;
    
    setBulkLoading(true);
    try {
      if (onBulkActivate) {
        await onBulkActivate(locationId, menuIds);
      } else if (onActivateMenu) {
        // Fallback to individual activation
        for (const menuId of menuIds) {
          await onActivateMenu(locationId, menuId);
        }
      }
      clearSelection(locationId);
    } finally {
      setBulkLoading(false);
    }
  };

  if (tree.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-[#F9FAFB] rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-[#9CA3AF]">{Icons.building}</span>
        </div>
        <h3 className="text-sm font-medium text-[#111827]">No brands or locations</h3>
        <p className="text-sm text-[#6B7280] mt-1">Create a brand first, then add locations.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {tree.map((brand) => (
        <div key={brand.id} className="bg-white rounded-lg border border-[#E5E7EB] overflow-hidden">
          {/* Brand Header */}
          <button
            onClick={() => toggleBrand(brand.id)}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#F9FAFB] transition-colors"
          >
            <span className="text-[#9CA3AF] transition-transform duration-200" style={{
              transform: expandedBrands.has(brand.id) ? 'rotate(0deg)' : 'rotate(-90deg)',
            }}>
              {Icons.chevronDown}
            </span>
            <span className="text-indigo-600">{Icons.building}</span>
            <span className="font-medium text-[#111827]">{brand.name}</span>
            <span className="text-xs text-[#6B7280] bg-[#F3F4F6] px-2 py-0.5 rounded-full">
              {brand.locations.length} location{brand.locations.length !== 1 ? 's' : ''}
            </span>
          </button>

          {/* Locations */}
          {expandedBrands.has(brand.id) && (
            <div className="border-t border-[#E5E7EB]">
              {brand.locations.length === 0 ? (
                <div className="px-4 py-3 pl-12 text-sm text-[#6B7280]">
                  No locations yet. Add a location to get started.
                </div>
              ) : (
                brand.locations.map((location) => (
                  <div key={location.id} className="border-b border-[#E5E7EB] last:border-b-0">
                    {/* Location Header */}
                    <button
                      onClick={() => toggleLocation(location.id)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 pl-10 hover:bg-[#F9FAFB] transition-colors"
                    >
                      <span className="text-[#9CA3AF] transition-transform duration-200" style={{
                        transform: expandedLocations.has(location.id) ? 'rotate(0deg)' : 'rotate(-90deg)',
                      }}>
                        {Icons.chevronDown}
                      </span>
                      <span className="text-emerald-600">{Icons.location}</span>
                      <span className="font-medium text-[#111827]">{location.name}</span>
                      {location.city && (
                        <span className="text-sm text-[#6B7280]">({location.city})</span>
                      )}
                      {!location.isActive && (
                        <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                          Inactive
                        </span>
                      )}
                      <span className="text-xs text-[#6B7280] bg-[#F3F4F6] px-2 py-0.5 rounded-full ml-auto">
                        {location.menus.filter((m) => m.isActive).length} / {location.menus.length} active
                      </span>
                    </button>

                    {/* Bulk Action Bar */}
                    {getSelectedCount(location.id) > 0 && (
                      <div className="flex items-center gap-3 px-4 py-2 pl-20 bg-indigo-50 border-t border-indigo-100">
                        <span className="text-sm font-medium text-indigo-700">
                          {getSelectedCount(location.id)} menu(s) selected
                        </span>
                        <button
                          onClick={() => handleBulkActivate(location.id)}
                          disabled={bulkLoading}
                          className="px-3 py-1 text-xs font-medium bg-emerald-500 text-white rounded hover:bg-emerald-600 disabled:opacity-50"
                        >
                          Activate All
                        </button>
                        <button
                          onClick={() => clearSelection(location.id)}
                          className="px-3 py-1 text-xs font-medium text-indigo-600 hover:text-indigo-800"
                        >
                          Clear
                        </button>
                      </div>
                    )}

                    {/* Menus */}
                    {expandedLocations.has(location.id) && (
                      <div className="bg-[#FAFAFA]">
                        {location.menus.length === 0 ? (
                          <div className="px-4 py-3 pl-20 text-sm text-[#6B7280]">
                            No menus available. Create a menu for this brand first.
                          </div>
                        ) : (
                          location.menus.map((menu) => (
                            <div
                              key={menu.id}
                              className={`flex items-center gap-3 px-4 py-2.5 pl-20 hover:bg-[#F3F4F6] transition-colors group ${
                                isMenuSelected(location.id, menu.id) ? 'bg-indigo-50' : ''
                              }`}
                            >
                              {/* Checkbox for bulk selection */}
                              {menu.status === 'published' && !menu.isActive && (
                                <input
                                  type="checkbox"
                                  checked={isMenuSelected(location.id, menu.id)}
                                  onChange={() => toggleMenuSelection(location.id, menu.id)}
                                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
                                  title="Select for bulk activation"
                                />
                              )}
                              {/* Spacer for menus that can't be selected */}
                              {(menu.status !== 'published' || menu.isActive) && (
                                <span className="w-4"></span>
                              )}
                              <span className={menu.isActive ? 'text-indigo-600' : 'text-[#9CA3AF]'}>
                                {Icons.menu}
                              </span>
                              <Link
                                href={`/t/${tenantId}/admin/menus/${menu.id}`}
                                className="font-medium text-[#111827] hover:text-indigo-600 transition-colors"
                              >
                                {menu.name}
                              </Link>
                              <span className="text-xs text-[#6B7280]">({menu.code})</span>

                              {/* Active Badge */}
                              {menu.isActive ? (
                                <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                                  {Icons.check}
                                  ACTIVE
                                </span>
                              ) : (
                                <span className="text-xs text-[#9CA3AF]">—</span>
                              )}

                              {/* Status Badge */}
                              <span className="text-xs text-[#6B7280] ml-auto capitalize">
                                {menu.status}
                              </span>

                              {/* Actions */}
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Link
                                  href={`/t/${tenantId}/admin/menus/${menu.id}`}
                                  className="p-1.5 text-[#6B7280] hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                  title="Edit Menu"
                                >
                                  {Icons.edit}
                                </Link>
                                
                                {menu.isActive ? (
                                  <button
                                    onClick={() => handleDeactivate(menu)}
                                    disabled={activatingMenu === menu.id}
                                    className="p-1.5 text-[#6B7280] hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                                    title="Deactivate"
                                  >
                                    {Icons.power}
                                  </button>
                                ) : menu.status === 'published' ? (
                                  <button
                                    onClick={() => handleActivate(location.id, menu)}
                                    disabled={activatingMenu === `${location.id}-${menu.id}`}
                                    className="p-1.5 text-[#6B7280] hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors disabled:opacity-50"
                                    title="Activate"
                                  >
                                    {Icons.power}
                                  </button>
                                ) : (
                                  <span className="text-xs text-amber-600" title="Menu not published">
                                    Publish first
                                  </span>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
