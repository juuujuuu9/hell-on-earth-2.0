/**
 * Serves product page HTML so we can avoid building the Astro product page
 * (which triggers compiler panic). Vercel rewrites /products/:slug to this.
 */
import type { APIRoute } from 'astro';
import { getProductBySlug, getRelatedProducts } from '@lib/db/queries';
import { buildProductPageHtml } from '@lib/product-page-html';

export const GET: APIRoute = async ({ url }) => {
  const slug = url.searchParams.get('slug');
  if (!slug) {
    return new Response('Missing slug', { status: 400 });
  }

  const product = await getProductBySlug(slug);
  if (!product) {
    return new Response('Not found', { status: 404 });
  }

  const relatedProducts = await getRelatedProducts(slug, 10);
  const html = buildProductPageHtml(product, relatedProducts);
  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
};
