/**
 * Bulk Upload Product Images Script
 * 
 * Uploads images from public/products/images to Bunny.net CDN
 * Optionally creates products in the database based on filenames
 * 
 * Usage:
 *   npx tsx scripts/upload-product-images.ts                    # Upload images only
 *   npx tsx scripts/upload-product-images.ts --create-products   # Upload + create products
 */

import { config } from 'dotenv';
import { readdir, readFile } from 'fs/promises';
import { join, extname, basename } from 'path';
import { uploadImageToBunny } from '../src/lib/bunny';
import { db } from '../src/lib/db';
import { products, productImages } from '../src/lib/db/schema';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

// Load environment variables
config({ path: '.env.local' });
config({ path: '.env' });

/**
 * Convert filename to product slug
 * Example: "Cool T-Shirt.jpg" -> "cool-t-shirt"
 */
function filenameToSlug(filename: string): string {
  return basename(filename, extname(filename))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Convert filename to product name
 * Example: "Cool T-Shirt.jpg" -> "Cool T-Shirt"
 */
function filenameToName(filename: string): string {
  return basename(filename, extname(filename))
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}


async function main() {
  const createProducts = process.argv.includes('--create-products');
  const args = process.argv.slice(2);
  const dirArg = args.find((arg) => arg.startsWith('--dir='));
  const IMAGES_DIR = dirArg 
    ? join(process.cwd(), dirArg.split('=')[1])
    : join(process.cwd(), 'public', 'products', 'images');

  console.log('📸 Product Image Upload Script\n');
  console.log(`Directory: ${IMAGES_DIR}`);
  console.log(`Mode: ${createProducts ? 'Upload + Create Products' : 'Upload Images Only'}\n`);

  // Check Bunny.net credentials
  if (!process.env.BUNNY_API_KEY || !process.env.BUNNY_STORAGE_ZONE || !process.env.BUNNY_CDN_URL) {
    console.error('❌ Bunny.net credentials not configured!');
    console.log('\n💡 Add to .env.local:');
    console.log('   BUNNY_API_KEY=your-api-key');
    console.log('   BUNNY_STORAGE_ZONE=your-storage-zone-name');
    console.log('   BUNNY_CDN_URL=https://your-storage-zone.b-cdn.net');
    process.exit(1);
  }

  // Check database connection if creating products
  if (createProducts && !process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not configured!');
    console.log('\n💡 Add to .env.local:');
    console.log('   DATABASE_URL=postgresql://user:password@host/database?sslmode=require');
    process.exit(1);
  }

  try {
    // Read all files from images directory
    const files = await readdir(IMAGES_DIR);
    const allImageFiles = files.filter((file) => {
      const ext = extname(file).toLowerCase();
      return ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif'].includes(ext);
    });

    // Prefer WebP files over PNG files (if WebP exists, skip PNG)
    const imageFiles: string[] = [];
    const processedNames = new Set<string>();
    
    // First, add all non-PNG files (WebP, JPG, etc.)
    for (const file of allImageFiles) {
      const ext = extname(file).toLowerCase();
      if (ext !== '.png') {
        imageFiles.push(file);
        const nameWithoutExt = basename(file, ext);
        processedNames.add(nameWithoutExt.toLowerCase());
      }
    }
    
    // Then add PNG files only if no WebP version exists
    for (const file of allImageFiles) {
      const ext = extname(file).toLowerCase();
      if (ext === '.png') {
        const nameWithoutExt = basename(file, ext);
        if (!processedNames.has(nameWithoutExt.toLowerCase())) {
          imageFiles.push(file);
        }
      }
    }

    if (imageFiles.length === 0) {
      console.log('⚠️  No image files found in public/products/images/');
      console.log('   Place your product images there and try again.');
      process.exit(0);
    }

    console.log(`Found ${imageFiles.length} image(s) to upload:\n`);

    const results: Array<{
      filename: string;
      success: boolean;
      cdnUrl?: string;
      productId?: string;
      error?: string;
    }> = [];

    // Upload each image
    for (const filename of imageFiles) {
      const filePath = join(IMAGES_DIR, filename);
      const slug = filenameToSlug(filename);
      const productName = filenameToName(filename);

      try {
        console.log(`📤 Uploading: ${filename}...`);

        // Read file
        const fileBuffer = await readFile(filePath);

        // Upload to Bunny.net
        const bunnyFilename = `products/images/${filename}`;
        const cdnUrl = await uploadImageToBunny(fileBuffer, bunnyFilename);

        console.log(`   ✅ Uploaded: ${cdnUrl}`);

        // Create product if requested
        let productId: string | undefined;
        if (createProducts) {
          // Check if product already exists
          const existing = await db
            .select()
            .from(products)
            .where(eq(products.slug, slug))
            .limit(1);

          if (existing.length > 0) {
            productId = existing[0].id;
            console.log(`   ℹ️  Product "${productName}" already exists (${productId})`);
          } else {
            // Create new product
            productId = `prod-${randomUUID().split('-')[0]}-${Date.now()}`;
            await db.insert(products).values({
              id: productId,
              name: productName,
              slug: slug,
              stockStatus: 'IN_STOCK',
              createdAt: new Date(),
              updatedAt: new Date(),
            });
            console.log(`   ✅ Created product: "${productName}" (${productId})`);
          }

          // Add image to product_images table
          const imageId = `img-${randomUUID().split('-')[0]}-${Date.now()}`;
          await db.insert(productImages).values({
            id: imageId,
            productId: productId,
            imageUrl: cdnUrl,
            altText: productName,
            isPrimary: true,
            sortOrder: 0,
            createdAt: new Date(),
          });
          console.log(`   ✅ Linked image to product`);
        }

        results.push({
          filename,
          success: true,
          cdnUrl,
          productId,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`   ❌ Failed: ${errorMessage}`);
        results.push({
          filename,
          success: false,
          error: errorMessage,
        });
      }
      console.log('');
    }

    // Summary
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Summary:\n');
    const successful = results.filter((r) => r.success);
    const failed = results.filter((r) => !r.success);

    console.log(`✅ Successful: ${successful.length}`);
    successful.forEach((r) => {
      console.log(`   - ${r.filename}`);
      if (r.cdnUrl) console.log(`     → ${r.cdnUrl}`);
    });

    if (failed.length > 0) {
      console.log(`\n❌ Failed: ${failed.length}`);
      failed.forEach((r) => {
        console.log(`   - ${r.filename}: ${r.error}`);
      });
    }

    if (createProducts && successful.length > 0) {
      console.log('\n💡 Next steps:');
      console.log('   1. Review products in database: npm run db:studio');
      console.log('   2. Add prices, descriptions, and categories to products');
      console.log('   3. Add Stripe checkout URLs when ready');
    } else if (successful.length > 0) {
      console.log('\n💡 Next steps:');
      console.log('   1. Copy the CDN URLs above');
      console.log('   2. Add products manually via: npm run db:studio');
      console.log('   3. Or run with --create-products flag to auto-create products');
    }
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

main();
