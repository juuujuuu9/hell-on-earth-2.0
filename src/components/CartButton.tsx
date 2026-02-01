/**
 * Cart Button Component
 *
 * Offers Stripe (Card) and/or BTCPay (Bitcoin) checkout.
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
  btcpayAvailable?: boolean;
}

export default function CartButton({
  productId,
  productName,
  stripeCheckoutUrl,
  sizes,
  btcpayAvailable = false,
}: CartButtonProps) {
  const [isLoading, setIsLoading] = useState<'card' | 'bitcoin' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);

  const hasSizes = sizes && sizes.length > 0;
  const needsSize = hasSizes && !selectedSize;
  const hasStripe = Boolean(stripeCheckoutUrl);
  const hasBtcpay = Boolean(btcpayAvailable);
  const hasPayment = hasStripe || hasBtcpay;

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

  const handleStripeCheckout = () => {
    if (needsSize || !stripeCheckoutUrl) return;
    window.location.href = stripeCheckoutUrl;
  };

  const handleStripeFallback = async () => {
    if (needsSize) return;
    setIsLoading('card');
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
      setIsLoading(null);
    }
  };

  const handleBtcpayCheckout = async () => {
    if (needsSize) return;
    setIsLoading('bitcoin');
    setError(null);
    try {
      const body: { productId: string; quantity: number; size?: string } = {
        productId,
        quantity: 1,
      };
      if (selectedSize) body.size = selectedSize;

      const response = await fetch('/api/btcpay-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Request failed (${response.status})`);
      }
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        throw new Error('No checkout URL in response');
      }
    } catch (err) {
      console.error('BTCPay checkout error:', err);
      setError(err instanceof Error ? err.message : 'Failed to proceed to checkout');
      setIsLoading(null);
    }
  };

  if (!hasPayment) {
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

  const btnBase =
    'flex-1 px-6 py-4 uppercase font-semibold transition-opacity disabled:bg-gray-400 disabled:cursor-not-allowed cursor-pointer';
  const cardBtn =
    'bg-black text-white hover:opacity-70 border border-black';
  const btcBtn =
    'bg-white text-black border border-black hover:bg-gray-100';

  return (
    <div className="min-h-[52px] space-y-2">
      {error && (
        <div className="text-sm text-red-600" role="alert">
          {error}
        </div>
      )}
      <div className={`flex gap-3 ${hasStripe && hasBtcpay ? '' : ''}`}>
        {hasStripe && (
          <button
            onClick={stripeCheckoutUrl ? handleStripeCheckout : handleStripeFallback}
            disabled={needsSize || isLoading !== null}
            className={`${btnBase} ${cardBtn}`}
          >
            {isLoading === 'card' ? 'Loading...' : needsSize ? 'SELECT SIZE' : 'PAY WITH CARD'}
          </button>
        )}
        {hasBtcpay && (
          <button
            onClick={handleBtcpayCheckout}
            disabled={needsSize || isLoading !== null}
            className={`${btnBase} ${btcBtn}`}
          >
            {isLoading === 'bitcoin' ? 'Loading...' : needsSize ? 'SELECT SIZE' : 'PAY WITH BITCOIN'}
          </button>
        )}
      </div>
    </div>
  );
}
