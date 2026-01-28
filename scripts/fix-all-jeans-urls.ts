/**
 * Fix Logo Jeans Image URLs - Use correct CDN
 */

import { config } from 'dotenv';
import { db } from '../src/lib/db';
import { products, productImages } from '../src/lib/db/schema';
import { eq, like, or } from 'drizzle-orm';

config({ path: '.env.local' });
config({ path: '.env' });

async function main() {
  console.log('🔧 Fix Logo Jeans Image URLs to Correct CDN\n');

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not configured!');
    process.exit(1);
  }

  // Use the CDN URL from .env (hellonearth.b-cdn.net)
  const correctCdnBase = 'https://hellonearth.b-cdn.net';
  console.log(`Using CDN base: ${correctCdnBase}\n`);

  try {
    const jeansProducts = await db
      .select()
      .from(products)
      .where(
        or(
          like(products.name, '%Logo Jeans%'),
          like(products.slug, '%logo-jeans%')
        )
      );

    for (const product of jeansProducts) {
      console.log(`\n📦 ${product.name}`);

      const images = await db
        .select()
        .from(productImages)
        .where(eq(productImages.productId, product.id));

      for (const img of images) {
        // Extract the filename from the current URL
        const urlMatch = img.imageUrl.match(/\/products\/images\/(.+)$/);
        if (!urlMatch) {
          console.log(`   ⚠️  Could not parse URL: ${img.imageUrl}`);
          continue;
        }

        const filename = urlMatch[1];
        // Decode the filename to get the original, then re-encode properly
        let decodedFilename: string;
        try {
          decodedFilename = decodeURIComponent(filename);
        } catch {
          decodedFilename = filename.replace(/%20/g, ' ');
        }

        // Re-encode properly
        const encodedPath = decodedFilename
          .split('/')
          .map(segment => encodeURIComponent(segment))
          .join('/');

        const newUrl = `${correctCdnBase}/products/images/${encodedPath}`;

        if (newUrl !== img.imageUrl) {
          await db
            .update(productImages)
            .set({ imageUrl: newUrl })
            .where(eq(productImages.id, img.id));
          console.log(`   ✅ Updated: ${img.imageUrl}`);
          console.log(`      → ${newUrl}`);
        } else {
          console.log(`   ℹ️  Already correct: ${img.imageUrl}`);
        }
      }
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
