/**
 * Cart Store using nanostores
 * 
 * RULE-007: State Management - Using nanostores for cart state shared across components
 */

import { atom } from 'nanostores';
import type { Cart } from './types';

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
