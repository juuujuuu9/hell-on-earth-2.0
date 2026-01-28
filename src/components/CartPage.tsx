/**
 * Cart Page Component
 * 
 * Displays cart items, allows quantity updates and item removal
 */

import { useEffect, useState } from 'react';
import { useStore } from '@nanostores/react';
import { cartStore, setCart, setCartLoading, setCartError } from '@lib/cartStore';

// Helper function to strip HTML from price strings
function stripPriceHtml(price: string): string {
  return price.replace(/<[^>]*>/g, '').trim();
}

export default function CartPage() {
  const cart = useStore(cartStore);
  const [updatingKeys, setUpdatingKeys] = useState<Set<string>>(new Set());
  const [removingKeys, setRemovingKeys] = useState<Set<string>>(new Set());

  // Fetch cart on mount
  useEffect(() => {
    fetchCart();
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
      setCartError(error instanceof Error ? error.message : 'Failed to load cart');
      setCartLoading(false);
    }
  };

  const handleUpdateQuantity = async (key: string, quantity: number) => {
    if (quantity < 1) {
      handleRemoveItem(key);
      return;
    }

    setUpdatingKeys((prev) => new Set(prev).add(key));
    setCartError(null);

    try {
      // TODO: Replace with your new cart API
      setUpdatingKeys((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    } catch (error) {
      console.error('Error updating cart item:', error);
      setCartError(error instanceof Error ? error.message : 'Failed to update item');
      setUpdatingKeys((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  const handleRemoveItem = async (key: string) => {
    setRemovingKeys((prev) => new Set(prev).add(key));
    setCartError(null);

    try {
      // TODO: Replace with your new cart API
      setRemovingKeys((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    } catch (error) {
      console.error('Error removing cart item:', error);
      setCartError(error instanceof Error ? error.message : 'Failed to remove item');
      setRemovingKeys((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  if (cart.isLoading && !cart.cart) {
    return (
      <div className="min-h-screen p-8 max-w-6xl mx-auto">
        <div className="text-center py-12">
          <p className="text-gray-500">Loading cart...</p>
        </div>
      </div>
    );
  }

  if (!cart.cart || cart.cart.itemCount === 0) {
    return (
      <div className="min-h-screen p-8 max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Cart</h1>
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">Your cart is empty.</p>
          <a
            href="/products"
            className="inline-block px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition-colors cursor-pointer"
          >
            Continue Shopping
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 max-w-6xl mx-auto">
      <h1 className="text-4xl font-bold mb-8">Cart</h1>

      {cart.error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {cart.error}
        </div>
      )}

      <div className="space-y-4 mb-8">
        {cart.cart.contents?.nodes.map((item) => {
          const isUpdating = updatingKeys.has(item.key);
          const isRemoving = removingKeys.has(item.key);
          const isDisabled = isUpdating || isRemoving;

          return (
            <div
              key={item.key}
              className={`bg-white rounded-lg shadow-md p-6 flex gap-6 ${
                isRemoving ? 'opacity-50' : ''
              }`}
            >
              {item.product.node.image && (
                <img
                  src={item.product.node.image.sourceUrl}
                  alt={item.product.node.image.altText || item.product.node.name}
                  className="w-24 h-24 object-cover rounded"
                />
              )}

              <div className="flex-1">
                <h2 className="text-xl font-semibold mb-2">
                  <a
                    href={`/products/${item.product.node.slug}`}
                    className="hover:text-primary-600 transition-colors cursor-pointer"
                  >
                    {item.product.node.name}
                  </a>
                </h2>

                <div className="flex items-center gap-4 mt-4">
                  <div className="flex items-center gap-2">
                    <label htmlFor={`quantity-${item.key}`} className="sr-only">
                      Quantity
                    </label>
                    <button
                      onClick={() => handleUpdateQuantity(item.key, item.quantity - 1)}
                      disabled={isDisabled}
                      className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      −
                    </button>
                    <input
                      id={`quantity-${item.key}`}
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => {
                        const newQuantity = parseInt(e.target.value, 10);
                        if (!isNaN(newQuantity) && newQuantity > 0) {
                          handleUpdateQuantity(item.key, newQuantity);
                        }
                      }}
                      disabled={isDisabled}
                      className="w-16 px-2 py-1 border border-gray-300 rounded text-center disabled:opacity-50"
                    />
                    <button
                      onClick={() => handleUpdateQuantity(item.key, item.quantity + 1)}
                      disabled={isDisabled}
                      className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      +
                    </button>
                  </div>

                  <div className="text-lg font-semibold">
                    {item.total ? stripPriceHtml(item.total) : 'N/A'}
                  </div>

                  <button
                    onClick={() => handleRemoveItem(item.key)}
                    disabled={isDisabled}
                    className="ml-auto px-4 py-2 text-red-600 hover:text-red-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    {isRemoving ? 'Removing...' : 'Remove'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <span className="text-xl font-semibold">Subtotal:</span>
          <span className="text-xl font-bold">
            {cart.cart.subtotal ? stripPriceHtml(cart.cart.subtotal) : 'N/A'}
          </span>
        </div>
        <div className="flex justify-between items-center mb-6">
          <span className="text-xl font-semibold">Total:</span>
          <span className="text-2xl font-bold text-primary-600">
            {cart.cart.total ? stripPriceHtml(cart.cart.total) : 'N/A'}
          </span>
        </div>
        <div className="flex gap-4">
          <a
            href="/products"
            className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 text-center transition-colors cursor-pointer"
          >
            Continue Shopping
          </a>
          <button
            disabled={cart.isLoading}
            className="flex-1 px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            Proceed to Checkout
          </button>
        </div>
      </div>
    </div>
  );
}
