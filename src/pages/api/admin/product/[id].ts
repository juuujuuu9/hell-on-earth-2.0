/**
 * Admin API - Product Management
 * PATCH /api/admin/product/[id] – update product
 * DELETE /api/admin/product/[id] – soft delete product
 * POST /api/admin/product/[id]/restore – restore deleted product
 */

export const prerender = false;

import type { APIRoute } from 'astro';
import { db } from '@lib/db';
import { products, productSizeInventory } from '@lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { isAdminAuthenticated, createSessionCookie } from '@lib/admin-auth';
import { validateCsrfToken } from '@lib/csrf';
import { softDeleteProduct, restoreProduct, hardDeleteProduct } from '@lib/db/queries';
import DOMPurify from 'isomorphic-dompurify';

const STOCK_STATUSES = ['IN_STOCK', 'OUT_OF_STOCK', 'ON_BACKORDER'] as const;

/** Sanitize HTML content to prevent XSS */
function sanitizeHtml(dirty: string | null | undefined): string | null {
  if (!dirty) return null;
  const clean = DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'b', 'em', 'i', 'u', 'strike', 's',
      'a', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'blockquote', 'code', 'pre'
    ],
    ALLOWED_ATTR: ['href', 'title', 'target', 'rel'],
  });
  return clean || null;
}

/** Helper to get session cookie header if needed */
function getSessionCookieHeader(auth: boolean | { setCookie: true }): string | undefined {
  if (auth && typeof auth === 'object' && auth.setCookie) {
    const { name, value, options } = createSessionCookie();
    return `${name}=${value}; ${options}`;
  }
  return undefined;
}

/** Standard unauthorized response */
function unauthorizedResponse(): Response {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: { 
      'Content-Type': 'application/json',
      'WWW-Authenticate': 'Basic realm="Admin"'
    },
  });
}

/** Standard CSRF error response */
function csrfResponse(): Response {
  return new Response(
    JSON.stringify({ error: 'Invalid CSRF token' }),
    { status: 403, headers: { 'Content-Type': 'application/json' } }
  );
}

export const PATCH: APIRoute = async ({ params, request }) => {
  // Auth check
  const auth = isAdminAuthenticated(request);
  if (auth === false) return unauthorizedResponse();
  
  // CSRF check
  if (!validateCsrfToken(request)) return csrfResponse();

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

  const description = typeof body.description === 'string' ? sanitizeHtml(body.description) : undefined;
  const shortDescription = typeof body.shortDescription === 'string' ? sanitizeHtml(body.shortDescription) : undefined;
  const materials = typeof body.materials === 'string' ? sanitizeHtml(body.materials) : undefined;
  const features = typeof body.features === 'string' ? sanitizeHtml(body.features) : undefined;
  const details = typeof body.details === 'string' ? sanitizeHtml(body.details) : undefined;
  
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
    description?: string | null;
    shortDescription?: string | null;
    materials?: string | null;
    features?: string | null;
    details?: string | null;
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
  if (description !== undefined) updates.description = description;
  if (shortDescription !== undefined) updates.shortDescription = shortDescription;
  if (materials !== undefined) updates.materials = materials;
  if (features !== undefined) updates.features = features;
  if (details !== undefined) updates.details = details;

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

    const response = new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
    
    const cookie = getSessionCookieHeader(auth);
    if (cookie) response.headers.set('Set-Cookie', cookie);
    return response;
    
  } catch (err) {
    console.error('Admin PATCH product:', err);
    return new Response(JSON.stringify({ error: 'Update failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const DELETE: APIRoute = async ({ params, request }) => {
  // Auth check
  const auth = isAdminAuthenticated(request);
  if (auth === false) return unauthorizedResponse();
  
  // CSRF check
  if (!validateCsrfToken(request)) return csrfResponse();

  const id = params?.id;
  if (!id) {
    return new Response(JSON.stringify({ error: 'Product ID required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const url = new URL(request.url);
  const permanent = url.searchParams.get('permanent') === 'true';

  try {
    if (permanent) {
      // Hard delete with extra safety - must be soft-deleted first
      const product = await db.query.products.findFirst({
        where: eq(products.id, id),
      });

      if (!product) {
        return new Response(JSON.stringify({ error: 'Product not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (!product.isDeleted) {
        return new Response(
          JSON.stringify({
            error: 'Product must be soft-deleted before permanent deletion',
            message: 'Delete the product first, then permanently delete from trash',
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      await hardDeleteProduct(id);
      
      const response = new Response(
        JSON.stringify({ success: true, message: 'Product permanently deleted' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
      
      const cookie = getSessionCookieHeader(auth);
      if (cookie) response.headers.set('Set-Cookie', cookie);
      return response;
      
    } else {
      // Soft delete (default)
      const success = await softDeleteProduct(id, 'admin');
      
      if (!success) {
        return new Response(JSON.stringify({ error: 'Product not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      
      const response = new Response(
        JSON.stringify({ success: true, message: 'Product moved to trash' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
      
      const cookie = getSessionCookieHeader(auth);
      if (cookie) response.headers.set('Set-Cookie', cookie);
      return response;
    }
  } catch (err) {
    console.error('Admin DELETE product:', err);
    return new Response(
      JSON.stringify({ error: 'Delete failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

/** Restore a soft-deleted product */
export const POST: APIRoute = async ({ params, request }) => {
  // Auth check
  const auth = isAdminAuthenticated(request);
  if (auth === false) return unauthorizedResponse();
  
  // CSRF check
  if (!validateCsrfToken(request)) return csrfResponse();

  const id = params?.id;
  if (!id) {
    return new Response(JSON.stringify({ error: 'Product ID required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const success = await restoreProduct(id);
    
    if (!success) {
      return new Response(JSON.stringify({ error: 'Product not found or not deleted' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    const response = new Response(
      JSON.stringify({ success: true, message: 'Product restored' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
    
    const cookie = getSessionCookieHeader(auth);
    if (cookie) response.headers.set('Set-Cookie', cookie);
    return response;
    
  } catch (err) {
    console.error('Admin restore product:', err);
    return new Response(
      JSON.stringify({ error: 'Restore failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
