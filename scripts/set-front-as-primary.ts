/**
 * Set Front Image as Primary for All Products
 * 
 * Makes front images the default/main image for all products
 */

import { config } from 'dotenv';
import { db } from '../src/lib/db';
import { products, productImages } from '../src/lib/db/schema';
import { eq } from 'drizzle-orm';

config({ path: '.env.local' });
config({ path: '.env' });

async function main() {
  console.log('🔄 Set Front Image as Primary for All Products\n');

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not configured!');
    process.exit(1);
  }

  try {
    const allProducts = await db.select().from(products);
    console.log(`📋 Found ${allProducts.length} product(s)\n`);

    let updated = 0;
    let skipped = 0;

    for (const product of allProducts) {
      const images = await db
        .select()
        .from(productImages)
        .where(eq(productImages.productId, product.id))
        .orderBy(productImages.sortOrder);

      if (images.length === 0) {
        skipped++;
        continue;
      }

      // Find front image
      const frontImage = images.find(img => {
        const altLower = (img.altText || '').toLowerCase();
        const urlLower = (img.imageUrl || '').toLowerCase();
        return altLower.includes('front') || urlLower.includes('front');
      });

      // If no front image found, keep current primary
      if (!frontImage) {
        skipped++;
        continue;
      }

      // Check if front image is already primary
      if (frontImage.isPrimary && frontImage.sortOrder === 0) {
        skipped++;
        continue;
      }

      // Set all images to not primary first
      await db
        .update(productImages)
        .set({ isPrimary: false })
        .where(eq(productImages.productId, product.id));

      // Set front image as primary with sortOrder 0
      await db
        .update(productImages)
        .set({
          isPrimary: true,
          sortOrder: 0,
        })
        .where(eq(productImages.id, frontImage.id));

      // Update sortOrder for other images
      let sortOrder = 1;
      for (const img of images) {
        if (img.id !== frontImage.id) {
          await db
            .update(productImages)
            .set({ sortOrder: sortOrder++ })
            .where(eq(productImages.id, img.id));
        }
      }

      console.log(`   ✅ ${product.name}: Front image set as primary`);
      updated++;
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ Updated: ${updated} product(s)`);
    console.log(`ℹ️  Skipped: ${skipped} product(s) (no front image or already correct)`);
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : 'Unknown error');
    if (error instanceof Error && error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();
