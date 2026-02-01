/**
 * GET /api/admin/product/[id]/sizes – list size inventory for a product (admin only).
 */

export const prerender = false;

import type { APIRoute } from 'astro';
import { db } from '@lib/db';
import { productSizeInventory } from '@lib/db/schema';
import { eq, asc } from 'drizzle-orm';
import { isAdminAuthenticated } from '@lib/admin-auth';

export const GET: APIRoute = async ({ params, request }) => {
  const auth = isAdminAuthenticated(request);
  if (auth === false) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const id = params?.id;
  if (!id) {
    return new Response(JSON.stringify({ error: 'Product ID required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const rows = await db
      .select({ size: productSizeInventory.size, quantity: productSizeInventory.quantity })
      .from(productSizeInventory)
      .where(eq(productSizeInventory.productId, id))
      .orderBy(asc(productSizeInventory.size));

    return new Response(
      JSON.stringify({ sizes: rows.map((r) => ({ size: r.size, quantity: r.quantity })) }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Admin GET product sizes:', err);
    return new Response(JSON.stringify({ error: 'Failed to load sizes' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
