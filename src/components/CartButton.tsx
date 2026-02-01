/**
 * Cart Button Component
 *
 * Redirects to Stripe Checkout Link (stored in database).
 * When product has sizes, requires a size to be selected (via wrapper data-selected-size).
 */

import { useState, useEffect } from 'react';

interface SizeOption {
  size: string;
  quantity: number;
}

interface CartButtonProps {
  productId: string;
  productName: string;
  stripeCheckoutUrl?: string | null;
  sizes?: SizeOption[];
}

export default function CartButton({ productId, productName, stripeCheckoutUrl, sizes }: CartButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
    return () => wrapper.removeEventListener('size-selected', onSizeSelected as EventListener);
  }, [hasSizes]);

  const handleCheckout = async () => {
    if (needsSize) return;
    if (stripeCheckoutUrl) {
      window.location.href = stripeCheckoutUrl;
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/stripe-checkout?productId=${productId}`);
      if (!response.ok) throw new Error('Failed to get checkout URL');
      const data = await response.json();
      if (data.checkoutUrl) window.location.href = data.checkoutUrl;
      else throw new Error('No checkout URL available');
    } catch (err) {
      console.error('Error getting checkout URL:', err);
      setError(err instanceof Error ? err.message : 'Failed to proceed to checkout');
      setIsLoading(false);
    }
  };

  if (!stripeCheckoutUrl && error) {
    return (
      <div className="min-h-[52px]">
        <button
          disabled
          className="w-full px-6 py-4 bg-gray-400 text-white uppercase font-semibold cursor-not-allowed"
        >
          Unavailable
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-[52px]">
      <button
        onClick={handleCheckout}
        disabled={isLoading || needsSize}
        className="w-full px-6 py-4 bg-black text-white uppercase font-semibold hover:opacity-70 disabled:bg-gray-400 disabled:cursor-not-allowed transition-opacity cursor-pointer"
      >
        {isLoading ? 'Loading...' : needsSize ? 'SELECT SIZE' : '+ ADD TO CART'}
      </button>
    </div>
  );
}
