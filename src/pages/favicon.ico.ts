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

// Get project root directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Resolve path relative to this file's location
const faviconPath = path.resolve(__dirname, '../../public/favicon.ico');

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
    console.error('Favicon path attempted:', faviconPath);
    return new Response('Favicon not found', {
      status: 404,
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  }
};
