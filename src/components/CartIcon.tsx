/**
 * Cart Icon Component
 * 
 * Displays cart item count and links to cart page
 * Uses nanostores to show real-time cart updates
 */

import { useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { cartStore, setCart, setCartLoading, setCartError } from '@lib/cartStore';

export default function CartIcon() {
  const cart = useStore(cartStore);

  // Fetch cart on mount to get initial count
  useEffect(() => {
    if (!cart.cart) {
      fetchCart();
    }
  }, []);

  const fetchCart = async () => {
    setCartLoading(true);
    setCartError(null);

    try {
      // TODO: Replace with your new cart API
      setCart(null);
      setCartLoading(false);
    } catch (error) {
      console.error('Error fetching cart:', error);
      setCartLoading(false);
      // Don't set error for cart icon - just fail silently
    }
  };

  const itemCount = cart.cart?.itemCount || 0;

  return (
    <a
      href="/cart"
      className="relative inline-flex items-center justify-center p-2 hover:opacity-70 rounded transition-opacity"
      aria-label={`Shopping cart with ${itemCount} items`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="w-6 h-6"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"
        />
      </svg>
      {itemCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-primary-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
          {itemCount > 99 ? '99+' : itemCount}
        </span>
      )}
    </a>
  );
}
