/**
 * GET /api/admin/product/[id]/sizes – list size inventory for a product (admin only).
 * Merges inventory with Size attribute options so admins can set qty for all sizes.
 */

export const prerender = false;

import type { APIRoute } from 'astro';
import { db } from '@lib/db';
import { productSizeInventory, productAttributes } from '@lib/db/schema';
import { eq, asc, and } from 'drizzle-orm';
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
    const [inventoryRows, attributeRows] = await Promise.all([
      db
        .select({ size: productSizeInventory.size, quantity: productSizeInventory.quantity })
        .from(productSizeInventory)
        .where(eq(productSizeInventory.productId, id))
        .orderBy(asc(productSizeInventory.size)),
      db
        .select({ options: productAttributes.options })
        .from(productAttributes)
        .where(
          and(eq(productAttributes.productId, id), eq(productAttributes.name, 'Size'))
        ),
    ]);

    const inventoryMap = new Map(
      inventoryRows.map((r) => [r.size, r.quantity])
    );

    const sizeOptions: string[] = [];
    for (const attr of attributeRows) {
      if (attr.options) {
        try {
          const opts = JSON.parse(attr.options) as unknown;
          if (Array.isArray(opts)) {
            for (const o of opts) {
              if (typeof o === 'string' && !sizeOptions.includes(o)) sizeOptions.push(o);
            }
          }
        } catch {
          /* ignore */
        }
      }
    }

    const combined = new Map(inventoryMap);
    for (const size of sizeOptions) {
      if (!combined.has(size)) combined.set(size, 0);
    }
    if (combined.size === 0) {
      for (const [size, qty] of inventoryMap) {
        combined.set(size, qty);
      }
    }

    const sizes = Array.from(combined.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([size, quantity]) => ({ size, quantity }));

    return new Response(JSON.stringify({ sizes }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Admin GET product sizes:', err);
    return new Response(JSON.stringify({ error: 'Failed to load sizes' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
