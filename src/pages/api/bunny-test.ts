/**
 * API Route: Test Bunny.net connection
 * 
 * Verifies that Bunny.net credentials are configured correctly
 */

import type { APIRoute } from 'astro';
import { testBunnyConnection } from '@lib/bunny';

export const GET: APIRoute = async () => {
  const result = await testBunnyConnection();

  return new Response(
    JSON.stringify(result),
    { 
      status: result.success ? 200 : 400,
      headers: { 'Content-Type': 'application/json' } 
    }
  );
};
