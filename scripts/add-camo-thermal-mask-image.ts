/**
 * Add camo thermal mask (Glow) image to product
 * 
 * Compresses, uploads to Bunny, and adds as second image
 */

import { config } from 'dotenv';
import { readFile, stat } from 'fs/promises';
import { join, extname } from 'path';
import sharp from 'sharp';
import { uploadImageToBunny } from '../src/lib/bunny';
import { db } from '../src/lib/db';
import { products, productImages } from '../src/lib/db/schema';
import { eq, ilike, desc } from 'drizzle-orm';
import { randomUUID } from 'crypto';

// Load environment variables
config({ path: '.env.local' });
config({ path: '.env' });

async function main() {
  console.log('📸 Adding camo thermal mask (Glow) image to product\n');

  // Check Bunny.net credentials
  if (!process.env.BUNNY_API_KEY || !process.env.BUNNY_STORAGE_ZONE || !process.env.BUNNY_CDN_URL) {
    console.error('❌ Bunny.net credentials not configured!');
    process.exit(1);
  }

  // Check database connection
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not configured!');
    process.exit(1);
  }

  try {
    const imagesDir = join(process.cwd(), 'public', 'products', 'images', 'MMXXVI-I');
    const pngPath = join(imagesDir, 'camo therma mask (Glow).png');
    const webpPath = join(imagesDir, 'camo therma mask (Glow).webp');

    // Compress PNG if it exists
    try {
      const pngStats = await stat(pngPath);
      console.log(`📦 Compressing PNG: ${(pngStats.size / 1024).toFixed(2)} KB...`);
      
      const compressed = await sharp(pngPath)
        .png({
          quality: 85,
          compressionLevel: 9,
          adaptiveFiltering: true,
        })
        .resize(2000, 2000, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .toBuffer();
      
      const compressedStats = compressed.length;
      const savings = pngStats.size - compressedStats;
      const savingsPercent = ((savings / pngStats.size) * 100).toFixed(1);
      
      console.log(`   ✅ Compressed: ${(compressedStats / 1024).toFixed(2)} KB (saved ${(savings / 1024).toFixed(2)} KB, ${savingsPercent}%)`);
    } catch (error) {
      console.log(`   ℹ️  PNG not found or already compressed, skipping...`);
    }

    // Use WebP version if available, otherwise use PNG
    let imagePath: string;
    let filename: string;
    
    try {
      await stat(webpPath);
      imagePath = webpPath;
      filename = 'camo therma mask (Glow).webp';
      console.log(`📤 Using WebP version for upload...`);
    } catch {
      imagePath = pngPath;
      filename = 'camo therma mask (Glow).png';
      console.log(`📤 Using PNG version for upload...`);
    }

    // Read file
    const fileBuffer = await readFile(imagePath);

    // Upload to Bunny.net
    const bunnyFilename = `products/images/MMXXVI-I/${filename}`;
    const cdnUrl = await uploadImageToBunny(fileBuffer, bunnyFilename);

    console.log(`   ✅ Uploaded: ${cdnUrl}`);

    // Find the product - search for "camo thermal mask" or "camo therma mask"
    const productResults = await db
      .select()
      .from(products)
      .where(
        ilike(products.name, '%camo%therma%mask%')
      )
      .orderBy(desc(products.createdAt))
      .limit(1);

    if (productResults.length === 0) {
      console.error('❌ Product not found! Searching for products with "camo" and "mask"...');
      
      // Try broader search
      const broaderResults = await db
        .select()
        .from(products)
        .where(
          ilike(products.name, '%camo%')
        )
        .limit(5);
      
      if (broaderResults.length > 0) {
        console.log('\nFound products:');
        broaderResults.forEach(p => console.log(`   - ${p.name} (${p.slug})`));
      }
      
      process.exit(1);
    }

    const product = productResults[0];
    console.log(`   ✅ Found product: "${product.name}" (${product.id})`);

    // Check existing images for this product
    const existingImages = await db
      .select()
      .from(productImages)
      .where(eq(productImages.productId, product.id))
      .orderBy(productImages.sortOrder);

    console.log(`   ℹ️  Product has ${existingImages.length} existing image(s)`);

    // Determine sort order (should be 1 for second image)
    const maxSortOrder = existingImages.length > 0
      ? Math.max(...existingImages.map(img => img.sortOrder))
      : -1;
    
    const newSortOrder = maxSortOrder + 1;

    // Add image to product_images table
    const imageId = `img-${randomUUID().split('-')[0]}-${Date.now()}`;
    await db.insert(productImages).values({
      id: imageId,
      productId: product.id,
      imageUrl: cdnUrl,
      altText: 'Camo Therma Mask (Glow)',
      isPrimary: false, // Not primary, it's the second image
      sortOrder: newSortOrder,
      createdAt: new Date(),
    });

    console.log(`   ✅ Added image as image #${newSortOrder + 1} (sortOrder: ${newSortOrder})`);
    console.log(`\n✅ Successfully added image to product!`);
    console.log(`   Product: ${product.name}`);
    console.log(`   Image URL: ${cdnUrl}`);
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

main();
