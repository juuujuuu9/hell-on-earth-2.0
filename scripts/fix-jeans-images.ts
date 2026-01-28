/**
 * Fix Logo Jeans Images Script
 * 
 * Ensures Logo Jeans products have both front and back images,
 * with front image set as primary.
 * 
 * Usage:
 *   npx tsx scripts/fix-jeans-images.ts
 */

import { config } from 'dotenv';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { uploadImageToBunny } from '../src/lib/bunny';
import { db } from '../src/lib/db';
import { products, productImages } from '../src/lib/db/schema';
import { eq, like, or } from 'drizzle-orm';
import { randomUUID } from 'crypto';

config({ path: '.env.local' });
config({ path: '.env' });

async function main() {
  console.log('🔧 Fix Logo Jeans Images\n');

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not configured!');
    process.exit(1);
  }

  if (!process.env.BUNNY_API_KEY || !process.env.BUNNY_STORAGE_ZONE || !process.env.BUNNY_CDN_URL) {
    console.error('❌ Bunny.net credentials not configured!');
    process.exit(1);
  }

  try {
    const imageDir = join(process.cwd(), 'public', 'products', 'images', 'MMXXVI-I');
    
    // Find Logo Jeans products
    const jeansProducts = await db
      .select()
      .from(products)
      .where(
        or(
          like(products.name, '%Logo Jeans%'),
          like(products.slug, '%logo-jeans%')
        )
      );

    console.log(`📋 Found ${jeansProducts.length} Logo Jeans product(s)\n`);

    // Process both Black and Blue, even if products don't exist yet
    const colors = ['Black', 'Blue'];
    
    for (const color of colors) {
      const targetName = `Logo Jeans (${color})`;
      const targetSlug = `logo-jeans-${color.toLowerCase()}`;
      
      // Find existing product for this color
      let product = jeansProducts.find(p => {
        const nameLower = p.name.toLowerCase();
        return nameLower.includes(color.toLowerCase());
      });

      if (!product) {
        // Create product if it doesn't exist
        const productId = `prod-${randomUUID().split('-')[0]}-${Date.now()}`;
        await db.insert(products).values({
          id: productId,
          name: targetName,
          slug: targetSlug,
          stockStatus: 'IN_STOCK',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        
        // Fetch the created product
        const created = await db
          .select()
          .from(products)
          .where(eq(products.id, productId))
          .limit(1);
        
        product = created[0];
        console.log(`\n📦 Created new product: ${targetName}`);
      } else {
        console.log(`\n📦 Processing: ${product.name}`);
      }

      // Update product name and slug if needed
      if (product.name !== targetName || product.slug !== targetSlug) {
        await db
          .update(products)
          .set({
            name: targetName,
            slug: targetSlug,
            updatedAt: new Date(),
          })
          .where(eq(products.id, product.id));
        console.log(`   ✅ Updated to: ${targetName}`);
      }

      // Get existing images
      const existingImages = await db
        .select()
        .from(productImages)
        .where(eq(productImages.productId, product.id));

      console.log(`   📸 Found ${existingImages.length} existing image(s)`);

      // Find front and back image files
      const frontFilename = `Logo Jeans Front (${color}).webp`;
      const backFilename = `Logo Jeans Back (${color}).webp`;
      const frontPath = join(imageDir, frontFilename);
      const backPath = join(imageDir, backFilename);

      let frontImageUrl: string | null = null;
      let backImageUrl: string | null = null;

      // Check if front image exists in database
      const existingFront = existingImages.find(img => {
        const altLower = (img.altText || '').toLowerCase();
        const urlLower = (img.imageUrl || '').toLowerCase();
        return altLower.includes('front') || urlLower.includes('front');
      });

      // Check if back image exists in database
      const existingBack = existingImages.find(img => {
        const altLower = (img.altText || '').toLowerCase();
        const urlLower = (img.imageUrl || '').toLowerCase();
        return altLower.includes('back') || urlLower.includes('back');
      });

      // Upload front image if not exists
      try {
        if (!existingFront) {
          const fileBuffer = await readFile(frontPath);
          const bunnyFilename = `products/images/${frontFilename}`;
          frontImageUrl = await uploadImageToBunny(fileBuffer, bunnyFilename);
          console.log(`   ✅ Uploaded front image`);
        } else {
          frontImageUrl = existingFront.imageUrl;
          console.log(`   ℹ️  Front image already exists`);
        }
      } catch (error) {
        console.log(`   ⚠️  Could not upload front image: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      // Upload back image if not exists
      try {
        if (!existingBack) {
          const fileBuffer = await readFile(backPath);
          const bunnyFilename = `products/images/${backFilename}`;
          backImageUrl = await uploadImageToBunny(fileBuffer, bunnyFilename);
          console.log(`   ✅ Uploaded back image`);
        } else {
          backImageUrl = existingBack.imageUrl;
          console.log(`   ℹ️  Back image already exists`);
        }
      } catch (error) {
        console.log(`   ⚠️  Could not upload back image: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      // Delete all existing images
      await db
        .delete(productImages)
        .where(eq(productImages.productId, product.id));

      // Insert front image as primary
      if (frontImageUrl) {
        await db.insert(productImages).values({
          id: `img-${randomUUID().split('-')[0]}-${Date.now()}-0`,
          productId: product.id,
          imageUrl: frontImageUrl,
          altText: `${targetName} - Front`,
          isPrimary: true,
          sortOrder: 0,
          createdAt: new Date(),
        });
        console.log(`   ✅ Added front image as primary`);
      }

      // Insert back image
      if (backImageUrl) {
        await db.insert(productImages).values({
          id: `img-${randomUUID().split('-')[0]}-${Date.now()}-1`,
          productId: product.id,
          imageUrl: backImageUrl,
          altText: `${targetName} - Back`,
          isPrimary: false,
          sortOrder: 1,
          createdAt: new Date(),
        });
        console.log(`   ✅ Added back image`);
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Done!');
    console.log('\n💡 View products: npm run db:studio');
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : 'Unknown error');
    if (error instanceof Error && error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();
