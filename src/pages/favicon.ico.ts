/**
 * Favicon API Route
 *
 * Serves favicon.ico from public directory.
 * RULE-013: Critical static files may need API routes on Vercel.
 */

import type { APIRoute } from 'astro';
import { readFileSync, existsSync } from 'fs';
import path from 'path';

// Resolve from project root (cwd at build and in Vercel serverless)
const faviconPath = path.join(process.cwd(), 'public', 'favicon.ico');

export const GET: APIRoute = async () => {
  try {
    if (!existsSync(faviconPath)) {
      return new Response('Favicon not found', {
        status: 404,
        headers: { 'Content-Type': 'text/plain' },
      });
    }
    const favicon = readFileSync(faviconPath);
    
    return new Response(favicon, {
      status: 200,
      headers: {
        'Content-Type': 'image/x-icon',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return new Response('Favicon not found', {
      status: 404,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
};
