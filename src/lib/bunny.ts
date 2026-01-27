/**
 * Bunny.net CDN Integration
 * 
 * For uploading and managing product images
 */

/**
 * Upload an image to Bunny.net storage
 * 
 * @param file - File buffer or path
 * @param filename - Desired filename in storage
 * @returns CDN URL of uploaded image
 */
export async function uploadImageToBunny(
  file: Buffer | string,
  filename: string
): Promise<string> {
  const apiKey = process.env.BUNNY_API_KEY;
  const storageZone = process.env.BUNNY_STORAGE_ZONE;
  const cdnUrl = process.env.BUNNY_CDN_URL;

  if (!apiKey || !storageZone || !cdnUrl) {
    throw new Error('Bunny.net credentials not configured. Check BUNNY_API_KEY, BUNNY_STORAGE_ZONE, and BUNNY_CDN_URL environment variables.');
  }

  // Read file if it's a path
  const fileBuffer = typeof file === 'string' 
    ? await Bun.file(file).arrayBuffer().then(buf => Buffer.from(buf))
    : file;

  // Upload to Bunny.net storage
  const uploadUrl = `https://storage.bunnycdn.com/${storageZone}/${filename}`;
  
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'AccessKey': apiKey,
      'Content-Type': 'image/jpeg', // Adjust based on file type
    },
    body: fileBuffer,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to upload to Bunny.net: ${response.status} ${errorText}`);
  }

  // Return CDN URL
  return `${cdnUrl}/${filename}`;
}

/**
 * Delete an image from Bunny.net storage
 */
export async function deleteImageFromBunny(filename: string): Promise<void> {
  const apiKey = process.env.BUNNY_API_KEY;
  const storageZone = process.env.BUNNY_STORAGE_ZONE;

  if (!apiKey || !storageZone) {
    throw new Error('Bunny.net credentials not configured');
  }

  const deleteUrl = `https://storage.bunnycdn.com/${storageZone}/${filename}`;
  
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
