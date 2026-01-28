/**
 * Fix Logo Jeans Image URLs
 * 
 * Ensures all image URLs are properly encoded and use the correct CDN
 */

import { config } from 'dotenv';
import { db } from '../src/lib/db';
import { products, productImages } from '../src/lib/db/schema';
import { eq, like, or } from 'drizzle-orm';

config({ path: '.env.local' });
config({ path: '.env' });

async function main() {
  console.log('🔧 Fix Logo Jeans Image URLs\n');

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not configured!');
    process.exit(1);
  }

  if (!process.env.BUNNY_CDN_URL) {
    console.error('❌ BUNNY_CDN_URL not configured!');
    process.exit(1);
  }

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

    const correctCdnBase = (process.env.BUNNY_CDN_URL || '').replace(/\/$/, '');
    
    if (!correctCdnBase) {
      console.error('❌ BUNNY_CDN_URL not configured!');
      process.exit(1);
    }
    
    console.log(`Using CDN base: ${correctCdnBase}\n`);

    for (const product of jeansProducts) {
      console.log(`\n📦 ${product.name}`);

      const images = await db
        .select()
        .from(productImages)
        .where(eq(productImages.productId, product.id));

      for (const img of images) {
        let updatedUrl = img.imageUrl;

        // Fix URL encoding - ensure spaces are encoded as %20
        if (updatedUrl.includes(' ')) {
          updatedUrl = updatedUrl.replace(/ /g, '%20');
        }

        // Fix CDN domain if wrong
        if (!updatedUrl.startsWith(correctCdnBase)) {
          // Extract the path from the URL
          const urlMatch = updatedUrl.match(/\/products\/images\/.+$/);
          if (urlMatch) {
            updatedUrl = `${correctCdnBase}${urlMatch[0]}`;
          }
        }

        // Ensure proper encoding of parentheses and other special chars
        try {
          const urlObj = new URL(updatedUrl);
          urlObj.pathname = urlObj.pathname
            .split('/')
            .map(segment => {
              // If segment already has encoded chars, don't double-encode
              if (segment.includes('%')) {
                return segment;
              }
              return encodeURIComponent(segment);
            })
            .join('/');
          updatedUrl = urlObj.toString();
        } catch {
          // If URL parsing fails, just ensure spaces are encoded
          updatedUrl = updatedUrl.replace(/ /g, '%20');
        }

        if (updatedUrl !== img.imageUrl) {
          await db
            .update(productImages)
            .set({ imageUrl: updatedUrl })
            .where(eq(productImages.id, img.id));
          console.log(`   ✅ Fixed URL: ${img.imageUrl} → ${updatedUrl}`);
        } else {
          console.log(`   ℹ️  URL already correct: ${img.imageUrl}`);
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
