/**
 * Favicon API Route
 * 
 * Serves favicon.ico from public directory.
 * RULE-013: Critical static files may need API routes on Vercel.
 */

import type { APIRoute } from 'astro';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const faviconPath = path.join(__dirname, '../../public/favicon.ico');

export const GET: APIRoute = async () => {
  try {
    const favicon = readFileSync(faviconPath);
    
    return new Response(favicon, {
      status: 200,
      headers: {
        'Content-Type': 'image/x-icon',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Error serving favicon:', error);
    return new Response('Favicon not found', {
      status: 404,
    });
  }
};
