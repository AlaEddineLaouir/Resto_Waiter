'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// ============================================
// TYPES
// ============================================
interface Translation {
  locale: string;
  name?: string;
  title?: string;
  description?: string;
}

interface Allergen {
  allergen: { code: string; translations: { locale: string; name: string }[] };
}

interface DietaryFlag {
  dietaryFlag: { code: string; translations: { locale: string; name: string }[] };
}

interface Ingredient {
  ingredient: { id: string; name: string; isAllergen?: boolean };
  quantity?: string | null;
  unit?: string | null;
  isOptional?: boolean;
}

interface PriceBase {
  currency: string;
  amountMinor: number;
}

interface Section {
  id: string;
  isActive: boolean;
  translations: Translation[];
}

interface Item {
  id: string;
  sectionId: string;
  sku: string | null;
  isVisible: boolean;
  spicinessLevel: number | null;
  calories: number | null;
  translations: Translation[];
  priceBase: PriceBase | null;
  allergens: Allergen[];
  dietaryFlags: DietaryFlag[];
  ingredients: Ingredient[];
}

interface MenuLine {
  id: string;
  lineType: 'section' | 'item';
  displayOrder: number;
  isEnabled: boolean;
  parentLineId: string | null;
  section: Section | null;
  item: Item | null;
  childLines?: MenuLine[];
}

interface Location {
  id: string;
  name: string;
}

interface Publication {
  id: string;
  locationId: string;
  location: Location;
  goesLiveAt: string;
  isCurrent: boolean;
}

interface Brand {
  id: string;
  name: string;
}

interface Menu {
  id: string;
  code: string;
  status: 'draft' | 'published' | 'archived';
  publishedAt: string | null;
  archivedAt: string | null;
  translations: Translation[];
  brand: Brand;
  lines: MenuLine[];
  publications: Publication[];
}

type ViewMode = 'view' | 'edit';

// ============================================
// ICONS
// ============================================
const Icons = {
  chevronDown: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
    </svg>
  ),
  plus: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  ),
  drag: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9h16.5m-16.5 6.75h16.5" />
    </svg>
  ),
  trash: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
  ),
  publish: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
    </svg>
  ),
  arrowLeft: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
    </svg>
  ),
  eye: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  eyeOff: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
    </svg>
  ),
  location: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
    </svg>
  ),
};

// ============================================
// HELPER FUNCTIONS
// ============================================
function getTranslation(translations: Translation[], locale: string = 'en-US'): string {
  const trans = translations.find(t => t.locale === locale);
  return trans?.name || trans?.title || '';
}

function formatPrice(priceBase: PriceBase | null): string {
  if (!priceBase) return '';
  const amount = Number(priceBase.amountMinor) / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: priceBase.currency,
  }).format(amount);
}

function getStatusBadge(status: string): { className: string; label: string } {
  switch (status) {
    case 'published':
      return { className: 'bg-green-100 text-green-800', label: 'Published' };
    case 'archived':
      return { className: 'bg-gray-100 text-gray-600', label: 'Archived' };
    default:
      return { className: 'bg-yellow-100 text-yellow-800', label: 'Draft' };
  }
}

// ============================================
// SORTABLE LINE COMPONENT
// ============================================
function SortableLine({
  line,
  isExpanded,
  onToggleExpand,
  onToggleEnabled,
  onRemove,
  mode,
  children,
}: {
  line: MenuLine;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onToggleEnabled: () => void;
  onRemove: () => void;
  mode: ViewMode;
  children?: React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: line.id, disabled: mode === 'view' });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isSection = line.lineType === 'section';
  const name = isSection
    ? getTranslation(line.section?.translations || [])
    : getTranslation(line.item?.translations || []);
  const price = !isSection ? formatPrice(line.item?.priceBase || null) : null;

  return (
    <div ref={setNodeRef} style={style} className={`${isSection ? '' : 'ml-8'}`}>
      <div
        className={`flex items-center gap-3 p-3 rounded-lg border ${
          isSection
            ? 'bg-gray-50 border-gray-200'
            : 'bg-white border-gray-100 hover:border-gray-200'
        } ${!line.isEnabled ? 'opacity-50' : ''} ${isDragging ? 'shadow-lg' : ''}`}
      >
        {/* Drag Handle */}
        {mode === 'edit' && (
          <button
            {...attributes}
            {...listeners}
            className="p-1 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
          >
            {Icons.drag}
          </button>
        )}

        {/* Expand/Collapse for Sections */}
        {isSection && (
          <button
            onClick={onToggleExpand}
            className="text-gray-400 hover:text-gray-600 transition-transform"
            style={{ transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)' }}
          >
            {Icons.chevronDown}
          </button>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`font-medium ${isSection ? 'text-gray-900' : 'text-gray-700'}`}>
              {name || (isSection ? 'Unnamed Section' : 'Unnamed Item')}
            </span>
            {!line.isEnabled && (
              <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">
                Hidden
              </span>
            )}
          </div>
          {!isSection && line.item?.sku && (
            <span className="text-xs text-gray-400 font-mono">{line.item.sku}</span>
          )}
          {/* Show ingredients for items */}
          {!isSection && line.item?.ingredients && line.item.ingredients.length > 0 && (
            <div className="text-xs text-gray-500 mt-1">
              <span className="font-medium">🥗 </span>
              {line.item.ingredients.map(i => i.ingredient.name).join(', ')}
            </div>
          )}
        </div>

        {/* Price (for items) */}
        {price && <span className="text-gray-600 font-medium">{price}</span>}

        {/* Actions */}
        {mode === 'edit' && (
          <div className="flex items-center gap-3">
            <button
              onClick={onToggleEnabled}
              className={`p-2 rounded-lg transition-colors ${
                line.isEnabled
                  ? 'text-green-600 hover:bg-green-50'
                  : 'text-gray-400 hover:bg-gray-100'
              }`}
              title={line.isEnabled ? 'Hide' : 'Show'}
            >
              {line.isEnabled ? Icons.eye : Icons.eyeOff}
            </button>
            <button
              onClick={onRemove}
              className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
              title="Remove"
            >
              {Icons.trash}
            </button>
          </div>
        )}
      </div>

      {/* Children (items under section) */}
      {isSection && isExpanded && children}
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================
export default function MenuDetailPage() {
  const router = useRouter();
  const params = useParams();
  const tenantId = params.tenantId as string;
  const menuId = params.id as string;

  const [menu, setMenu] = useState<Menu | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [mode, setMode] = useState<ViewMode>('view');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  // Pickers
  const [showAddLine, setShowAddLine] = useState(false);
  const [addLineType, setAddLineType] = useState<'section' | 'item'>('section');
  const [addParentLineId, setAddParentLineId] = useState<string | null>(null);
  const [availableSections, setAvailableSections] = useState<Section[]>([]);
  const [availableItems, setAvailableItems] = useState<Item[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [selectedSections, setSelectedSections] = useState<Set<string>>(new Set());
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [addingMultiple, setAddingMultiple] = useState(false);

  // Location assignment
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [availableLocations, setAvailableLocations] = useState<Location[]>([]);
  const [locationsLoading, setLocationsLoading] = useState(false);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );


  // ============================================
  // DATA FETCHING
  // ============================================
  const fetchMenu = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/menus/${menuId}`);
      if (res.status === 401) {
        router.push(`/t/${tenantId}/admin/login`);
        return;
      }
      if (!res.ok) throw new Error('Failed to load menu');

      const data = await res.json();
      setMenu(data.menu);

      // Expand all sections by default
      const sectionIds = (data.menu.lines || [])
        .filter((l: MenuLine) => l.lineType === 'section')
        .map((l: MenuLine) => l.id);
      setExpandedSections(new Set(sectionIds));
    } catch {
      setError('Failed to load menu');
    } finally {
      setLoading(false);
    }
  }, [menuId, router, tenantId]);

  useEffect(() => {
    fetchMenu();
  }, [fetchMenu]);

  const fetchAvailableSections = async () => {
    setPickerLoading(true);
    try {
      const res = await fetch('/api/admin/sections');
      if (res.ok) {
        const data = await res.json();
        // Filter out sections already in this menu
        const existingIds = new Set(
          (menu?.lines || [])
            .filter(l => l.lineType === 'section')
            .map(l => l.section?.id)
        );
        setAvailableSections((data.sections || []).filter((s: Section) => !existingIds.has(s.id)));
      }
    } catch {
      setError('Failed to load sections');
    } finally {
      setPickerLoading(false);
    }
  };

  const fetchAvailableItems = async (sectionId?: string) => {
    setPickerLoading(true);
    try {
      const url = sectionId ? `/api/admin/items?sectionId=${sectionId}` : '/api/admin/items';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        // Filter out items already in this menu
        const existingIds = new Set(
          (menu?.lines || [])
            .flatMap(l => [
              l.lineType === 'item' ? l.item?.id : null,
              ...(l.childLines?.filter(c => c.lineType === 'item').map(c => c.item?.id) || []),
            ])
            .filter(Boolean)
        );
        setAvailableItems((data.items || []).filter((i: Item) => !existingIds.has(i.id)));
      }
    } catch {
      setError('Failed to load items');
    } finally {
      setPickerLoading(false);
    }
  };

  // ============================================
  // ACTIONS
  // ============================================
  const addLine = async (sectionId?: string, itemId?: string) => {
    if (!menu) return;

    try {
      const res = await fetch(`/api/admin/menus/${menuId}/lines`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lineType: addLineType,
          sectionId: addLineType === 'section' ? sectionId : undefined,
          itemId: addLineType === 'item' ? itemId : undefined,
          parentLineId: addParentLineId,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to add');
      }

      setShowAddLine(false);
      setSuccess(`${addLineType === 'section' ? 'Section' : 'Item'} added!`);
      setTimeout(() => setSuccess(''), 3000);
      fetchMenu();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add');
    }
  };

  const addMultipleLines = async () => {
    if (!menu) return;
    setAddingMultiple(true);

    try {
      const idsToAdd = addLineType === 'section' 
        ? Array.from(selectedSections) 
        : Array.from(selectedItems);
      
      if (idsToAdd.length === 0) {
        setError('Please select at least one item');
        setAddingMultiple(false);
        return;
      }

      let addedCount = 0;
      for (const id of idsToAdd) {
        const res = await fetch(`/api/admin/menus/${menuId}/lines`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lineType: addLineType,
            sectionId: addLineType === 'section' ? id : undefined,
            itemId: addLineType === 'item' ? id : undefined,
            parentLineId: addParentLineId,
          }),
        });

        if (res.ok) {
          addedCount++;
        }
      }

      setShowAddLine(false);
      setSelectedSections(new Set());
      setSelectedItems(new Set());
      setSuccess(`Added ${addedCount} ${addLineType}${addedCount > 1 ? 's' : ''}!`);
      setTimeout(() => setSuccess(''), 3000);
      fetchMenu();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add');
    } finally {
      setAddingMultiple(false);
    }
  };

  const toggleLineEnabled = async (lineId: string) => {
    try {
      const res = await fetch(`/api/admin/menus/${menuId}/lines/${lineId}/toggle`, {
        method: 'PATCH',
      });

      if (!res.ok) throw new Error('Failed to toggle');
      fetchMenu();
    } catch {
      setError('Failed to toggle visibility');
    }
  };

  const removeLine = async (lineId: string, lineName: string) => {
    if (!confirm(`Remove "${lineName}" from this menu?`)) return;

    try {
      const res = await fetch(`/api/admin/menus/${menuId}/lines/${lineId}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to remove');
      setSuccess('Removed!');
      setTimeout(() => setSuccess(''), 3000);
      fetchMenu();
    } catch {
      setError('Failed to remove');
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    if (!menu) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // Flatten all lines for reorder
    const allLines = (menu.lines || []).flatMap(l => [l, ...(l.childLines || [])]);
    const activeIdx = allLines.findIndex(l => l.id === active.id);
    const overIdx = allLines.findIndex(l => l.id === over.id);

    if (activeIdx === -1 || overIdx === -1) return;

    // Build new order
    const newLines = [...allLines];
    const [moved] = newLines.splice(activeIdx, 1);
    newLines.splice(overIdx, 0, moved);

    // Send reorder request
    try {
      const res = await fetch(`/api/admin/menus/${menuId}/lines/reorder`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lines: newLines.map((l, i) => ({
            id: l.id,
            displayOrder: i,
            parentLineId: l.parentLineId,
          })),
        }),
      });

      if (!res.ok) throw new Error('Failed to reorder');
      fetchMenu();
    } catch {
      setError('Failed to reorder');
    }
  };

  const publishMenu = async () => {
    if (!menu) return;
    try {
      const res = await fetch(`/api/admin/menus/${menuId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'published' }),
      });
      if (!res.ok) throw new Error('Failed to publish');
      setSuccess('Menu published!');
      setTimeout(() => setSuccess(''), 3000);
      fetchMenu();
    } catch {
      setError('Failed to publish menu');
    }
  };

  const unpublishMenu = async () => {
    if (!menu) return;
    try {
      const res = await fetch(`/api/admin/menus/${menuId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'draft' }),
      });
      if (!res.ok) throw new Error('Failed to unpublish');
      setSuccess('Menu set to draft!');
      setTimeout(() => setSuccess(''), 3000);
      fetchMenu();
    } catch {
      setError('Failed to unpublish menu');
    }
  };

  // Location assignment functions
  const fetchAvailableLocations = async () => {
    setLocationsLoading(true);
    try {
      const res = await fetch('/api/admin/locations');
      if (res.ok) {
        const data = await res.json();
        // Filter to locations that match menu's brand and aren't already assigned
        const assignedLocationIds = new Set(
          (menu?.publications || []).map(p => p.locationId)
        );
        const filtered = (data.locations || []).filter(
          (loc: Location & { brandId?: string }) => 
            loc.brandId === menu?.brand?.id && !assignedLocationIds.has(loc.id)
        );
        setAvailableLocations(filtered);
      }
    } catch {
      setError('Failed to load locations');
    } finally {
      setLocationsLoading(false);
    }
  };

  const assignLocation = async (locationId: string) => {
    if (!menu) return;
    
    // Only published menus can be assigned to locations
    if (menu.status !== 'published') {
      setError('Menu must be published before assigning to locations');
      return;
    }

    try {
      const res = await fetch('/api/admin/publications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ menuId: menu.id, locationId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to assign');
      }

      setShowLocationPicker(false);
      setSuccess('Location assigned!');
      setTimeout(() => setSuccess(''), 3000);
      fetchMenu();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign location');
    }
  };

  const unassignLocation = async (publicationId: string, locationName: string) => {
    if (!confirm(`Remove menu from "${locationName}"?`)) return;

    try {
      const res = await fetch(`/api/admin/publications/${publicationId}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to unassign');
      setSuccess('Location unassigned!');
      setTimeout(() => setSuccess(''), 3000);
      fetchMenu();
    } catch {
      setError('Failed to unassign location');
    }
  };

  // ============================================
  // RENDER
  // ============================================
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500" />
      </div>
    );
  }

  if (!menu) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Menu not found</p>
      </div>
    );
  }

  const statusBadge = getStatusBadge(menu.status);
  const menuName = getTranslation(menu.translations);
  const lines = menu.lines || [];
  const allLineIds = lines.flatMap(l => [l.id, ...(l.childLines?.map(c => c.id) || [])]);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href={`/t/${tenantId}/admin/menus`}
                className="text-gray-500 hover:text-gray-700"
              >
                {Icons.arrowLeft}
              </Link>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-bold text-gray-900">
                    {menuName || menu.code}
                  </h1>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${statusBadge.className}`}
                  >
                    {statusBadge.label}
                  </span>
                </div>
                <p className="text-sm text-gray-500">
                  {menu.brand.name} • {menu.code}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Mode Toggle */}
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setMode('view')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    mode === 'view'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  👁️ View
                </button>
                <button
                  onClick={() => setMode('edit')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    mode === 'edit'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  ✏️ Edit
                </button>
              </div>

              {/* Publish Actions */}
              {menu.status === 'draft' && (
                <button
                  onClick={publishMenu}
                  className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
                >
                  {Icons.publish}
                  <span>Publish</span>
                </button>
              )}
              {menu.status === 'published' && (
                <button
                  onClick={unpublishMenu}
                  className="flex items-center gap-2 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Unpublish
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Alerts */}
      <div className="max-w-5xl mx-auto px-4 pt-4">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 flex justify-between">
            {error}
            <button onClick={() => setError('')}>×</button>
          </div>
        )}
        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            {success}
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Locations */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
              {Icons.location} Assigned Locations
            </h3>
            {mode === 'edit' && menu.status === 'published' && (
              <button
                onClick={() => {
                  setShowLocationPicker(true);
                  fetchAvailableLocations();
                }}
                className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
              >
                {Icons.plus} Assign Location
              </button>
            )}
          </div>
          {menu.publications && menu.publications.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {menu.publications.map(pub => (
                <span
                  key={pub.id}
                  className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm flex items-center gap-2"
                >
                  {pub.location.name}
                  {mode === 'edit' && (
                    <button
                      onClick={() => unassignLocation(pub.id, pub.location.name)}
                      className="text-blue-400 hover:text-red-500 transition-colors"
                      title="Remove"
                    >
                      ×
                    </button>
                  )}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">
              {menu.status === 'published' 
                ? 'No locations assigned. Click "Assign Location" to add.' 
                : 'Publish the menu first to assign it to locations.'}
            </p>
          )}
        </div>

        {/* Menu Lines */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-4 border-b border-gray-100 flex justify-between items-center">
            <h2 className="font-semibold text-gray-900">Menu Content</h2>
            {mode === 'edit' && (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setAddLineType('section');
                    setAddParentLineId(null);
                    setShowAddLine(true);
                    fetchAvailableSections();
                  }}
                  className="flex items-center gap-1 text-sm text-orange-600 hover:text-orange-700"
                >
                  {Icons.plus} Add Section
                </button>
              </div>
            )}
          </div>

          <div className="p-4">
            {lines.length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                No content yet. Add sections and items to get started.
              </p>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext items={allLineIds} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2">
                    {lines.map(line => (
                      <SortableLine
                        key={line.id}
                        line={line}
                        isExpanded={expandedSections.has(line.id)}
                        onToggleExpand={() => {
                          setExpandedSections(prev => {
                            const next = new Set(prev);
                            if (next.has(line.id)) next.delete(line.id);
                            else next.add(line.id);
                            return next;
                          });
                        }}
                        onToggleEnabled={() => toggleLineEnabled(line.id)}
                        onRemove={() =>
                          removeLine(
                            line.id,
                            getTranslation(line.section?.translations || line.item?.translations || [])
                          )
                        }
                        mode={mode}
                      >
                        {/* Child items */}
                        {line.childLines && line.childLines.length > 0 && (
                          <div className="mt-2 space-y-2">
                            {line.childLines.map(child => (
                              <SortableLine
                                key={child.id}
                                line={child}
                                isExpanded={false}
                                onToggleExpand={() => {}}
                                onToggleEnabled={() => toggleLineEnabled(child.id)}
                                onRemove={() =>
                                  removeLine(
                                    child.id,
                                    getTranslation(child.item?.translations || [])
                                  )
                                }
                                mode={mode}
                              />
                            ))}
                          </div>
                        )}
                        {/* Add item button under section */}
                        {mode === 'edit' && line.lineType === 'section' && (
                          <button
                            onClick={() => {
                              setAddLineType('item');
                              setAddParentLineId(line.id);
                              setShowAddLine(true);
                              fetchAvailableItems(line.section?.id);
                            }}
                            className="mt-2 ml-8 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
                          >
                            {Icons.plus} Add Item
                          </button>
                        )}
                      </SortableLine>
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>
        </div>
      </div>

      {/* Add Line Modal */}
      {showAddLine && ((
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b">
              <h3 className="text-lg font-semibold">
                Add {addLineType === 'section' ? 'Section' : 'Item'}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Select one or more {addLineType}s to add
              </p>
            </div>
            <div className="p-4 overflow-y-auto max-h-96">
              {pickerLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto" />
                </div>
              ) : addLineType === 'section' ? (
                availableSections.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No available sections</p>
                ) : (
                  <div className="space-y-2">
                    {/* Select All Option */}
                    <label
                      className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedSections.size === availableSections.length
                          ? 'border-orange-400 bg-orange-50'
                          : 'border-gray-200 hover:border-orange-300 hover:bg-orange-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-orange-500 border-gray-300 rounded focus:ring-orange-500"
                        checked={selectedSections.size === availableSections.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedSections(new Set(availableSections.map(s => s.id)));
                          } else {
                            setSelectedSections(new Set());
                          }
                        }}
                      />
                      <span className="ml-3 font-medium text-gray-700">Select All ({availableSections.length})</span>
                    </label>
                    <div className="border-b border-gray-100 my-2"></div>
                    {availableSections.map(section => (
                      <label
                        key={section.id}
                        className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedSections.has(section.id)
                            ? 'border-orange-400 bg-orange-50'
                            : 'border-gray-200 hover:border-orange-300 hover:bg-orange-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="w-4 h-4 text-orange-500 border-gray-300 rounded focus:ring-orange-500"
                          checked={selectedSections.has(section.id)}
                          onChange={(e) => {
                            const newSet = new Set(selectedSections);
                            if (e.target.checked) {
                              newSet.add(section.id);
                            } else {
                              newSet.delete(section.id);
                            }
                            setSelectedSections(newSet);
                          }}
                        />
                        <span className="ml-3">{getTranslation(section.translations) || 'Unnamed Section'}</span>
                      </label>
                    ))}
                  </div>
                )
              ) : availableItems.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No available items</p>
              ) : (
                <div className="space-y-2">
                  {/* Select All Option */}
                  <label
                    className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedItems.size === availableItems.length
                        ? 'border-orange-400 bg-orange-50'
                        : 'border-gray-200 hover:border-orange-300 hover:bg-orange-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-orange-500 border-gray-300 rounded focus:ring-orange-500"
                      checked={selectedItems.size === availableItems.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedItems(new Set(availableItems.map(i => i.id)));
                        } else {
                          setSelectedItems(new Set());
                        }
                      }}
                    />
                    <span className="ml-3 font-medium text-gray-700">Select All ({availableItems.length})</span>
                  </label>
                  <div className="border-b border-gray-100 my-2"></div>
                  {availableItems.map(item => (
                    <label
                      key={item.id}
                      className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedItems.has(item.id)
                          ? 'border-orange-400 bg-orange-50'
                          : 'border-gray-200 hover:border-orange-300 hover:bg-orange-50'
                      }`}
                    >
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          className="w-4 h-4 text-orange-500 border-gray-300 rounded focus:ring-orange-500"
                          checked={selectedItems.has(item.id)}
                          onChange={(e) => {
                            const newSet = new Set(selectedItems);
                            if (e.target.checked) {
                              newSet.add(item.id);
                            } else {
                              newSet.delete(item.id);
                            }
                            setSelectedItems(newSet);
                          }}
                        />
                        <span className="ml-3">{getTranslation(item.translations) || 'Unnamed Item'}</span>
                      </div>
                      <span className="text-gray-500">{formatPrice(item.priceBase)}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className="p-4 border-t flex justify-between items-center">
              <span className="text-sm text-gray-500">
                {addLineType === 'section' 
                  ? `${selectedSections.size} selected`
                  : `${selectedItems.size} selected`
                }
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowAddLine(false);
                    setSelectedSections(new Set());
                    setSelectedItems(new Set());
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={addMultipleLines}
                  disabled={addingMultiple || (addLineType === 'section' ? selectedSections.size === 0 : selectedItems.size === 0)}
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {addingMultiple ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                      Adding...
                    </>
                  ) : (
                    <>Add Selected</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Location Picker Modal */}
      {showLocationPicker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b">
              <h3 className="text-lg font-semibold">Assign to Location</h3>
              <p className="text-sm text-gray-500 mt-1">
                Select a location to publish this menu to
              </p>
            </div>
            <div className="p-4 overflow-y-auto max-h-96">
              {locationsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto" />
                </div>
              ) : availableLocations.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  No available locations for this brand
                </p>
              ) : (
                <div className="space-y-2">
                  {availableLocations.map(location => (
                    <button
                      key={location.id}
                      onClick={() => assignLocation(location.id)}
                      className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors flex items-center gap-3"
                    >
                      {Icons.location}
                      <span>{location.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="p-4 border-t flex justify-end">
              <button
                onClick={() => setShowLocationPicker(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
