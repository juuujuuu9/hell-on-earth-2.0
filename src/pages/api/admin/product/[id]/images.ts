/**
 * GET /api/admin/product/[id]/images – list product images (admin only).
 * PATCH – update images (primary, order, url, alt). POST – add image. DELETE – remove image.
 */

export const prerender = false;

import type { APIRoute } from 'astro';
import { db } from '@lib/db';
import { products, productImages } from '@lib/db/schema';
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
    const rows = await db
      .select({
        id: productImages.id,
        imageUrl: productImages.imageUrl,
        altText: productImages.altText,
        isPrimary: productImages.isPrimary,
        sortOrder: productImages.sortOrder,
      })
      .from(productImages)
      .where(eq(productImages.productId, id))
      .orderBy(asc(productImages.sortOrder), asc(productImages.id));

    return new Response(JSON.stringify({ images: rows }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Admin GET product images:', err);
    return new Response(JSON.stringify({ error: 'Failed to load images' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

const imageUpdateSchema = {
  id: (v: unknown): v is string => typeof v === 'string' && v.length > 0,
  isPrimary: (v: unknown): v is boolean => typeof v === 'boolean',
  sortOrder: (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v),
  imageUrl: (v: unknown): v is string => typeof v === 'string',
  altText: (v: unknown): v is string => typeof v === 'string',
};

export const PATCH: APIRoute = async ({ params, request }) => {
  const auth = isAdminAuthenticated(request);
  if (auth === false) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const productId = params?.id;
  if (!productId) {
    return new Response(JSON.stringify({ error: 'Product ID required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body: { images?: unknown[] };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!Array.isArray(body.images)) {
    return new Response(JSON.stringify({ error: 'images array required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    for (const item of body.images as Record<string, unknown>[]) {
      if (!item || !imageUpdateSchema.id(item.id)) continue;
      const updates: { isPrimary?: boolean; sortOrder?: number; imageUrl?: string; altText?: string | null } = {};
      if (imageUpdateSchema.isPrimary(item.isPrimary)) updates.isPrimary = item.isPrimary;
      if (imageUpdateSchema.sortOrder(item.sortOrder)) updates.sortOrder = item.sortOrder;
      if (item.imageUrl !== undefined && imageUpdateSchema.imageUrl(item.imageUrl)) updates.imageUrl = item.imageUrl;
      if (item.altText !== undefined) updates.altText = item.altText === null || item.altText === '' ? null : String(item.altText);
      if (Object.keys(updates).length === 0) continue;

      await db
        .update(productImages)
        .set(updates)
        .where(and(eq(productImages.id, item.id as string), eq(productImages.productId, productId)));
    }
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Admin PATCH product images:', err);
    return new Response(JSON.stringify({ error: 'Update failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const POST: APIRoute = async ({ params, request }) => {
  const auth = isAdminAuthenticated(request);
  if (auth === false) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const productId = params?.id;
  if (!productId) {
    return new Response(JSON.stringify({ error: 'Product ID required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body: { imageUrl?: unknown; altText?: unknown; isPrimary?: unknown; sortOrder?: unknown };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (typeof body.imageUrl !== 'string' || !body.imageUrl.trim()) {
    return new Response(JSON.stringify({ error: 'imageUrl required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const productExists = (await db.select({ id: products.id }).from(products).where(eq(products.id, productId)).limit(1)).length > 0;
  if (!productExists) {
    return new Response(JSON.stringify({ error: 'Product not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const isPrimary = body.isPrimary === true;
  const sortOrder = typeof body.sortOrder === 'number' && Number.isInteger(body.sortOrder) ? body.sortOrder : 0;
  const altText = body.altText != null && body.altText !== '' ? String(body.altText).trim() : null;

  try {
    const imageId = crypto.randomUUID();
    await db.insert(productImages).values({
      id: imageId,
      productId,
      imageUrl: body.imageUrl.trim(),
      altText,
      isPrimary,
      sortOrder,
    });
    return new Response(JSON.stringify({ ok: true, id: imageId }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Admin POST product image:', err);
    return new Response(JSON.stringify({ error: 'Add failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const DELETE: APIRoute = async ({ params, request }) => {
  const auth = isAdminAuthenticated(request);
  if (auth === false) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const productId = params?.id;
  const url = new URL(request.url);
  const imageId = url.searchParams.get('imageId');
  if (!productId || !imageId) {
    return new Response(JSON.stringify({ error: 'Product ID and imageId required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const result = await db
      .delete(productImages)
      .where(and(eq(productImages.id, imageId), eq(productImages.productId, productId)))
      .returning({ id: productImages.id });
    if (result.length === 0) {
      return new Response(JSON.stringify({ error: 'Image not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Admin DELETE product image:', err);
    return new Response(JSON.stringify({ error: 'Delete failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
