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
  getProductById,
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

export const POST: APIRoute = async ({ request }) => {
  // Rate limit: 50 requests per minute per client
  const rateLimit = checkRateLimit(getClientId(request), { maxRequests: 50, windowMs: 60000 });
  if (!rateLimit.allowed) {
    return jsonResponse({ error: 'Rate limit exceeded. Please try again later.' }, 429, {
      'X-RateLimit-Limit': '50',
      'X-RateLimit-Remaining': '0',
      'X-RateLimit-Reset': String(Math.ceil(rateLimit.resetAt / 1000)),
    });
  }

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

    // Validate product exists and check stock
    const product = await getProductById(productId);
    if (!product) {
      return jsonResponse({ error: 'Product not found' }, 404);
    }

    // Check if product is in stock
    if (product.stockStatus === 'OUT_OF_STOCK') {
      return jsonResponse({ error: 'Product is out of stock' }, 400);
    }

    // Check size-specific stock if size is provided
    if (sizeVal && product.sizes && product.sizes.length > 0) {
      const sizeStock = product.sizes.find(s => s.size === sizeVal);
      if (!sizeStock) {
        return jsonResponse({ error: `Size ${sizeVal} not available for this product` }, 400);
      }
      if (sizeStock.quantity < qty) {
        return jsonResponse({ error: `Only ${sizeStock.quantity} available in size ${sizeVal}` }, 400);
      }
    } else if (product.stockQuantity != null && product.stockQuantity < qty) {
      // Check general stock if no sizes
      return jsonResponse({ error: `Only ${product.stockQuantity} available` }, 400);
    }

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
