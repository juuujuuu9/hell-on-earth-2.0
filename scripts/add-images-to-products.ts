/**
 * Add Images to Existing Products Script
 * 
 * Uploads new images and adds them to existing products
 * 
 * Usage:
 *   npx tsx scripts/add-images-to-products.ts --dir=public/products/images/MMXXVI-I --pattern="Terrifier Tee (Back)"
 */

import { config } from 'dotenv';
import { readdir, readFile } from 'fs/promises';
import { join, extname, basename } from 'path';
import { uploadImageToBunny } from '../src/lib/bunny';
import { db } from '../src/lib/db';
import { products, productImages } from '../src/lib/db/schema';
import { eq, like } from 'drizzle-orm';
import { randomUUID } from 'crypto';

config({ path: '.env.local' });
config({ path: '.env' });

/**
 * Parse filename to extract product info (simplified version)
 */
function parseProductName(filename: string): { baseName: string; color: string } {
  const nameWithoutExt = basename(filename, extname(filename));
  
  // Remove "Back" or "Front" indicators
  let baseName = nameWithoutExt
    .replace(/\s*\(Back\)\s*/gi, ' ')
    .replace(/\s*\(Front\)\s*/gi, ' ')
    .trim();
  
  // Extract color
  const colorMatch = baseName.match(/\(([^)]+)\)\s*$/);
  let color = '';
  
  if (colorMatch) {
    color = colorMatch[1];
    baseName = baseName.replace(/\s*\([^)]+\)\s*$/, '').trim();
  }
  
  return { baseName, color };
}

async function main() {
  const args = process.argv.slice(2);
  const dirArg = args.find((arg) => arg.startsWith('--dir='));
  const patternArg = args.find((arg) => arg.startsWith('--pattern='));
  
  const targetDir = dirArg 
    ? join(process.cwd(), dirArg.split('=')[1])
    : join(process.cwd(), 'public', 'products', 'images');
  
  const pattern = patternArg ? patternArg.split('=')[1] : '';

  console.log('📸 Add Images to Products\n');
  console.log(`Directory: ${targetDir}`);
  if (pattern) console.log(`Pattern: ${pattern}\n`);

  if (!process.env.BUNNY_API_KEY || !process.env.BUNNY_STORAGE_ZONE || !process.env.BUNNY_CDN_URL) {
    console.error('❌ Bunny.net credentials not configured!');
    process.exit(1);
  }

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not configured!');
    process.exit(1);
  }

  try {
    // Find new WebP images (not already in database)
    const files = await readdir(targetDir);
    const webpFiles = files.filter((file) => {
      const ext = extname(file).toLowerCase();
      return ext === '.webp' && (!pattern || file.includes(pattern));
    });

    if (webpFiles.length === 0) {
      console.log('⚠️  No matching WebP files found');
      process.exit(0);
    }

    console.log(`Found ${webpFiles.length} image(s) to process:\n`);

    // Get all existing image URLs from database
    const existingImages = await db.select({ imageUrl: productImages.imageUrl }).from(productImages);
    const existingUrls = new Set(existingImages.map(img => {
      // Extract filename from URL
      try {
        const url = new URL(img.imageUrl);
        return basename(url.pathname);
      } catch {
        return '';
      }
    }));

    let uploaded = 0;
    let linked = 0;

    for (const filename of webpFiles) {
      // Check if already uploaded
      if (existingUrls.has(filename)) {
        console.log(`   ℹ️  ${filename} already in database, skipping...`);
        continue;
      }

      console.log(`📤 Processing: ${filename}...`);

      try {
        // Parse product name
        const { baseName, color } = parseProductName(filename);
        const productName = color ? `${baseName} (${color})` : baseName;
        
        // Find matching product
        const productSlug = productName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');

        const matchingProducts = await db
          .select()
          .from(products)
          .where(like(products.slug, `%${productSlug.split('-').slice(0, -1).join('-')}%`))
          .limit(5);

        // Try to find exact match
        let product = matchingProducts.find(p => {
          const pName = p.name.toLowerCase();
          return pName.includes(baseName.toLowerCase()) && 
                 (color ? pName.includes(color.toLowerCase()) : true);
        });

        if (!product && matchingProducts.length > 0) {
          product = matchingProducts[0];
        }

        if (!product) {
          console.log(`   ⚠️  No product found for: ${productName}`);
          continue;
        }

        console.log(`   ✅ Found product: ${product.name}`);

        // Upload to Bunny.net
        const filePath = join(targetDir, filename);
        const fileBuffer = await readFile(filePath);
        const bunnyFilename = `products/images/${filename}`;
        const cdnUrl = await uploadImageToBunny(fileBuffer, bunnyFilename);

        console.log(`   ✅ Uploaded: ${cdnUrl}`);

        // Check if image already linked
        const existingLink = await db
          .select()
          .from(productImages)
          .where(eq(productImages.productId, product.id))
          .where(eq(productImages.imageUrl, cdnUrl))
          .limit(1);

        if (existingLink.length === 0) {
          // Get current image count for sort order
          const existingProductImages = await db
            .select()
            .from(productImages)
            .where(eq(productImages.productId, product.id));

          const isBack = filename.toLowerCase().includes('back');
          const imageId = `img-${randomUUID().split('-')[0]}-${Date.now()}`;
          
          await db.insert(productImages).values({
            id: imageId,
            productId: product.id,
            imageUrl: cdnUrl,
            altText: `${product.name}${isBack ? ' - Back' : ''}`,
            isPrimary: false, // Keep existing primary image
            sortOrder: existingProductImages.length,
            createdAt: new Date(),
          });

          console.log(`   ✅ Linked to product`);
          linked++;
        }

        uploaded++;
      } catch (error) {
        console.error(`   ❌ Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      console.log('');
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Summary:\n');
    console.log(`✅ Uploaded: ${uploaded} image(s)`);
    console.log(`✅ Linked to products: ${linked} image(s)`);
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

main();
