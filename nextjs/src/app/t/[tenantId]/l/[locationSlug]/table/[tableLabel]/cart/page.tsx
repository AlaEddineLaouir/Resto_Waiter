'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  useCart,
  formatPrice,
  getCartItemTotal,
} from '@/lib/cart-context';

export default function CartPage() {
  const params = useParams();
  const router = useRouter();
  const { state, removeItem, updateQuantity, clearCart, totalMinor, itemCount } = useCart();
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const tenantSlug = params.tenantId as string;
  const locationSlug = params.locationSlug as string;
  const tableLabel = params.tableLabel as string;

  async function handleSubmit() {
    if (state.items.length === 0) return;

    const sessionCode = state.sessionCode || localStorage.getItem('active-session-code');
    if (!sessionCode) {
      setSubmitError('No active table session. Please scan the QR code again.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch(`/api/t/${tenantSlug}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionCode,
          specialInstructions: specialInstructions || undefined,
          items: state.items.map((item) => ({
            itemId: item.itemId,
            itemName: item.itemName,
            unitPriceMinor: item.unitPriceMinor,
            quantity: item.quantity,
            selectedOptions: item.selectedOptions,
            specialNote: item.specialNote,
          })),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setSubmitError(data.error || 'Failed to submit order');
        setSubmitting(false);
        return;
      }

      setSubmitSuccess(true);
      clearCart();

      // Redirect to order tracker after short delay
      setTimeout(() => {
        router.push(`/t/${tenantSlug}/l/${locationSlug}/table/${tableLabel}/orders`);
      }, 2000);
    } catch {
      setSubmitError('Connection error. Please try again.');
      setSubmitting(false);
    }
  }

  if (submitSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full text-center bg-white rounded-2xl shadow-lg p-8">
          <div className="text-5xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Order Submitted!</h1>
          <p className="text-gray-500 mb-4">
            Your order has been sent. A waiter will confirm it shortly.
          </p>
          <p className="text-sm text-gray-400">Redirecting to order tracker...</p>
        </div>
      </div>
    );
  }

  if (itemCount === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-600 to-teal-700 text-white">
          <div className="max-w-3xl mx-auto px-4 py-6">
            <Link
              href={`/t/${tenantSlug}/l/${locationSlug}/table/${tableLabel}/menu`}
              className="text-teal-200 hover:text-white text-sm flex items-center gap-1 mb-2"
            >
              ← Back to Menu
            </Link>
            <h1 className="text-2xl font-bold">Your Cart</h1>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-4 py-12 text-center">
          <div className="text-5xl mb-4">🛒</div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Your cart is empty</h2>
          <p className="text-gray-500 mb-6">Browse the menu and add some delicious items!</p>
          <Link
            href={`/t/${tenantSlug}/l/${locationSlug}/table/${tableLabel}/menu`}
            className="px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium inline-block"
          >
            Browse Menu
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-600 to-teal-700 text-white">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <Link
            href={`/t/${tenantSlug}/l/${locationSlug}/table/${tableLabel}/menu`}
            className="text-teal-200 hover:text-white text-sm flex items-center gap-1 mb-2"
          >
            ← Back to Menu
          </Link>
          <h1 className="text-2xl font-bold">Your Cart</h1>
          <p className="text-teal-100 text-sm mt-1">
            Table {decodeURIComponent(tableLabel)} • {itemCount} item{itemCount !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        {/* Cart Items */}
        {state.items.map((item) => (
          <div key={item.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex justify-between items-start">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-800">{item.itemName}</h3>
                {item.selectedOptions.length > 0 && (
                  <p className="text-sm text-gray-500 mt-0.5">
                    {item.selectedOptions.map((o) => o.optionName).join(', ')}
                  </p>
                )}
                {item.specialNote && (
                  <p className="text-xs text-orange-600 mt-1">📝 {item.specialNote}</p>
                )}
              </div>
              <span className="font-bold text-teal-600 ml-4">
                {formatPrice(getCartItemTotal(item), item.currency)}
              </span>
            </div>

            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
              <div className="flex items-center border border-gray-300 rounded-lg">
                <button
                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                  className="px-3 py-1 text-gray-600 hover:bg-gray-100 rounded-l-lg"
                >
                  −
                </button>
                <span className="px-3 py-1 font-medium text-gray-800 min-w-[32px] text-center">
                  {item.quantity}
                </span>
                <button
                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  className="px-3 py-1 text-gray-600 hover:bg-gray-100 rounded-r-lg"
                >
                  +
                </button>
              </div>
              <button
                onClick={() => removeItem(item.id)}
                className="text-red-500 hover:text-red-600 text-sm font-medium"
              >
                Remove
              </button>
            </div>
          </div>
        ))}

        {/* Special Instructions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Special Instructions for the Kitchen
          </label>
          <textarea
            value={specialInstructions}
            onChange={(e) => setSpecialInstructions(e.target.value)}
            placeholder="Any allergies, dietary requirements, or special requests..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm resize-none"
            rows={3}
          />
        </div>

        {/* Order Summary */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <h3 className="font-semibold text-gray-800 mb-3">Order Summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>{formatPrice(totalMinor)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Tax (included)</span>
              <span>—</span>
            </div>
            <div className="border-t pt-2 flex justify-between font-bold text-lg text-gray-800">
              <span>Total</span>
              <span>{formatPrice(totalMinor)}</span>
            </div>
          </div>
        </div>

        {/* Error */}
        {submitError && (
          <div className="bg-red-50 text-red-700 rounded-lg p-4 text-sm">
            {submitError}
          </div>
        )}

        {/* Clear Cart */}
        <div className="text-center">
          <button
            onClick={clearCart}
            className="text-gray-400 hover:text-red-500 text-sm transition-colors"
          >
            Clear entire cart
          </button>
        </div>
      </main>

      {/* Fixed Submit Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t shadow-lg z-40">
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="block w-full max-w-3xl mx-auto bg-teal-600 text-white rounded-xl py-4 px-6 font-semibold text-center hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
              Placing Order...
            </span>
          ) : (
            `Submit Order — ${formatPrice(totalMinor)}`
          )}
        </button>
      </div>
    </div>
  );
}
