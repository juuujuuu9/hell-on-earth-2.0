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
      className="relative inline-flex items-center justify-center p-2 hover:opacity-70 rounded transition-opacity cursor-pointer"
      aria-label={`Shopping cart with ${itemCount} items`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        className="w-[1.35rem] h-[1.35rem]"
      >
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M6 7V5.77273C6 4.2263 6.644 2.75317 7.77399 1.67454C8.9024 0.597427 10.4233 0 12 0C13.5767 0 15.0976 0.597427 16.226 1.67454C17.356 2.75317 18 4.2263 18 5.77273V7H19C20.1046 7 21 7.89543 21 9V18C21 20.7614 18.7614 23 16 23H8C5.23858 23 3 20.7614 3 18V9C3 7.89543 3.89543 7 5 7H6ZM9.15494 3.12126C9.9019 2.40825 10.9245 2 12 2C13.0755 2 14.0981 2.40825 14.8451 3.12126C15.5904 3.83275 16 4.78754 16 5.77273V7H8V5.77273C8 4.78755 8.40957 3.83275 9.15494 3.12126ZM5 18V9H19V18C19 19.6569 17.6569 21 16 21H8C6.34315 21 5 19.6569 5 18Z"
          fill="currentColor"
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
