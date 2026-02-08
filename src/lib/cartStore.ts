/**
 * Cart Store using nanostores
 *
 * RULE-007: State Management - Using nanostores for cart state shared across components
 */

import { atom } from 'nanostores';
import type { Cart } from './types';

function stripPriceHtml(price: string): string {
  return price.replace(/<[^>]*>/g, '').trim();
}

function parsePriceToNumber(price: string): number {
  const stripped = stripPriceHtml(price);
  const match = stripped.match(/(\d+\.?\d*)/);
  return match ? parseFloat(match[1]) : 0;
}

function formatPrice(amount: number): string {
  return `${amount.toFixed(2)} USD`;
}

export interface CartStore {
  cart: Cart | null;
  isLoading: boolean;
  error: string | null;
}

const initialCartState: CartStore = {
  cart: null,
  isLoading: false,
  error: null,
};

export const cartStore = atom<CartStore>(initialCartState);

/** Cart tray open state (slide-in from right) */
export const cartTrayOpenStore = atom<boolean>(false);

export function setCartTrayOpen(open: boolean): void {
  cartTrayOpenStore.set(open);
}

/** Keys of cart line items to highlight (e.g. just added) */
export const cartHighlightKeysStore = atom<Set<string>>(new Set());

export function setCartHighlightKeys(keys: Set<string> | string[]): void {
  cartHighlightKeysStore.set(keys instanceof Set ? keys : new Set(keys));
}

/**
 * Fetch cart from server (GET /api/cart). Call on app load to hydrate.
 */
export async function fetchCartFromServer(): Promise<void> {
  setCartLoading(true);
  setCartError(null);
  try {
    const res = await fetch('/api/cart', { method: 'GET', credentials: 'include' });
    if (!res.ok) throw new Error('Failed to load cart');
    const cart: Cart = await res.json();
    setCart(cart);
  } catch (err) {
    console.error('fetchCartFromServer:', err);
    setCartError(err instanceof Error ? err.message : 'Failed to load cart');
    setCart(null);
  } finally {
    setCartLoading(false);
  }
}

/**
 * Add item to cart via API. Returns addedKey for highlight, or null on error.
 */
export async function addItemToCart(
  productId: string,
  quantity: number,
  size?: string
): Promise<string | null> {
  setCartLoading(true);
  setCartError(null);
  try {
    const res = await fetch('/api/cart/add', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, quantity, size: size ?? undefined }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to add to cart');
    }
    const data: { cart: Cart; addedKey: string } = await res.json();
    setCart(data.cart);
    return data.addedKey;
  } catch (err) {
    setCartError(err instanceof Error ? err.message : 'Failed to add to cart');
    return null;
  } finally {
    setCartLoading(false);
  }
}

/**
 * Update line quantity via API (PATCH /api/cart). Quantity 0 removes.
 */
export async function updateCartItemQuantity(key: string, quantity: number): Promise<void> {
  setCartError(null);
  try {
    const res = await fetch('/api/cart', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, quantity }),
    });
    if (!res.ok) throw new Error('Failed to update cart');
    const data: { cart: Cart } = await res.json();
    setCart(data.cart);
  } catch (err) {
    setCartError(err instanceof Error ? err.message : 'Failed to update');
  }
}

/**
 * Remove line from cart via API (DELETE /api/cart/items/[key]).
 */
export async function removeCartItem(key: string): Promise<void> {
  setCartError(null);
  try {
    const res = await fetch(`/api/cart/items/${encodeURIComponent(key)}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to remove item');
    const data: { cart: Cart } = await res.json();
    setCart(data.cart);
  } catch (err) {
    setCartError(err instanceof Error ? err.message : 'Failed to remove');
  }
}

/**
 * Update cart state
 */
export function setCart(cart: Cart | null): void {
  cartStore.set({
    ...cartStore.get(),
    cart,
  });
}

/**
 * Set loading state
 */
export function setCartLoading(isLoading: boolean): void {
  cartStore.set({
    ...cartStore.get(),
    isLoading,
  });
}

/**
 * Set error state
 */
export function setCartError(error: string | null): void {
  cartStore.set({
    ...cartStore.get(),
    error,
  });
}

/**
 * Reset cart store
 */
export function resetCart(): void {
  cartStore.set(initialCartState);
}
