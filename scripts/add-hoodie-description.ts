/**
 * Add Hoodie Description Script
 * 
 * Adds standardized description text to all hoodie products
 * 
 * Usage:
 *   npx tsx scripts/add-hoodie-description.ts
 */

import { config } from 'dotenv';
import { db } from '../src/lib/db';
import { products } from '../src/lib/db/schema';
import { eq, like, or } from 'drizzle-orm';

config({ path: '.env.local' });
config({ path: '.env' });

const HOODIE_DESCRIPTION = `All Hoodies are customized to the specifics of Hell On Earth, LLC. Our hoodie(s) are exceptionally heavy being around 720 GSM (grams per square meter) due to its unique double-layered fleece construction, which effectively combines two standard single layers back-to-back for extreme thickness, even though a single layer might test around 370 GSM.`;

async function main(): Promise<void> {
  console.log('👕 Adding Hoodie Description to All Hoodie Products\n');

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
      const existingDescription = product.description || '';
      
      // Check if description already contains hoodie text
      if (existingDescription.includes('All Hoodies are customized')) {
        // Update existing hoodie description with new text
        // Remove old hoodie text
        const oldHoodiePattern = /All Hoodies are customized[\s\S]*?around 370 GSM\./;
        let descriptionWithoutOldHoodie = existingDescription.replace(oldHoodiePattern, '').trim();
        
        // Clean up any trailing <br> tags
        descriptionWithoutOldHoodie = descriptionWithoutOldHoodie.replace(/<br>\s*$/, '').trim();
        
        // Reconstruct description with new formatted hoodie text
        const newDescription = descriptionWithoutOldHoodie
          ? `${descriptionWithoutOldHoodie}<br><br>${HOODIE_DESCRIPTION}`
          : HOODIE_DESCRIPTION;
        
        await db
          .update(products)
          .set({ description: newDescription })
          .where(eq(products.id, product.id));
        
        console.log(`🔄 Updated formatting: ${product.name}`);
        updatedCount++;
        continue;
      }

      // Append new description to existing description
      const newDescription = existingDescription
        ? `${existingDescription}<br><br>${HOODIE_DESCRIPTION}`
        : HOODIE_DESCRIPTION;

      // Update description
      await db
        .update(products)
        .set({ description: newDescription })
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
