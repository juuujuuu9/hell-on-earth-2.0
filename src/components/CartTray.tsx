/**
 * Cart Tray Component
 *
 * Slides in from the right. On mobile: full screen (top to bottom).
 * On desktop: max 450px width, below header (73px).
 * Layout: YOUR CART + close, line items, subtotal, TO SHOPPING CART / TO CHECKOUT.
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { useStore } from '@nanostores/react';
import {
  cartStore,
  cartTrayOpenStore,
  cartHighlightKeysStore,
  setCartTrayOpen,
  setCartHighlightKeys,
  fetchCartFromServer,
  updateCartItemQuantity,
  removeCartItem,
} from '@lib/cartStore';
import type { CartItem } from '@lib/types';

function stripPriceHtml(price: string): string {
  return price.replace(/<[^>]*>/g, '').trim();
}

const HIGHLIGHT_DURATION_MS = 1500;

export default function CartTray(): JSX.Element {
  const cart = useStore(cartStore);
  const isOpen = useStore(cartTrayOpenStore);
  const highlightKeys = useStore(cartHighlightKeysStore);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousActiveRef = useRef<HTMLElement | null>(null);
  const [removingKeys, setRemovingKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (highlightKeys.size === 0) return;
    const t = setTimeout(() => setCartHighlightKeys([]), HIGHLIGHT_DURATION_MS);
    return () => clearTimeout(t);
  }, [highlightKeys]);

  const scrollYRef = useRef(0);

  const close = useCallback(() => {
    setCartTrayOpen(false);
    document.documentElement.style.overflow = '';
    document.documentElement.style.position = '';
    document.documentElement.style.top = '';
    document.documentElement.style.width = '';
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    window.scrollTo(0, scrollYRef.current);
    const prev = previousActiveRef.current;
    if (prev && typeof prev.focus === 'function') {
      prev.focus();
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    scrollYRef.current = window.scrollY;
    previousActiveRef.current = document.activeElement as HTMLElement | null;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollYRef.current}px`;
    document.body.style.width = '100%';
    closeButtonRef.current?.focus();
    return () => {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      window.scrollTo(0, scrollYRef.current);
    };
  }, [isOpen]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) close();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, close]);

  useEffect(() => {
    if (isOpen && !cart.cart && !cart.isLoading) {
      fetchCartFromServer();
    }
  }, [isOpen]);

  const handleUpdateQuantity = (key: string, quantity: number): void => {
    if (quantity < 1) {
      removeCartItem(key);
    } else {
      updateCartItemQuantity(key, quantity);
    }
  };

  const handleRemoveItem = async (key: string): Promise<void> => {
    setRemovingKeys((prev) => new Set(prev).add(key));
    try {
      await removeCartItem(key);
    } finally {
      setRemovingKeys((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  const items = cart.cart?.contents?.nodes ?? [];
  const subtotal = cart.cart?.subtotal ? stripPriceHtml(cart.cart.subtotal) : '0.00 USD';
  const isEmpty = !cart.cart || cart.cart.itemCount === 0;

  return (
    <>
      {/* Backdrop - full screen on mobile, below header on desktop */}
      <div
        role="presentation"
        className="fixed inset-0 md:top-[73px] z-[70] bg-black/40 backdrop-blur-sm transition-opacity duration-300 ease-in-out"
        style={{
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
        }}
        aria-hidden={!isOpen}
        onClick={close}
      />

      {/* Panel - full height on mobile (top to bottom), below header on desktop */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Your cart"
        className="fixed right-0 top-0 bottom-0 md:top-[73px] z-[70] flex flex-col bg-white shadow-2xl transition-transform duration-300 ease-in-out w-full max-w-[450px]"
        style={{
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          visibility: isOpen ? 'visible' : 'hidden',
        }}
        aria-hidden={!isOpen}
      >
        {/* Header: YOUR CART + close X on the right */}
        <div className="flex items-center justify-between p-4 lg:p-6 border-b border-gray-200 shrink-0">
          <h2 className="text-lg font-bold uppercase text-black">YOUR CART</h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={close}
            className="text-black hover:opacity-70 transition-opacity cursor-pointer p-1"
            aria-label="Close cart"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable items or empty state */}
        <div className="flex-1 overflow-y-auto min-h-0 p-4 lg:p-6">
          {cart.error && (
            <p className="mb-4 text-sm text-red-600 uppercase">{cart.error}</p>
          )}
          {cart.isLoading && !cart.cart ? (
            <p className="text-gray-500 text-sm uppercase">Loading...</p>
          ) : isEmpty ? (
            <div className="flex flex-col gap-4">
              <p className="text-gray-500 text-sm uppercase">Your cart is empty.</p>
              <a
                href="/products"
                className="text-sm uppercase font-semibold text-black hover:opacity-70 transition-opacity cursor-pointer"
              >
                Continue shopping
              </a>
            </div>
          ) : (
            <ul className="space-y-6">
              {items.map((item: CartItem) => (
                <CartTrayItem
                  key={item.key}
                  item={item}
                  isHighlighted={highlightKeys.has(item.key)}
                  isRemoving={removingKeys.has(item.key)}
                  onUpdateQuantity={handleUpdateQuantity}
                  onRemove={handleRemoveItem}
                  stripPrice={stripPriceHtml}
                />
              ))}
            </ul>
          )}
        </div>

        {/* Subtotal + actions */}
        {!isEmpty && (
          <>
            <div className="border-t border-gray-200 px-4 lg:px-6 py-4 shrink-0">
              <div className="flex justify-between items-center text-sm uppercase">
                <span className="text-gray-600">SUBTOTAL</span>
                <span className="font-semibold text-black">{subtotal}</span>
              </div>
            </div>
            <div className="border-t border-gray-200 p-4 lg:p-6 flex flex-col gap-3 shrink-0">
              <a
                href="/cart"
                className="flex items-center justify-center gap-2 w-full py-4 px-6 bg-black text-white uppercase font-semibold rounded-lg hover:opacity-90 transition-opacity cursor-pointer"
              >
                TO SHOPPING CART
                <span aria-hidden="true">→</span>
              </a>
              <a
                href="/checkout"
                className="flex items-center justify-center w-full py-3 px-6 bg-white border border-gray-300 text-gray-700 uppercase text-sm font-semibold rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
              >
                TO CHECKOUT
              </a>
            </div>
          </>
        )}
      </div>
    </>
  );
}

interface CartTrayItemProps {
  item: CartItem;
  isHighlighted: boolean;
  isRemoving: boolean;
  onUpdateQuantity: (key: string, quantity: number) => void;
  onRemove: (key: string) => void;
  stripPrice: (price: string) => string;
}

function CartTrayItem({
  item,
  isHighlighted,
  isRemoving,
  onUpdateQuantity,
  onRemove,
  stripPrice,
}: CartTrayItemProps): JSX.Element {
  const product = item.product.node;
  const priceStr = item.total ? stripPrice(item.total) : product.price ? stripPrice(product.price) : '—';

  return (
    <li
      className={`flex gap-4 ${isHighlighted ? 'cart-tray-item-highlight' : ''} ${isRemoving ? 'opacity-50' : ''}`}
    >
      {product.image?.sourceUrl && (
        <a
          href={`/products/${product.slug}`}
          className="shrink-0 block"
          aria-label={`View ${product.name}`}
        >
          <img
            src={product.image.sourceUrl}
            alt={product.image.altText || product.name}
            className="w-20 h-20 object-cover bg-gray-100 hover:opacity-90 transition-opacity"
          />
        </a>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start gap-2">
          <a
            href={`/products/${product.slug}`}
            className="text-sm font-semibold uppercase text-black truncate hover:opacity-70 transition-opacity cursor-pointer"
          >
            {product.name}
          </a>
          <span className="text-sm text-black shrink-0">{priceStr}</span>
        </div>
        <p className="text-xs text-gray-400 mt-0.5">VAT EXCLUDED / EXCL. SHIPPING</p>
        <div className="mt-1 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-black">
            <span>Qty:</span>
            <button
              type="button"
              onClick={() => onUpdateQuantity(item.key, item.quantity - 1)}
              disabled={isRemoving || item.quantity <= 1}
              className="font-semibold hover:opacity-70 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              aria-label="Decrease quantity"
            >
              −
            </button>
            <span>{item.quantity}</span>
            <button
              type="button"
              onClick={() => onUpdateQuantity(item.key, item.quantity + 1)}
              disabled={isRemoving}
              className="font-semibold hover:opacity-70 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>
          <button
            type="button"
            onClick={() => onRemove(item.key)}
            disabled={isRemoving}
            className="text-xs text-orange-600 hover:text-orange-700 uppercase cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            {isRemoving ? 'Removing...' : '× REMOVE'}
          </button>
        </div>
      </div>
    </li>
  );
}
