/**
 * API Route: Get Stripe Checkout URL for a product
 * 
 * Returns the Stripe checkout URL stored in the database
 */

import type { APIRoute } from 'astro';
import { getProductStripeUrl } from '@lib/db/queries';

export const GET: APIRoute = async ({ url }) => {
  const productId = url.searchParams.get('productId');

  if (!productId) {
    return new Response(
      JSON.stringify({ error: 'Product ID is required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const checkoutUrl = await getProductStripeUrl(productId);

    if (!checkoutUrl) {
      return new Response(
        JSON.stringify({ error: 'Checkout URL not found for this product' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ checkoutUrl }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching Stripe checkout URL:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch checkout URL' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
