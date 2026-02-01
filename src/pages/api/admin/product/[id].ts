/**
 * PATCH /api/admin/product/[id] – update product (admin only).
 */

export const prerender = false;

import type { APIRoute } from 'astro';
import { db } from '@lib/db';
import { products, productSizeInventory } from '@lib/db/schema';
import { eq, and } from 'drizzle-orm';
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

  const sizeInventoryRaw = body.sizeInventory;
  const sizeInventory: Array<{ size: string; quantity: number }> | undefined =
    Array.isArray(sizeInventoryRaw) &&
    sizeInventoryRaw.every(
      (item: unknown) =>
        typeof item === 'object' &&
        item !== null &&
        'size' in item &&
        'quantity' in item &&
        typeof (item as { size: unknown }).size === 'string'
    )
      ? (sizeInventoryRaw as Array<{ size: string; quantity: unknown }>).map((item) => ({
          size: String(item.size).trim(),
          quantity: Math.max(0, Math.floor(Number(item.quantity))),
        }))
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

  if (Object.keys(updates).length === 1 && sizeInventory === undefined) {
    return new Response(JSON.stringify({ error: 'No valid fields to update' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    if (updates && Object.keys(updates).length > 1) {
      const result = await db.update(products).set(updates).where(eq(products.id, id)).returning({ id: products.id });
      if (result.length === 0) {
        return new Response(JSON.stringify({ error: 'Product not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    if (sizeInventory !== undefined) {
      const productExists =
        (await db.select({ id: products.id }).from(products).where(eq(products.id, id)).limit(1)).length > 0;
      if (!productExists) {
        return new Response(JSON.stringify({ error: 'Product not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      for (const { size, quantity: qty } of sizeInventory) {
        const existing = await db
          .select({ id: productSizeInventory.id })
          .from(productSizeInventory)
          .where(and(eq(productSizeInventory.productId, id), eq(productSizeInventory.size, size)))
          .limit(1);
        if (existing.length > 0) {
          await db
            .update(productSizeInventory)
            .set({ quantity: Math.max(0, qty), updatedAt: new Date() })
            .where(eq(productSizeInventory.id, existing[0].id));
        } else {
          await db.insert(productSizeInventory).values({
            id: crypto.randomUUID(),
            productId: id,
            size,
            quantity: qty,
          });
        }
      }
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
