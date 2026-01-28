/**
 * Update Image URLs Script
 * 
 * Updates existing image URLs in database to use new CDN/Pull Zone URL
 * Replaces old CDN domain with new Pull Zone domain
 * 
 * Usage:
 *   npx tsx scripts/update-image-urls.ts
 */

import { config } from 'dotenv';
import { db } from '../src/lib/db';
import { productImages } from '../src/lib/db/schema';
import { eq, like } from 'drizzle-orm';

// Load environment variables
config({ path: '.env.local' });
config({ path: '.env' });

const OLD_CDN_DOMAIN = 'hell-on-earth-2-0.b-cdn.net';
const NEW_CDN_DOMAIN = 'hellonearth.b-cdn.net';

async function main() {
  console.log('🔄 Updating Image URLs\n');
  console.log(`Old domain: ${OLD_CDN_DOMAIN}`);
  console.log(`New domain: ${NEW_CDN_DOMAIN}\n`);

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not configured!');
    process.exit(1);
  }

  try {
    // Find all images with old CDN URL
    const allImages = await db.select().from(productImages);
    
    const imagesToUpdate = allImages.filter(img => 
      img.imageUrl.includes(OLD_CDN_DOMAIN)
    );

    console.log(`Found ${imagesToUpdate.length} image(s) to update:\n`);

    if (imagesToUpdate.length === 0) {
      console.log('✅ No images need updating. All URLs are already using the new domain.');
      return;
    }

    let updated = 0;
    let failed = 0;

    for (const image of imagesToUpdate) {
      try {
        // Replace old domain with new domain
        let newUrl = image.imageUrl.replace(
          OLD_CDN_DOMAIN,
          NEW_CDN_DOMAIN
        );

        // Fix encoding: URLs should be properly encoded
        // If URL has spaces or special chars but isn't encoded, encode it
        // If URL is double-encoded (%25), decode and re-encode properly
        let fixedUrl = newUrl;
        try {
          const urlObj = new URL(newUrl);
          
          // Check if pathname has unencoded spaces or is double-encoded
          if (urlObj.pathname.includes(' ') || urlObj.pathname.includes('%25')) {
            // Decode if double-encoded, then re-encode properly
            let decodedPath = urlObj.pathname;
            if (decodedPath.includes('%25')) {
              decodedPath = decodeURIComponent(decodedPath);
            }
            
            // Encode each segment properly
            urlObj.pathname = decodedPath
              .split('/')
              .map(segment => {
                // Decode first to handle any existing encoding
                const decoded = decodeURIComponent(segment);
                // Then encode properly
                return encodeURIComponent(decoded);
              })
              .join('/');
            
            fixedUrl = urlObj.toString();
          }
        } catch {
          // If URL parsing fails, try to fix encoding manually
          if (newUrl.includes('%25')) {
            // Double-encoded, decode once
            fixedUrl = newUrl.replace(/%25/g, '%');
          } else if (newUrl.includes(' ') && !newUrl.includes('%')) {
            // Has spaces but not encoded, encode them
            fixedUrl = newUrl.replace(/ /g, '%20');
          } else {
            fixedUrl = newUrl;
          }
        }

        // Update in database
        await db
          .update(productImages)
          .set({ imageUrl: fixedUrl })
          .where(eq(productImages.id, image.id));

        console.log(`✅ Updated: ${image.id}`);
        console.log(`   Old: ${image.imageUrl.substring(0, 80)}...`);
        console.log(`   New: ${fixedUrl.substring(0, 80)}...`);
        console.log('');

        updated++;
      } catch (error) {
        console.error(`❌ Failed to update ${image.id}:`, error instanceof Error ? error.message : 'Unknown error');
        failed++;
      }
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Summary:\n');
    console.log(`✅ Updated: ${updated} image(s)`);
    if (failed > 0) {
      console.log(`❌ Failed: ${failed} image(s)`);
    }
    console.log('\n💡 Restart your dev server to see the changes.');
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

main();
