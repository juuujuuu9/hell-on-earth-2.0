/**
 * GET /api/product/[slug]/sizes – current size inventory for a product (public).
 * Used by PDP to reflect live inventory so size swatches stay in sync after admin edits.
 */

export const prerender = false;

import type { APIRoute } from 'astro';
import { db } from '@lib/db';
import { products, productSizeInventory } from '@lib/db/schema';
import { eq, asc } from 'drizzle-orm';

const LETTER_SIZE_ORDER: Record<string, number> = {
  XXS: 0, XS: 1, S: 2, M: 3, L: 4, XL: 5,
  XXL: 6, '2XL': 6, '3XL': 7, '4XL': 8,
};

function sortSizes(
  list: { size: string; quantity: number }[]
): { size: string; quantity: number }[] {
  return [...list].sort((a, b) => {
    const sa = a.size.trim();
    const sb = b.size.trim();
    if (sa.toLowerCase() === 'one size' && sb.toLowerCase() !== 'one size') return 1;
    if (sb.toLowerCase() === 'one size' && sa.toLowerCase() !== 'one size') return -1;
    if (sa.toLowerCase() === 'one size' && sb.toLowerCase() === 'one size') return 0;
    const numA = parseFloat(sa.replace(/[^\d.]/g, ''));
    const numB = parseFloat(sb.replace(/[^\d.]/g, ''));
    const aIsNum = !Number.isNaN(numA) && sa.match(/\d/);
    const bIsNum = !Number.isNaN(numB) && sb.match(/\d/);
    if (aIsNum && bIsNum) return numA - numB;
    if (aIsNum && !bIsNum) return -1;
    if (!aIsNum && bIsNum) return 1;
    const orderA = LETTER_SIZE_ORDER[sa.toUpperCase()] ?? 999;
    const orderB = LETTER_SIZE_ORDER[sb.toUpperCase()] ?? 999;
    return orderA - orderB;
  });
}

export const GET: APIRoute = async ({ params }) => {
  const slug = params?.slug;
  if (!slug) {
    return new Response(JSON.stringify({ error: 'Slug required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const productRow = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.slug, slug))
      .limit(1);

    if (productRow.length === 0) {
      return new Response(JSON.stringify({ error: 'Product not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const productId = productRow[0].id;
    const rows = await db
      .select({ size: productSizeInventory.size, quantity: productSizeInventory.quantity })
      .from(productSizeInventory)
      .where(eq(productSizeInventory.productId, productId))
      .orderBy(asc(productSizeInventory.size));

    const sizes = sortSizes(rows.map((r) => ({ size: r.size, quantity: r.quantity })));

    return new Response(JSON.stringify({ sizes }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60',
      },
    });
  } catch (err) {
    console.error('GET product sizes:', err);
    return new Response(JSON.stringify({ error: 'Failed to load sizes' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
