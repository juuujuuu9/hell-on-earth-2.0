/**
 * API Route: Create BTCPay invoice and return checkout URL
 *
 * POST body: { productId, quantity, size? }
 */

import type { APIRoute } from 'astro';
import { createInvoice, isBtcpayConfigured } from '@lib/btcpay';
import {
  getProductForCheckout,
  createBtcpayOrder,
} from '@lib/db/queries';
import { randomUUID } from 'crypto';

export const POST: APIRoute = async ({ request }) => {
  if (!isBtcpayConfigured()) {
    return new Response(
      JSON.stringify({ error: 'Bitcoin payment is not available' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }

  let body: { productId?: string; quantity?: number; size?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON body' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const { productId, quantity = 1, size } = body;

  if (!productId || typeof productId !== 'string') {
    return new Response(
      JSON.stringify({ error: 'productId is required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const qty = Math.max(1, Math.min(99, Math.floor(Number(quantity)) || 1));

  const product = await getProductForCheckout(productId);
  if (!product) {
    return new Response(
      JSON.stringify({ error: 'Product not found' }),
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const unitPrice = parseFloat(product.price);
  if (Number.isNaN(unitPrice) || unitPrice <= 0) {
    return new Response(
      JSON.stringify({ error: 'Product has no valid price' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const amount = Math.round(unitPrice * qty * 100) / 100;

  const orderId = randomUUID();
  const siteUrl = process.env.SITE_URL || process.env.PUBLIC_API_BASE_URL || '';
  const redirectUrl = siteUrl
    ? `${siteUrl.replace(/\/$/, '')}/order-confirmation?order=${orderId}`
    : undefined;

  try {
    const invoice = await createInvoice({
      amount,
      currency: 'USD',
      orderId,
      metadata: { productId, productName: product.name },
      redirectUrl,
    });

    await createBtcpayOrder({
      id: orderId,
      productId: product.id,
      productName: product.name,
      quantity: qty,
      size: typeof size === 'string' ? size : null,
      amount: amount.toFixed(2),
      currency: 'USD',
      btcpayInvoiceId: invoice.id,
    });

    return new Response(
      JSON.stringify({ checkoutUrl: invoice.checkoutLink, orderId }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('BTCPay checkout error:', err);
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : 'Failed to create payment',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
