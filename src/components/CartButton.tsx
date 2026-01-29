/**
 * Cart Button Component
 * 
 * Redirects to Stripe Checkout Link (stored in database)
 * Using Stripe Checkout Links - no backend cart logic needed
 */

import { useState } from 'react';

interface CartButtonProps {
  productId: string;
  productName: string;
  stripeCheckoutUrl?: string | null;
}

export default function CartButton({ productId, productName, stripeCheckoutUrl }: CartButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheckout = async () => {
    if (stripeCheckoutUrl) {
      // Redirect directly to Stripe Checkout Link
      window.location.href = stripeCheckoutUrl;
      return;
    }

    // If no checkout URL, fetch it from API
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/stripe-checkout?productId=${productId}`);
      if (!response.ok) {
        throw new Error('Failed to get checkout URL');
      }
      const data = await response.json();
      
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        throw new Error('No checkout URL available');
      }
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
        disabled={isLoading}
        className="w-full px-6 py-4 bg-black text-white uppercase font-semibold hover:opacity-70 disabled:bg-gray-400 disabled:cursor-not-allowed transition-opacity cursor-pointer"
      >
        {isLoading ? 'Loading...' : '+ ADD TO CART'}
      </button>
    </div>
  );
}
