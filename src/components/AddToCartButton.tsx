/**
 * Add to Cart Button
 *
 * Single "ADD TO CART" button on PDP. When product has sizes, requires a size
 * to be selected (via wrapper data-selected-size / size-selected). Adds item
 * to cart, opens the cart tray, and highlights the added line.
 */

import { useState, useEffect } from 'react';
import type { Product } from '@lib/types';
import {
  addItemToCart,
  setCartTrayOpen,
  setCartHighlightKeys,
} from '@lib/cartStore';

interface SizeOption {
  size: string;
  quantity: number;
}

interface AddToCartButtonProps {
  product: Product;
  sizes?: SizeOption[];
}

export default function AddToCartButton({
  product,
  sizes,
}: AddToCartButtonProps): JSX.Element {
  const [selectedSize, setSelectedSize] = useState<string | null>(null);

  const hasSizes = sizes && sizes.length > 0;
  const needsSize = hasSizes && !selectedSize;

  useEffect(() => {
    if (!hasSizes) return;
    const wrapper = document.getElementById('cart-button-wrapper');
    if (!wrapper) return;
    const onSizeSelected = (e: CustomEvent<{ size: string }>) => {
      setSelectedSize(e.detail?.size ?? null);
    };
    wrapper.addEventListener('size-selected', onSizeSelected as EventListener);
    const current = wrapper.getAttribute('data-selected-size');
    if (current) setSelectedSize(current);
    return () =>
      wrapper.removeEventListener('size-selected', onSizeSelected as EventListener);
  }, [hasSizes]);

  const [isAdding, setIsAdding] = useState(false);

  const handleAddToCart = async (): Promise<void> => {
    if (needsSize) return;
    setIsAdding(true);
    try {
      const addedKey = await addItemToCart(
        product.id,
        1,
        selectedSize ?? undefined
      );
      if (addedKey != null) {
        setCartHighlightKeys([addedKey]);
        setCartTrayOpen(true);
      }
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="min-h-[52px]">
      <button
        type="button"
        onClick={handleAddToCart}
        disabled={needsSize || isAdding}
        className="w-full px-6 py-4 bg-black text-white uppercase font-semibold border border-black hover:opacity-90 transition-opacity disabled:bg-gray-400 disabled:cursor-not-allowed cursor-pointer"
      >
        {isAdding ? 'ADDING...' : needsSize ? 'SELECT SIZE' : 'ADD TO CART'}
      </button>
    </div>
  );
}
