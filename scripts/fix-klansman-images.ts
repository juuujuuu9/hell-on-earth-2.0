/**
 * Fix Klansman Tee Images
 * 
 * Ensures Klansman Tee products have both front and back images properly uploaded
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
  console.log('🔧 Fix Klansman Tee Images\n');

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
    
    // Find Klansman Tee products
    const klansmanProducts = await db
      .select()
      .from(products)
      .where(
        or(
          like(products.name, '%Klansman Tee%'),
          like(products.slug, '%klansman-tee%')
        )
      );

    console.log(`📋 Found ${klansmanProducts.length} Klansman Tee product(s)\n`);

    for (const product of klansmanProducts) {
      const nameLower = product.name.toLowerCase();
      const isBlack = nameLower.includes('black');
      const isWhite = nameLower.includes('white');

      if (!isBlack && !isWhite) continue;

      const color = isBlack ? 'Black' : 'White';
      const targetName = `Klansman Tee (${color})`;

      console.log(`\n📦 Processing: ${product.name}`);

      // Get existing images
      const existingImages = await db
        .select()
        .from(productImages)
        .where(eq(productImages.productId, product.id));

      console.log(`   📸 Found ${existingImages.length} existing image(s)`);

      // Find front and back image files
      const frontFilename = `Klansman Tee (Front) (${color}).webp`;
      const backFilename = `Klansman Tee (Back) (${color}).webp`;
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

      // Upload front image if not exists or URL is broken
      try {
        if (!existingFront) {
          const fileBuffer = await readFile(frontPath);
          const bunnyFilename = `products/images/${frontFilename}`;
          frontImageUrl = await uploadImageToBunny(fileBuffer, bunnyFilename);
          console.log(`   ✅ Uploaded front image`);
        } else {
          // Check if URL is accessible
          try {
            const response = await fetch(existingFront.imageUrl, { method: 'HEAD' });
            if (response.ok) {
              frontImageUrl = existingFront.imageUrl;
              console.log(`   ℹ️  Front image already exists and is accessible`);
            } else {
              // Re-upload if URL is broken
              const fileBuffer = await readFile(frontPath);
              const bunnyFilename = `products/images/${frontFilename}`;
              frontImageUrl = await uploadImageToBunny(fileBuffer, bunnyFilename);
              console.log(`   ✅ Re-uploaded front image (old URL was broken)`);
            }
          } catch {
            // Re-upload if fetch fails
            const fileBuffer = await readFile(frontPath);
            const bunnyFilename = `products/images/${frontFilename}`;
            frontImageUrl = await uploadImageToBunny(fileBuffer, bunnyFilename);
            console.log(`   ✅ Re-uploaded front image (old URL was broken)`);
          }
        }
      } catch (error) {
        console.log(`   ⚠️  Could not upload front image: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      // Upload back image if not exists or URL is broken
      try {
        if (!existingBack) {
          const fileBuffer = await readFile(backPath);
          const bunnyFilename = `products/images/${backFilename}`;
          backImageUrl = await uploadImageToBunny(fileBuffer, bunnyFilename);
          console.log(`   ✅ Uploaded back image`);
        } else {
          // Check if URL is accessible
          try {
            const response = await fetch(existingBack.imageUrl, { method: 'HEAD' });
            if (response.ok) {
              backImageUrl = existingBack.imageUrl;
              console.log(`   ℹ️  Back image already exists and is accessible`);
            } else {
              // Re-upload if URL is broken
              const fileBuffer = await readFile(backPath);
              const bunnyFilename = `products/images/${backFilename}`;
              backImageUrl = await uploadImageToBunny(fileBuffer, bunnyFilename);
              console.log(`   ✅ Re-uploaded back image (old URL was broken)`);
            }
          } catch {
            // Re-upload if fetch fails
            const fileBuffer = await readFile(backPath);
            const bunnyFilename = `products/images/${backFilename}`;
            backImageUrl = await uploadImageToBunny(fileBuffer, bunnyFilename);
            console.log(`   ✅ Re-uploaded back image (old URL was broken)`);
          }
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
