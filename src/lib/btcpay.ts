/**
 * BTCPay Server Integration (Greenfield API)
 *
 * Creates invoices for Bitcoin/Lightning payments.
 * Used alongside Stripe for payment method choice at checkout.
 */

const BTCPAY_SERVER_URL = process.env.BTCPAY_SERVER_URL?.replace(/\/$/, '');
const BTCPAY_STORE_ID = process.env.BTCPAY_STORE_ID;
const BTCPAY_API_KEY = process.env.BTCPAY_API_KEY;

export function isBtcpayConfigured(): boolean {
  return Boolean(BTCPAY_SERVER_URL && BTCPAY_STORE_ID && BTCPAY_API_KEY);
}

export interface CreateInvoiceParams {
  amount: number;
  currency: string;
  orderId: string;
  metadata?: Record<string, string>;
  redirectUrl?: string;
}

export interface CreateInvoiceResult {
  id: string;
  checkoutLink: string;
}

/**
 * Create a BTCPay Server invoice for payment
 */
export async function createInvoice(params: CreateInvoiceParams): Promise<CreateInvoiceResult> {
  if (!BTCPAY_SERVER_URL || !BTCPAY_STORE_ID || !BTCPAY_API_KEY) {
    throw new Error('BTCPay Server is not configured. Set BTCPAY_SERVER_URL, BTCPAY_STORE_ID, and BTCPAY_API_KEY.');
  }

  const payload: Record<string, unknown> = {
    amount: params.amount,
    currency: params.currency,
    metadata: {
      orderId: params.orderId,
      ...params.metadata,
    },
  };

  if (params.redirectUrl) {
    payload.checkout = { redirectURL: params.redirectUrl };
  }

  const response = await fetch(
    `${BTCPAY_SERVER_URL}/api/v1/stores/${BTCPAY_STORE_ID}/invoices`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `token ${BTCPAY_API_KEY}`,
      },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`BTCPay API error (${response.status}): ${errText}`);
  }

  const data = (await response.json()) as { id: string; checkoutLink?: string };
  const checkoutLink = data.checkoutLink;

  if (!checkoutLink) {
    throw new Error('BTCPay invoice created but no checkoutLink in response');
  }

  return { id: data.id, checkoutLink };
}
