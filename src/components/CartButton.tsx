/**
 * Cart Button Component
 * 
 * Adds products to WooCommerce cart using WooGraphQL mutations
 * Uses nanostores for cart state management
 */

import { useState } from 'react';
import { useStore } from '@nanostores/react';
import { cartStore, setCart, setCartLoading, setCartError } from '@lib/cartStore';
import { graphqlRequest } from '@lib/wpgraphql';
import { ADD_TO_CART_MUTATION, type AddToCartResponse } from '@lib/queries';

interface CartButtonProps {
  productId: string;
  productName: string;
}

export default function CartButton({ productId, productName }: CartButtonProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const cart = useStore(cartStore);

  const handleAddToCart = async () => {
    setIsAdding(true);
    setCartLoading(true);
    setCartError(null);

    try {
      const productIdNum = parseInt(productId, 10);
      if (isNaN(productIdNum)) {
        throw new Error('Invalid product ID');
      }

      const data = await graphqlRequest<AddToCartResponse>({
        query: ADD_TO_CART_MUTATION,
        variables: {
          productId: productIdNum,
          quantity: 1,
        },
      });

      // Update cart store with new cart data
      setCart(data.addToCart.cart);
      setIsAdding(false);
      setCartLoading(false);
      setAdded(true);

      setTimeout(() => setAdded(false), 3000);
    } catch (error) {
      console.error('Error adding to cart:', error);
      setCartError(error instanceof Error ? error.message : 'Failed to add item to cart');
      setCartLoading(false);
      setIsAdding(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleAddToCart}
        disabled={isAdding || added || cart.isLoading}
        className="px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
      >
        {isAdding || cart.isLoading ? 'Adding...' : added ? 'Added to Cart!' : 'Add to Cart'}
      </button>
      {cart.error && (
        <p className="mt-2 text-sm text-red-600">{cart.error}</p>
      )}
    </div>
  );
}
