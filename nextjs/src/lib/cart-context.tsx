'use client';

import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';

// ============================================
// Types
// ============================================
export interface CartItemOption {
  groupId: string;
  groupName: string;
  optionId: string;
  optionName: string;
  deltaMinor: number; // price delta in minor units (cents)
}

export interface CartItem {
  id: string; // unique cart line id (generated)
  itemId: string;
  itemName: string;
  unitPriceMinor: number;
  quantity: number;
  selectedOptions: CartItemOption[];
  specialNote?: string;
  currency: string;
}

export interface CartState {
  items: CartItem[];
  sessionCode: string | null;
  tenantId: string | null;
  locationId: string | null;
  tableLabel: string | null;
}

type CartAction =
  | { type: 'ADD_ITEM'; payload: Omit<CartItem, 'id'> }
  | { type: 'REMOVE_ITEM'; payload: { id: string } }
  | { type: 'UPDATE_QUANTITY'; payload: { id: string; quantity: number } }
  | { type: 'UPDATE_NOTE'; payload: { id: string; specialNote: string } }
  | { type: 'CLEAR_CART' }
  | { type: 'SET_SESSION'; payload: { sessionCode: string; tenantId: string; locationId: string; tableLabel: string } }
  | { type: 'HYDRATE'; payload: CartState };

// ============================================
// Helpers
// ============================================
function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

export function getCartItemTotal(item: CartItem): number {
  const optionsDelta = item.selectedOptions.reduce((sum, o) => sum + o.deltaMinor, 0);
  return (item.unitPriceMinor + optionsDelta) * item.quantity;
}

export function getCartTotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + getCartItemTotal(item), 0);
}

export function formatPrice(amountMinor: number, currency: string = 'EUR'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amountMinor / 100);
}

// ============================================
// Reducer
// ============================================
const STORAGE_KEY = 'restaurant-cart';

const initialState: CartState = {
  items: [],
  sessionCode: null,
  tenantId: null,
  locationId: null,
  tableLabel: null,
};

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM': {
      // Check if same item with same options exists — merge quantity
      const existing = state.items.find(
        (i) =>
          i.itemId === action.payload.itemId &&
          JSON.stringify(i.selectedOptions) === JSON.stringify(action.payload.selectedOptions)
      );
      if (existing) {
        return {
          ...state,
          items: state.items.map((i) =>
            i.id === existing.id
              ? { ...i, quantity: i.quantity + action.payload.quantity }
              : i
          ),
        };
      }
      return {
        ...state,
        items: [...state.items, { ...action.payload, id: generateId() }],
      };
    }
    case 'REMOVE_ITEM':
      return {
        ...state,
        items: state.items.filter((i) => i.id !== action.payload.id),
      };
    case 'UPDATE_QUANTITY':
      if (action.payload.quantity <= 0) {
        return {
          ...state,
          items: state.items.filter((i) => i.id !== action.payload.id),
        };
      }
      return {
        ...state,
        items: state.items.map((i) =>
          i.id === action.payload.id ? { ...i, quantity: action.payload.quantity } : i
        ),
      };
    case 'UPDATE_NOTE':
      return {
        ...state,
        items: state.items.map((i) =>
          i.id === action.payload.id ? { ...i, specialNote: action.payload.specialNote } : i
        ),
      };
    case 'CLEAR_CART':
      return { ...state, items: [] };
    case 'SET_SESSION':
      return {
        ...state,
        sessionCode: action.payload.sessionCode,
        tenantId: action.payload.tenantId,
        locationId: action.payload.locationId,
        tableLabel: action.payload.tableLabel,
      };
    case 'HYDRATE':
      return action.payload;
    default:
      return state;
  }
}

// ============================================
// Context
// ============================================
interface CartContextValue {
  state: CartState;
  addItem: (item: Omit<CartItem, 'id'>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  updateNote: (id: string, specialNote: string) => void;
  clearCart: () => void;
  setSession: (data: { sessionCode: string; tenantId: string; locationId: string; tableLabel: string }) => void;
  itemCount: number;
  totalMinor: number;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, initialState);
  const [hydrated, setHydrated] = React.useState(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as CartState;
        dispatch({ type: 'HYDRATE', payload: parsed });
      }
    } catch {
      // ignore parse errors
    }
    setHydrated(true);
  }, []);

  // Persist to localStorage on change
  useEffect(() => {
    if (hydrated) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  }, [state, hydrated]);

  const addItem = useCallback((item: Omit<CartItem, 'id'>) => {
    dispatch({ type: 'ADD_ITEM', payload: item });
  }, []);

  const removeItem = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_ITEM', payload: { id } });
  }, []);

  const updateQuantity = useCallback((id: string, quantity: number) => {
    dispatch({ type: 'UPDATE_QUANTITY', payload: { id, quantity } });
  }, []);

  const updateNote = useCallback((id: string, specialNote: string) => {
    dispatch({ type: 'UPDATE_NOTE', payload: { id, specialNote } });
  }, []);

  const clearCart = useCallback(() => {
    dispatch({ type: 'CLEAR_CART' });
  }, []);

  const setSession = useCallback(
    (data: { sessionCode: string; tenantId: string; locationId: string; tableLabel: string }) => {
      dispatch({ type: 'SET_SESSION', payload: data });
    },
    []
  );

  const itemCount = state.items.reduce((sum, i) => sum + i.quantity, 0);
  const totalMinor = getCartTotal(state.items);

  return (
    <CartContext.Provider
      value={{
        state,
        addItem,
        removeItem,
        updateQuantity,
        updateNote,
        clearCart,
        setSession,
        itemCount,
        totalMinor,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return ctx;
}
