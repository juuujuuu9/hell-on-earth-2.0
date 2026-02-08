/**
 * POST /api/cart/add - Add item to cart (body: { productId, quantity?, size? })
 * Returns { cart, addedKey }
 */
export const prerender = false;

import type { APIRoute } from 'astro';
import {
  getCartIdFromRequest,
  createCart,
  getCartForApp,
  addCartItem,
  CART_COOKIE_NAME,
  CART_COOKIE_MAX_AGE,
} from '@lib/db/queries';

function jsonResponse(data: object, status = 200, headers?: HeadersInit): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

export const POST: APIRoute = async ({ request }) => {
  try {
    let cartId = getCartIdFromRequest(request);
    if (!cartId) {
      cartId = await createCart();
    }
    let body: { productId?: string; quantity?: number; size?: string };
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: 'Invalid JSON' }, 400);
    }
    const { productId, quantity = 1, size } = body;
    if (!productId || typeof productId !== 'string') {
      return jsonResponse({ error: 'productId is required' }, 400);
    }
    const qty = Math.max(1, Math.min(99, Math.floor(Number(quantity)) || 1));
    const sizeVal = size != null && typeof size === 'string' ? size : null;
    const addedKey = await addCartItem(cartId, productId, qty, sizeVal);
    const cart = await getCartForApp(cartId);
    const res = jsonResponse({ cart, addedKey });
    if (!getCartIdFromRequest(request)) {
      res.headers.set(
        'Set-Cookie',
        `${CART_COOKIE_NAME}=${cartId}; Path=/; Max-Age=${CART_COOKIE_MAX_AGE}; SameSite=Lax; HttpOnly`
      );
    }
    return res;
  } catch (err) {
    console.error('POST /api/cart/add:', err);
    return jsonResponse({ error: 'Failed to add to cart' }, 500);
  }
};
