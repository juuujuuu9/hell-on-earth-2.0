/**
 * DELETE /api/cart/items/[key] - Remove line from cart by key (productId or productId-size)
 */
export const prerender = false;

import type { APIRoute } from 'astro';
import {
  getCartIdFromRequest,
  getCartForApp,
  updateCartItemByKey,
} from '@lib/db/queries';
import { checkRateLimit, getClientId } from '@lib/rateLimit';

function jsonResponse(data: object, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const DELETE: APIRoute = async ({ request, params }) => {
  // Rate limit: 50 deletions per minute per client
  const rateLimit = checkRateLimit(getClientId(request), { maxRequests: 50, windowMs: 60000 });
  if (!rateLimit.allowed) {
    return jsonResponse({ error: 'Rate limit exceeded' }, 429);
  }

  try {
    const cartId = getCartIdFromRequest(request);
    if (!cartId) {
      return jsonResponse({ error: 'No cart' }, 400);
    }
    const key = params.key;
    if (!key) {
      return jsonResponse({ error: 'key is required' }, 400);
    }
    await updateCartItemByKey(cartId, decodeURIComponent(key), 0);
    const cart = await getCartForApp(cartId);
    return jsonResponse({ cart });
  } catch (err) {
    console.error('DELETE /api/cart/items/[key]:', err);
    return jsonResponse({ error: 'Failed to remove item' }, 500);
  }
};
