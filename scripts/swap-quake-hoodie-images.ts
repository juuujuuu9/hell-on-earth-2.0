/**
 * Swap Quake Hoodie Images
 * 
 * Makes front image primary and back image secondary (hover)
 */

import { config } from 'dotenv';
import { db } from '../src/lib/db';
import { products, productImages } from '../src/lib/db/schema';
import { eq, like, or } from 'drizzle-orm';

config({ path: '.env.local' });
config({ path: '.env' });

async function main() {
  console.log('🔄 Swap Quake Hoodie Images\n');

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not configured!');
    process.exit(1);
  }

  try {
    const quakeProducts = await db
      .select()
      .from(products)
      .where(
        or(
          like(products.name, '%Quake%Hoodie%'),
          like(products.slug, '%quake%hoodie%')
        )
      );

    console.log(`📋 Found ${quakeProducts.length} Quake Hoodie product(s)\n`);

    for (const product of quakeProducts) {
      console.log(`\n📦 ${product.name}`);

      const images = await db
        .select()
        .from(productImages)
        .where(eq(productImages.productId, product.id))
        .orderBy(productImages.sortOrder);

      if (images.length < 2) {
        console.log(`   ⚠️  Only ${images.length} image(s) found, skipping`);
        continue;
      }

      // Find front and back images
      // Front image doesn't have "back" in the name/URL
      // Back image has "back" in the name/URL
      const backImage = images.find(img => {
        const altLower = (img.altText || '').toLowerCase();
        const urlLower = (img.imageUrl || '').toLowerCase();
        return altLower.includes('back') || urlLower.includes('back');
      });

      const frontImage = images.find(img => {
        const altLower = (img.altText || '').toLowerCase();
        const urlLower = (img.imageUrl || '').toLowerCase();
        return !altLower.includes('back') && !urlLower.includes('back');
      });

      if (!frontImage || !backImage) {
        console.log(`   ⚠️  Could not find front/back images, skipping`);
        continue;
      }

      // Swap: make front image primary, back image secondary
      await db
        .update(productImages)
        .set({
          isPrimary: true,
          sortOrder: 0,
        })
        .where(eq(productImages.id, frontImage.id));

      await db
        .update(productImages)
        .set({
          isPrimary: false,
          sortOrder: 1,
        })
        .where(eq(productImages.id, backImage.id));

      console.log(`   ✅ Swapped: Front image is now primary`);
      console.log(`   ✅ Swapped: Back image is now secondary (hover)`);
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Done!');
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : 'Unknown error');
    if (error instanceof Error && error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();
