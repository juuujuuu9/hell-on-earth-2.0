/**
 * Add Hoodie Features Script
 * 
 * Adds standardized product features to all hoodie products
 * 
 * Usage:
 *   npx tsx scripts/add-hoodie-features.ts
 */

import { config } from 'dotenv';
import { db } from '../src/lib/db';
import { products } from '../src/lib/db/schema';
import { eq, like, or } from 'drizzle-orm';

config({ path: '.env.local' });
config({ path: '.env' });

const HOODIE_FEATURES = `<ul>
<li>GSM: ~720 GSM (calculated from its double-layer design).</li>
<li>Construction: Made from two layers of fleece, making it much thicker and heavier than typical hoodies.</li>
<li>Feel: It has a very substantial, heavyweight feel, contributing to significant warmth</li>
</ul>`;

async function main(): Promise<void> {
  console.log('👕 Adding Hoodie Features to All Hoodie Products\n');

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not configured!');
    process.exit(1);
  }

  try {
    // Find all hoodie products
    const hoodieProducts = await db
      .select()
      .from(products)
      .where(
        or(
          like(products.name, '%Hoodie%'),
          like(products.name, '%hoodie%')
        )
      );

    if (hoodieProducts.length === 0) {
      console.log('⚠️  No hoodie products found!');
      process.exit(0);
    }

    console.log(`📋 Found ${hoodieProducts.length} hoodie product(s)\n`);

    let updatedCount = 0;

    for (const product of hoodieProducts) {
      const existingFeatures = product.features || '';
      
      // Check if features already contains hoodie features
      if (existingFeatures.includes('GSM: ~720 GSM')) {
        // Update existing features with new text
        // Remove old hoodie features pattern
        const oldFeaturesPattern = /<ul>[\s\S]*?GSM: ~720 GSM[\s\S]*?<\/ul>/;
        let featuresWithoutOld = existingFeatures.replace(oldFeaturesPattern, '').trim();
        
        // Clean up any trailing <br> tags
        featuresWithoutOld = featuresWithoutOld.replace(/<br>\s*$/, '').trim();
        
        // Reconstruct features with new formatted text
        const newFeatures = featuresWithoutOld
          ? `${featuresWithoutOld}<br><br>${HOODIE_FEATURES}`
          : HOODIE_FEATURES;
        
        await db
          .update(products)
          .set({ features: newFeatures })
          .where(eq(products.id, product.id));
        
        console.log(`🔄 Updated features: ${product.name}`);
        updatedCount++;
        continue;
      }

      // Append new features to existing features
      const newFeatures = existingFeatures
        ? `${existingFeatures}<br><br>${HOODIE_FEATURES}`
        : HOODIE_FEATURES;

      // Update features
      await db
        .update(products)
        .set({ features: newFeatures })
        .where(eq(products.id, product.id));

      console.log(`✅ Updated: ${product.name}`);
      updatedCount++;
    }

    console.log(`\n✨ Successfully updated ${updatedCount} product(s)!`);
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : 'Unknown error');
    if (error instanceof Error && error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();
