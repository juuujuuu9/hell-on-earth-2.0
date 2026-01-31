/**
 * PATCH /api/admin/product/[id] – update product (admin only).
 */

import type { APIRoute } from 'astro';
import { db } from '@lib/db';
import { products } from '@lib/db/schema';
import { eq } from 'drizzle-orm';
import { isAdminAuthenticated } from '@lib/admin-auth';

const STOCK_STATUSES = ['IN_STOCK', 'OUT_OF_STOCK', 'ON_BACKORDER'] as const;

export const PATCH: APIRoute = async ({ params, request }) => {
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

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const name = typeof body.name === 'string' ? body.name.trim() : undefined;
  const slug = typeof body.slug === 'string' ? body.slug.trim() : undefined;
  const price = body.price != null ? (typeof body.price === 'string' ? body.price.trim() || null : null) : undefined;
  const regularPrice = body.regularPrice != null ? (typeof body.regularPrice === 'string' ? body.regularPrice.trim() || null : null) : undefined;
  const salePrice = body.salePrice != null ? (typeof body.salePrice === 'string' ? body.salePrice.trim() || null : null) : undefined;
  const onSale = typeof body.onSale === 'boolean' ? body.onSale : undefined;
  const stockStatus = typeof body.stockStatus === 'string' && STOCK_STATUSES.includes(body.stockStatus as (typeof STOCK_STATUSES)[number])
    ? (body.stockStatus as (typeof STOCK_STATUSES)[number])
    : undefined;
  const rawQty = body.stockQuantity;
  const stockQuantity =
    rawQty != null
      ? typeof rawQty === 'number' && Number.isInteger(rawQty)
        ? rawQty
        : typeof rawQty === 'string'
          ? (() => {
              const n = parseInt(rawQty, 10);
              return Number.isInteger(n) ? n : null;
            })()
          : null
      : undefined;

  const updates: {
    name?: string;
    slug?: string;
    price?: string | null;
    regularPrice?: string | null;
    salePrice?: string | null;
    onSale?: boolean;
    stockStatus?: (typeof STOCK_STATUSES)[number];
    stockQuantity?: number | null;
    updatedAt?: Date;
  } = { updatedAt: new Date() };
  if (name !== undefined) updates.name = name;
  if (slug !== undefined) updates.slug = slug;
  if (price !== undefined) updates.price = price;
  if (regularPrice !== undefined) updates.regularPrice = regularPrice;
  if (salePrice !== undefined) updates.salePrice = salePrice;
  if (onSale !== undefined) updates.onSale = onSale;
  if (stockStatus !== undefined) updates.stockStatus = stockStatus;
  if (stockQuantity !== undefined) updates.stockQuantity = stockQuantity;

  if (Object.keys(updates).length === 1) {
    return new Response(JSON.stringify({ error: 'No valid fields to update' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const result = await db.update(products).set(updates).where(eq(products.id, id)).returning({ id: products.id });
    if (result.length === 0) {
      return new Response(JSON.stringify({ error: 'Product not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Admin PATCH product:', err);
    return new Response(JSON.stringify({ error: 'Update failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
