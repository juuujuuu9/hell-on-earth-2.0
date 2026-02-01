/**
 * API Route: BTCPay Server webhook handler
 *
 * Validates webhook signature and updates order status.
 * Configure webhook URL in BTCPay: Store Settings → Webhooks
 */

import type { APIRoute } from 'astro';
import { createHmac, timingSafeEqual } from 'crypto';
import { getOrderByBtcpayInvoiceId, updateBtcpayOrderStatus } from '@lib/db/queries';

const SIG_HEADER = 'BTCPAY-SIG';
const SIG_ALG = 'sha256';
const WEBHOOK_SECRET = process.env.BTCPAY_WEBHOOK_SECRET;

/** Map BTCPay event type to order status */
const EVENT_TO_STATUS: Record<string, 'pending' | 'processing' | 'settled' | 'expired' | 'invalid'> = {
  InvoiceProcessing: 'processing',
  InvoiceSettled: 'settled',
  InvoiceExpired: 'expired',
  InvoiceInvalid: 'invalid',
};

function verifyWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
  if (!WEBHOOK_SECRET || !signatureHeader) return false;

  const hmac = createHmac(SIG_ALG, WEBHOOK_SECRET);
  hmac.update(rawBody);
  const expected = `${SIG_ALG}=${hmac.digest('hex')}`;

  if (Buffer.byteLength(signatureHeader) !== Buffer.byteLength(expected)) return false;
  return timingSafeEqual(Buffer.from(signatureHeader, 'utf8'), Buffer.from(expected, 'utf8'));
}

export const POST: APIRoute = async ({ request }) => {
  if (!WEBHOOK_SECRET) {
    console.error('BTCPAY_WEBHOOK_SECRET not configured');
    return new Response('Webhook not configured', { status: 500 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get(SIG_HEADER);

  if (!verifyWebhookSignature(rawBody, signature)) {
    console.warn('BTCPay webhook: invalid signature');
    return new Response('Invalid signature', { status: 401 });
  }

  let payload: { type?: string; invoiceId?: string };
  try {
    payload = JSON.parse(rawBody) as { type?: string; invoiceId?: string };
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const { type: eventType, invoiceId } = payload;
  if (!invoiceId) {
    return new Response('Missing invoiceId', { status: 400 });
  }

  const status = eventType ? EVENT_TO_STATUS[eventType] : null;
  if (!status) {
    // Unknown event - acknowledge but don't update (e.g. InvoiceCreated)
    return new Response('OK', { status: 200 });
  }

  const order = await getOrderByBtcpayInvoiceId(invoiceId);
  if (!order) {
    console.warn(`BTCPay webhook: order not found for invoice ${invoiceId}`);
    return new Response('Order not found', { status: 404 });
  }

  await updateBtcpayOrderStatus(order.id, status);

  return new Response('OK', { status: 200 });
};
