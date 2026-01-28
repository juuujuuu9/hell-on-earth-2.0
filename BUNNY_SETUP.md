# Bunny.net Setup Guide

Bunny.net provides fast, affordable CDN storage for your product images.

## Quick Setup

### 1. Create Bunny.net Account

1. Go to [bunny.net](https://bunny.net) and sign up
2. Navigate to **Storage** → **Storage Zones**
3. Click **Add Storage Zone**
4. Choose a name (e.g., `hell-on-earth-images`)
5. Select a region close to your users
6. Click **Add Storage Zone**

### 2. Get Your Credentials

After creating the storage zone:

1. **API Key**: 
   - Go to **Storage** → **Storage Zones** → Your zone
   - Click **FTP & HTTP API**
   - Copy the **Password** (this is your API key)

2. **Storage Zone Name**: 
   - The name you chose (e.g., `hell-on-earth-images`)

3. **CDN URL**: 
   - Format: `https://[storage-zone-name].b-cdn.net`
   - Example: `https://hell-on-earth-images.b-cdn.net`
   - You can find this in the storage zone details

### 3. Configure Environment Variables

Add to your `.env.local` file:

```env
BUNNY_API_KEY=your-api-key-here
BUNNY_STORAGE_ZONE=hell-on-earth-images
BUNNY_CDN_URL=https://hell-on-earth-images.b-cdn.net
```

### 4. Test Connection

```bash
# Install tsx if needed
npm install -D tsx

# Test connection
npx tsx scripts/test-bunny.ts
```

Or test via API route (after starting dev server):

```bash
curl http://localhost:4321/api/bunny-test
```

## Usage

### Upload Images via API

**Endpoint**: `POST /api/bunny-upload`

**Request**:
```javascript
const formData = new FormData();
formData.append('image', fileInput.files[0]);

const response = await fetch('/api/bunny-upload', {
  method: 'POST',
  body: formData,
});

const data = await response.json();
console.log(data.url); // CDN URL
```

**Response**:
```json
{
  "success": true,
  "url": "https://your-storage-zone.b-cdn.net/products/1234567890-image.jpg",
  "filename": "products/1234567890-image.jpg"
}
```

### Upload Images Programmatically

```typescript
import { uploadImageToBunny } from '@lib/bunny';
import { readFile } from 'fs/promises';

// From file path
const imageUrl = await uploadImageToBunny(
  './public/image.jpg',
  'products/my-product.jpg'
);

// From buffer
const buffer = await readFile('./public/image.jpg');
const imageUrl2 = await uploadImageToBunny(
  buffer,
  'products/my-product.jpg'
);
```

### Delete Images

```typescript
import { deleteImageFromBunny } from '@lib/bunny';

await deleteImageFromBunny('products/my-product.jpg');
```

## File Organization

Recommended structure:

```
products/
  ├── product-1-main.jpg
  ├── product-1-gallery-1.jpg
  ├── product-2-main.jpg
  └── ...
```

Images are stored with timestamps to avoid collisions:
- Format: `products/[timestamp]-[original-name]`
- Example: `products/1706123456789-cool-t-shirt.jpg`

## Supported Image Formats

- JPEG (.jpg, .jpeg)
- PNG (.png)
- GIF (.gif)
- WebP (.webp)
- SVG (.svg)
- AVIF (.avif)

## File Size Limits

- Maximum file size: 10MB per upload
- Adjust in `src/pages/api/bunny-upload.ts` if needed

## Pricing

- **Storage**: $0.01/GB/month (minimum $1/month)
- **Bandwidth**: $0.01/GB
- **Free tier**: 10GB storage included

## Troubleshooting

### "Credentials not configured" error

- Check that all three environment variables are set in `.env.local`
- Restart your dev server after adding environment variables

### Upload fails with 401/403

- Verify your API key is correct
- Check that the storage zone name matches exactly
- Ensure the API key has write permissions

### Images not loading

- Verify the CDN URL is correct
- Check that the storage zone is public (or has proper CORS settings)
- Ensure the file path in the URL matches the upload path

### Connection test fails

Run the test script to see detailed error messages:
```bash
npx tsx scripts/test-bunny.ts
```

## Next Steps

After setting up Bunny.net:

1. Upload product images using the API or script
2. Save the CDN URLs to your database (`product_images` table)
3. Images will be served from Bunny.net CDN automatically
