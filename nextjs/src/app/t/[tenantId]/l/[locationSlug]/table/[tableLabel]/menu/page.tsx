'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCart, formatPrice } from '@/lib/cart-context';

// ============================================
// Types
// ============================================
interface Translation {
  locale: string;
  name: string;
  description?: string | null;
  title?: string;
}

interface PriceBase {
  amountMinor: string;
  currency: string;
}

interface AllergenData {
  allergen: { code: string; translations: Translation[] };
}

interface DietaryFlagData {
  dietaryFlag: { code: string; translations: Translation[] };
}

interface IngredientData {
  ingredient: { name: string };
}

interface OptionItemData {
  id: string;
  tenantId: string;
  optionGroupId: string;
  code: string | null;
  displayOrder: number;
  isDefault: boolean;
  isActive: boolean;
  translations: Translation[];
  price: { deltaMinor: string; currency: string } | null;
}

interface OptionGroupData {
  id: string;
  code: string | null;
  selectionMode: string;
  minSelect: number;
  maxSelect: number | null;
  isRequired: boolean;
  displayOrder: number;
  translations: Translation[];
  options: OptionItemData[];
}

interface ItemOptionGroupData {
  optionGroup: OptionGroupData;
}

interface MenuItem {
  id: string;
  spicinessLevel: number | null;
  calories: number | null;
  translations: Translation[];
  priceBase: PriceBase | null;
  allergens: AllergenData[];
  dietaryFlags: DietaryFlagData[];
  ingredients: IngredientData[];
  optionGroups: ItemOptionGroupData[];
}

interface MenuSection {
  id: string;
  translations: Translation[];
  displayOrder: number;
  items: MenuItem[];
  menuName: string;
}

interface MenuData {
  tenant: { name: string; slug: string; defaultLocale: string };
  location: { name: string; slug: string; city: string | null };
  sections: MenuSection[];
}

// ============================================
// Helper
// ============================================
function getTranslation(translations: Translation[], locale: string): Translation | undefined {
  return (
    translations.find((t) => t.locale === locale) ||
    translations.find((t) => t.locale === 'en-US') ||
    translations[0]
  );
}

// ============================================
// Item Detail Modal
// ============================================
function ItemDetailModal({
  item,
  locale,
  currency,
  onClose,
  onAddToCart,
}: {
  item: MenuItem;
  locale: string;
  currency: string;
  onClose: () => void;
  onAddToCart: (
    item: MenuItem,
    quantity: number,
    selectedOptions: { groupId: string; groupName: string; optionId: string; optionName: string; deltaMinor: number }[],
    specialNote: string
  ) => void;
}) {
  const [quantity, setQuantity] = useState(1);
  const [specialNote, setSpecialNote] = useState('');
  const [selectedOptions, setSelectedOptions] = useState<
    Record<string, string[]>
  >({});

  const itemTrans = getTranslation(item.translations, locale);
  const basePrice = item.priceBase ? Number(item.priceBase.amountMinor) : 0;

  // Initialize defaults
  useEffect(() => {
    const defaults: Record<string, string[]> = {};
    for (const iog of item.optionGroups) {
      const og = iog.optionGroup;
      const defaultOpts = og.options.filter((o) => o.isDefault).map((o) => o.id);
      if (defaultOpts.length > 0) {
        defaults[og.id] = defaultOpts;
      }
    }
    setSelectedOptions(defaults);
  }, [item]);

  // Calculate total with options
  const optionsDelta = Object.entries(selectedOptions).reduce((sum, [, optIds]) => {
    for (const optId of optIds) {
      for (const iog of item.optionGroups) {
        const opt = iog.optionGroup.options.find((o) => o.id === optId);
        if (opt?.price) {
          sum += Number(opt.price.deltaMinor);
        }
      }
    }
    return sum;
  }, 0);

  const totalPerItem = basePrice + optionsDelta;

  function handleOptionToggle(groupId: string, optionId: string, selectionMode: string, maxSelect: number | null) {
    setSelectedOptions((prev) => {
      const current = prev[groupId] || [];
      if (selectionMode === 'single') {
        return { ...prev, [groupId]: [optionId] };
      }
      // Multi-select
      if (current.includes(optionId)) {
        return { ...prev, [groupId]: current.filter((id) => id !== optionId) };
      }
      if (maxSelect && current.length >= maxSelect) {
        return prev;
      }
      return { ...prev, [groupId]: [...current, optionId] };
    });
  }

  function handleAdd() {
    const optionsPayload: { groupId: string; groupName: string; optionId: string; optionName: string; deltaMinor: number }[] = [];
    for (const [groupId, optIds] of Object.entries(selectedOptions)) {
      for (const iog of item.optionGroups) {
        if (iog.optionGroup.id === groupId) {
          const groupName = getTranslation(iog.optionGroup.translations, locale)?.name || '';
          for (const optId of optIds) {
            const opt = iog.optionGroup.options.find((o) => o.id === optId);
            if (opt) {
              const optName = getTranslation(opt.translations, locale)?.name || '';
              optionsPayload.push({
                groupId,
                groupName,
                optionId: optId,
                optionName: optName,
                deltaMinor: opt.price ? Number(opt.price.deltaMinor) : 0,
              });
            }
          }
        }
      }
    }
    onAddToCart(item, quantity, optionsPayload, specialNote);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div
        className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800">{itemTrans?.name}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">
            ×
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Description */}
          {itemTrans?.description && (
            <p className="text-gray-600">{itemTrans.description}</p>
          )}

          {/* Allergens & Dietary */}
          {item.dietaryFlags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {item.dietaryFlags.map((df) => (
                <span key={df.dietaryFlag.code} className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                  🏷️ {getTranslation(df.dietaryFlag.translations, locale)?.name || df.dietaryFlag.code}
                </span>
              ))}
            </div>
          )}
          {item.allergens.length > 0 && (
            <p className="text-xs text-orange-600">
              ⚠️ Allergens: {item.allergens.map((a) => getTranslation(a.allergen.translations, locale)?.name || a.allergen.code).join(', ')}
            </p>
          )}

          {/* Option Groups */}
          {item.optionGroups.map((iog) => {
            const og = iog.optionGroup;
            const ogTrans = getTranslation(og.translations, locale);
            return (
              <div key={og.id}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-800">
                    {ogTrans?.name || 'Options'}
                  </h3>
                  {og.isRequired && (
                    <span className="text-xs text-red-500 font-medium">Required</span>
                  )}
                </div>
                <div className="space-y-2">
                  {og.options
                    .filter((o) => o.isActive)
                    .sort((a, b) => a.displayOrder - b.displayOrder)
                    .map((opt) => {
                      const optTrans = getTranslation(opt.translations, locale);
                      const isSelected = (selectedOptions[og.id] || []).includes(opt.id);
                      const delta = opt.price ? Number(opt.price.deltaMinor) : 0;
                      return (
                        <button
                          key={opt.id}
                          onClick={() => handleOptionToggle(og.id, opt.id, og.selectionMode, og.maxSelect)}
                          className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all ${
                            isSelected
                              ? 'border-teal-500 bg-teal-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-5 h-5 rounded-${og.selectionMode === 'single' ? 'full' : 'md'} border-2 flex items-center justify-center ${
                                isSelected ? 'border-teal-500 bg-teal-500' : 'border-gray-300'
                              }`}
                            >
                              {isSelected && (
                                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              )}
                            </div>
                            <span className="text-gray-800">{optTrans?.name}</span>
                          </div>
                          {delta !== 0 && (
                            <span className="text-sm text-gray-500">
                              {delta > 0 ? '+' : ''}{formatPrice(delta, currency)}
                            </span>
                          )}
                        </button>
                      );
                    })}
                </div>
              </div>
            );
          })}

          {/* Special Note */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Special instructions (optional)
            </label>
            <textarea
              value={specialNote}
              onChange={(e) => setSpecialNote(e.target.value)}
              placeholder="E.g., no onions, extra spicy..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm resize-none"
              rows={2}
            />
          </div>

          {/* Quantity + Add */}
          <div className="flex items-center gap-4">
            <div className="flex items-center border border-gray-300 rounded-lg">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="px-3 py-2 text-lg text-gray-600 hover:bg-gray-100 rounded-l-lg"
              >
                −
              </button>
              <span className="px-4 py-2 font-semibold text-gray-800 min-w-[40px] text-center">
                {quantity}
              </span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="px-3 py-2 text-lg text-gray-600 hover:bg-gray-100 rounded-r-lg"
              >
                +
              </button>
            </div>
            <button
              onClick={handleAdd}
              className="flex-1 py-3 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 transition-colors"
            >
              Add to Cart — {formatPrice(totalPerItem * quantity, currency)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Floating Cart Button
// ============================================
function FloatingCartButton() {
  const { itemCount, totalMinor } = useCart();
  const params = useParams();
  const tenantSlug = params.tenantId as string;
  const locationSlug = params.locationSlug as string;
  const tableLabel = params.tableLabel as string;

  if (itemCount === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white via-white to-transparent z-40">
      <Link
        href={`/t/${tenantSlug}/l/${locationSlug}/table/${tableLabel}/cart`}
        className="block w-full max-w-lg mx-auto bg-teal-600 text-white rounded-xl py-4 px-6 font-semibold text-center hover:bg-teal-700 transition-colors shadow-lg"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="bg-white/20 rounded-full w-7 h-7 flex items-center justify-center text-sm">
              {itemCount}
            </span>
            <span>View Cart</span>
          </div>
          <span>{formatPrice(totalMinor)}</span>
        </div>
      </Link>
    </div>
  );
}

// ============================================
// Main Page Component
// ============================================
export default function OrderingMenuPage() {
  const params = useParams();
  const router = useRouter();
  const { addItem } = useCart();
  const [data, setData] = useState<MenuData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);

  const tenantSlug = params.tenantId as string;
  const locationSlug = params.locationSlug as string;
  const tableLabel = params.tableLabel as string;

  const fetchMenu = useCallback(async () => {
    try {
      const res = await fetch(`/api/t/${tenantSlug}/l/${locationSlug}/menu`);
      if (!res.ok) throw new Error('Failed to load menu');
      const json = await res.json();
      setData(json);
    } catch {
      setError('Unable to load menu. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [tenantSlug, locationSlug]);

  useEffect(() => {
    fetchMenu();
  }, [fetchMenu]);

  function handleAddToCart(
    item: MenuItem,
    quantity: number,
    selectedOptions: { groupId: string; groupName: string; optionId: string; optionName: string; deltaMinor: number }[],
    specialNote: string
  ) {
    const itemTrans = getTranslation(item.translations, data?.tenant.defaultLocale || 'en-US');
    addItem({
      itemId: item.id,
      itemName: itemTrans?.name || 'Item',
      unitPriceMinor: item.priceBase ? Number(item.priceBase.amountMinor) : 0,
      quantity,
      selectedOptions,
      specialNote: specialNote || undefined,
      currency: data?.tenant ? 'EUR' : 'EUR',
    });
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center">
          <p className="text-gray-600 mb-4">{error || 'Menu not available'}</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const locale = data.tenant.defaultLocale || 'en-US';

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-600 to-teal-700 text-white">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">{data.tenant.name}</h1>
              <p className="text-teal-100 text-sm mt-1">
                📍 {data.location.name} • Table {decodeURIComponent(tableLabel)}
              </p>
            </div>
            <Link
              href={`/t/${tenantSlug}/l/${locationSlug}/table/${tableLabel}/orders`}
              className="px-3 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors text-sm flex items-center gap-1"
            >
              📋 Orders
            </Link>
          </div>
        </div>
      </div>

      {/* Menu Content */}
      <main className="max-w-3xl mx-auto px-4 py-6">
        {data.sections.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No menu items available at this location.
          </div>
        ) : (
          <div className="space-y-8">
            {data.sections.map((section) => {
              const sectionTrans = getTranslation(section.translations, locale);
              return (
                <section key={section.id}>
                  <h2 className="text-xl font-bold text-gray-800 mb-4 pb-2 border-b border-gray-200">
                    {sectionTrans?.title || sectionTrans?.name || 'Section'}
                  </h2>

                  <div className="space-y-3">
                    {section.items.map((item) => {
                      const itemTrans = getTranslation(item.translations, locale);
                      const price = item.priceBase
                        ? formatPrice(Number(item.priceBase.amountMinor), item.priceBase.currency)
                        : null;

                      return (
                        <button
                          key={item.id}
                          onClick={() => setSelectedItem(item)}
                          className="w-full bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all text-left p-4"
                        >
                          <div className="flex justify-between items-start gap-4">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-gray-800 truncate">
                                {itemTrans?.name || 'Item'}
                              </h3>
                              {itemTrans?.description && (
                                <p className="text-gray-500 text-sm mt-0.5 line-clamp-2">
                                  {itemTrans.description}
                                </p>
                              )}
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                {item.dietaryFlags.map((df) => (
                                  <span
                                    key={df.dietaryFlag.code}
                                    className="px-1.5 py-0.5 bg-green-100 text-green-700 text-[10px] rounded-full"
                                  >
                                    {getTranslation(df.dietaryFlag.translations, locale)?.name || df.dietaryFlag.code}
                                  </span>
                                ))}
                                {item.spicinessLevel && item.spicinessLevel > 0 && (
                                  <span className="text-xs text-orange-500">
                                    {'🌶️'.repeat(item.spicinessLevel)}
                                  </span>
                                )}
                              </div>
                            </div>
                            {price && (
                              <span className="font-bold text-teal-600 whitespace-nowrap">
                                {price}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </main>

      {/* Item Detail Modal */}
      {selectedItem && (
        <ItemDetailModal
          item={selectedItem}
          locale={locale}
          currency="EUR"
          onClose={() => setSelectedItem(null)}
          onAddToCart={handleAddToCart}
        />
      )}

      {/* Floating Cart Button */}
      <FloatingCartButton />
    </div>
  );
}
