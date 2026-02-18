/**
 * GET /api/cart - Get current cart (create cart and set cookie if none)
 * PATCH /api/cart - Update line quantity or remove (body: { key, quantity })
 */
export const prerender = false;

import type { APIRoute } from 'astro';
import {
  getCartIdFromRequest,
  createCart,
  getCartForApp,
  updateCartItemByKey,
  CART_COOKIE_NAME,
  CART_COOKIE_MAX_AGE,
} from '@lib/db/queries';
import { checkRateLimit, getClientId } from '@lib/rateLimit';

function jsonResponse(data: object, status = 200, headers?: HeadersInit): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

export const GET: APIRoute = async ({ request }) => {
  // Rate limit: 100 requests per minute per client
  const rateLimit = checkRateLimit(getClientId(request), { maxRequests: 100, windowMs: 60000 });
  if (!rateLimit.allowed) {
    return jsonResponse({ error: 'Rate limit exceeded' }, 429);
  }

  try {
    let cartId = getCartIdFromRequest(request);
    if (!cartId) {
      cartId = await createCart();
    }
    const cart = await getCartForApp(cartId);
    const res = jsonResponse(cart);
    if (!getCartIdFromRequest(request)) {
      res.headers.set(
        'Set-Cookie',
        `${CART_COOKIE_NAME}=${cartId}; Path=/; Max-Age=${CART_COOKIE_MAX_AGE}; SameSite=Lax; HttpOnly`
      );
    }
    return res;
  } catch (err) {
    console.error('GET /api/cart:', err);
    return jsonResponse({ error: 'Failed to load cart' }, 500);
  }
};

export const PATCH: APIRoute = async ({ request }) => {
  // Rate limit: 50 updates per minute per client
  const rateLimit = checkRateLimit(getClientId(request), { maxRequests: 50, windowMs: 60000 });
  if (!rateLimit.allowed) {
    return jsonResponse({ error: 'Rate limit exceeded' }, 429);
  }

  try {
    const cartId = getCartIdFromRequest(request);
    if (!cartId) {
      return jsonResponse({ error: 'No cart' }, 400);
    }
    let body: { key?: string; quantity?: number };
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: 'Invalid JSON' }, 400);
    }
    const { key, quantity } = body;
    if (!key || typeof key !== 'string') {
      return jsonResponse({ error: 'key is required' }, 400);
    }
    const qty = typeof quantity === 'number' ? Math.max(0, Math.min(99, Math.floor(quantity))) : 0;
    await updateCartItemByKey(cartId, key, qty);
    const cart = await getCartForApp(cartId);
    return jsonResponse({ cart });
  } catch (err) {
    console.error('PATCH /api/cart:', err);
    return jsonResponse({ error: 'Failed to update cart' }, 500);
  }
};
