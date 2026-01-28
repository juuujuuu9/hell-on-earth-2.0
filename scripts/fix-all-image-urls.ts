/**
 * Fix All Product Image URLs - Ensure proper encoding
 */

import { config } from 'dotenv';
import { db } from '../src/lib/db';
import { productImages } from '../src/lib/db/schema';
import { eq } from 'drizzle-orm';

config({ path: '.env.local' });
config({ path: '.env' });

async function main() {
  console.log('🔧 Fix All Product Image URLs\n');

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not configured!');
    process.exit(1);
  }

  try {
    const allImages = await db.select().from(productImages);
    console.log(`📋 Found ${allImages.length} image(s) to check\n`);

    let fixed = 0;
    let alreadyCorrect = 0;

    for (const img of allImages) {
      let updatedUrl = img.imageUrl;

      // Check if URL has unencoded spaces or special characters
      if (updatedUrl.includes(' ') && !updatedUrl.includes('%20')) {
        // URL has spaces that need encoding
        try {
          const urlObj = new URL(updatedUrl);
          // Re-encode the pathname
          urlObj.pathname = urlObj.pathname
            .split('/')
            .map(segment => {
              // Decode first to avoid double-encoding
              try {
                const decoded = decodeURIComponent(segment);
                return encodeURIComponent(decoded);
              } catch {
                // If decoding fails, just encode as-is
                return encodeURIComponent(segment);
              }
            })
            .join('/');
          updatedUrl = urlObj.toString();
        } catch {
          // If URL parsing fails, manually encode spaces
          updatedUrl = updatedUrl.replace(/ /g, '%20');
        }
      }

      // Ensure parentheses are encoded
      if (updatedUrl.includes('(') || updatedUrl.includes(')')) {
        try {
          const urlObj = new URL(updatedUrl);
          urlObj.pathname = urlObj.pathname
            .split('/')
            .map(segment => {
              if (segment.includes('%')) {
                // Already encoded, decode and re-encode to ensure consistency
                try {
                  const decoded = decodeURIComponent(segment);
                  return encodeURIComponent(decoded);
                } catch {
                  return segment;
                }
              }
              return encodeURIComponent(segment);
            })
            .join('/');
          updatedUrl = urlObj.toString();
        } catch {
          // Manual encoding if URL parsing fails
          updatedUrl = updatedUrl
            .replace(/\(/g, '%28')
            .replace(/\)/g, '%29')
            .replace(/ /g, '%20');
        }
      }

      if (updatedUrl !== img.imageUrl) {
        await db
          .update(productImages)
          .set({ imageUrl: updatedUrl })
          .where(eq(productImages.id, img.id));
        console.log(`   ✅ Fixed: ${img.imageUrl.substring(0, 80)}...`);
        console.log(`      → ${updatedUrl.substring(0, 80)}...`);
        fixed++;
      } else {
        alreadyCorrect++;
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ Fixed: ${fixed} image(s)`);
    console.log(`ℹ️  Already correct: ${alreadyCorrect} image(s)`);
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : 'Unknown error');
    if (error instanceof Error && error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();
