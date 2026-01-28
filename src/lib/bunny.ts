/**
 * Bunny.net CDN Integration
 * 
 * For uploading and managing product images
 */

import { readFile } from 'fs/promises';
import { extname } from 'path';

/**
 * Get MIME type from file extension
 */
function getMimeType(filename: string): string {
  const ext = extname(filename).toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.avif': 'image/avif',
  };
  return mimeTypes[ext] || 'image/jpeg';
}

/**
 * Upload an image to Bunny.net storage
 * 
 * @param file - File buffer or file path
 * @param filename - Desired filename in storage (include path if needed, e.g., 'products/image.jpg')
 * @returns CDN URL of uploaded image
 */
export async function uploadImageToBunny(
  file: Buffer | string,
  filename: string
): Promise<string> {
  const apiKey = process.env.BUNNY_API_KEY;
  const storageZone = process.env.BUNNY_STORAGE_ZONE;
  const cdnUrl = process.env.BUNNY_CDN_URL;
  const storageEndpoint = process.env.BUNNY_STORAGE_ENDPOINT || 'storage.bunnycdn.com';

  if (!apiKey || !storageZone) {
    throw new Error('Bunny.net credentials not configured. Check BUNNY_API_KEY and BUNNY_STORAGE_ZONE environment variables.');
  }

  // Read file if it's a path
  const fileBuffer = typeof file === 'string' 
    ? await readFile(file)
    : file;

  // Get MIME type from filename
  const contentType = getMimeType(filename);

  // Upload to Bunny.net storage
  // Remove leading slash from filename if present
  const cleanFilename = filename.startsWith('/') ? filename.slice(1) : filename;
  
  // Use regional endpoint (e.g., ny.storage.bunnycdn.com for New York)
  // Format: https://{region}.storage.bunnycdn.com/{storageZone}/{path}
  const uploadUrl = `https://${storageEndpoint}/${storageZone}/${cleanFilename}`;
  
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'AccessKey': apiKey,
      'Content-Type': contentType,
    },
    body: fileBuffer,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to upload to Bunny.net: ${response.status} ${errorText}`);
  }

  // Return public URL for the file
  // Note: Requires a Pull Zone (CDN) to be set up in Bunny.net
  // The CDN URL should be in format: https://[pull-zone-name].b-cdn.net
  const encodedPath = cleanFilename.split('/').map(segment => encodeURIComponent(segment)).join('/');
  
  if (cdnUrl) {
    const cleanCdnUrl = cdnUrl.endsWith('/') ? cdnUrl.slice(0, -1) : cdnUrl;
    return `${cleanCdnUrl}/${encodedPath}`;
  } else {
    // If no CDN URL configured, return a placeholder
    // User needs to set up a Pull Zone in Bunny.net
    throw new Error('BUNNY_CDN_URL not configured. Please set up a Pull Zone in Bunny.net and configure BUNNY_CDN_URL.');
  }
}

/**
 * Delete an image from Bunny.net storage
 * 
 * @param filename - Filename in storage (include path if needed)
 */
export async function deleteImageFromBunny(filename: string): Promise<void> {
  const apiKey = process.env.BUNNY_API_KEY;
  const storageZone = process.env.BUNNY_STORAGE_ZONE;
  const storageEndpoint = process.env.BUNNY_STORAGE_ENDPOINT || 'storage.bunnycdn.com';

  if (!apiKey || !storageZone) {
    throw new Error('Bunny.net credentials not configured');
  }

  // Remove leading slash from filename if present
  const cleanFilename = filename.startsWith('/') ? filename.slice(1) : filename;
  const deleteUrl = `https://${storageEndpoint}/${storageZone}/${cleanFilename}`;
  
  const response = await fetch(deleteUrl, {
    method: 'DELETE',
    headers: {
      'AccessKey': apiKey,
    },
  });

  if (!response.ok && response.status !== 404) {
    const errorText = await response.text();
    throw new Error(`Failed to delete from Bunny.net: ${response.status} ${errorText}`);
  }
}

/**
 * Test Bunny.net connection and credentials
 */
export async function testBunnyConnection(): Promise<{ success: boolean; message: string }> {
  const apiKey = process.env.BUNNY_API_KEY;
  const storageZone = process.env.BUNNY_STORAGE_ZONE;
  const storageEndpoint = process.env.BUNNY_STORAGE_ENDPOINT || 'storage.bunnycdn.com';

  if (!apiKey || !storageZone) {
    return {
      success: false,
      message: 'Missing Bunny.net credentials. Check BUNNY_API_KEY and BUNNY_STORAGE_ZONE environment variables.',
    };
  }

  try {
    // Test by uploading a small test file
    const testContent = Buffer.from('test');
    const testFilename = `test-${Date.now()}.txt`;
    
    const uploadUrl = `https://${storageEndpoint}/${storageZone}/${testFilename}`;
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'AccessKey': apiKey,
        'Content-Type': 'text/plain',
      },
      body: testContent,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      return {
        success: false,
        message: `Upload test failed: ${uploadResponse.status} ${uploadResponse.statusText}. ${errorText}`,
      };
    }

    // Clean up: delete the test file
    try {
      await fetch(uploadUrl, {
        method: 'DELETE',
        headers: {
          'AccessKey': apiKey,
        },
      });
    } catch {
      // Ignore cleanup errors
    }

    return {
      success: true,
      message: 'Bunny.net connection successful! Credentials are valid.',
    };
  } catch (error) {
    return {
      success: false,
      message: `Connection error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}
