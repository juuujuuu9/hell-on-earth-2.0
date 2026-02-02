/**
 * Middleware. Product pages are served by the Astro route (pages/products/[slug].astro).
 */
import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware(async (_context, next) => {
  return next();
});
