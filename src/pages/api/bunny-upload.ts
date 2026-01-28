/**
 * API Route: Upload image to Bunny.net
 * 
 * Accepts multipart/form-data with 'image' field
 * Returns the CDN URL of the uploaded image
 */

import type { APIRoute } from 'astro';
import { uploadImageToBunny } from '@lib/bunny';

export const POST: APIRoute = async ({ request }) => {
  try {
    const formData = await request.formData();
    const file = formData.get('image') as File | null;

    if (!file) {
      return new Response(
        JSON.stringify({ error: 'No image file provided' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return new Response(
        JSON.stringify({ error: 'File must be an image' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return new Response(
        JSON.stringify({ error: 'File size exceeds 10MB limit' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Generate filename with timestamp to avoid collisions
    const timestamp = Date.now();
    const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_'); // Sanitize filename
    const filename = `products/${timestamp}-${originalName}`;

    // Upload to Bunny.net
    const cdnUrl = await uploadImageToBunny(buffer, filename);

    return new Response(
      JSON.stringify({ 
        success: true,
        url: cdnUrl,
        filename: filename,
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error uploading to Bunny.net:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to upload image',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }
};
