/**
 * In dev, serve product pages at /products/:slug so the URL matches production.
 * Production uses Vercel rewrite to /api/product-page?slug=:slug.
 */
import { defineMiddleware } from 'astro:middleware';
import { getProductBySlug } from '@lib/db/queries';
import { buildProductPageHtml } from '@lib/product-page-html';

export const onRequest = defineMiddleware(async ({ request, locals }, next) => {
  const url = new URL(request.url);
  const match = url.pathname.match(/^\/products\/([^/]+)$/);
  if (request.method === 'GET' && match) {
    const slug = match[1];
    try {
      const product = await getProductBySlug(slug);
      if (!product) return next();
      const html = buildProductPageHtml(product);
      return new Response(html, {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    } catch {
      return next();
    }
  }
  return next();
});
