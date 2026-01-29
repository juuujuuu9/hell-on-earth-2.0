/**
 * Add Denim Description Script
 * 
 * Adds standardized description text to all denim/jeans products
 * 
 * Usage:
 *   npx tsx scripts/add-denim-description.ts
 */

import { config } from 'dotenv';
import { db } from '../src/lib/db';
import { products } from '../src/lib/db/schema';
import { eq, like, or } from 'drizzle-orm';

config({ path: '.env.local' });
config({ path: '.env' });

const DENIM_DESCRIPTION = `All Jeans material are customized to the specifics of Hell On Earth, LLC. Our jeans are primarily
constructed from durable, 100% cotton heavyweight denim or heavy-duty cotton duck fabric.
Designed for rugged environments, and activity. Jeans feature triple-stitched seams, and
functional elements like hammer loops and dual tool pockets.<br><br><strong>These jeans are designed for a functional, relaxed fit, featuring tapered legs designed to fit
over shoes, or MX boots.</strong>`;

async function main(): Promise<void> {
  console.log('👖 Adding Denim Description to All Jeans Products\n');

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not configured!');
    process.exit(1);
  }

  try {
    // Find all denim/jeans products
    const jeansProducts = await db
      .select()
      .from(products)
      .where(
        or(
          like(products.name, '%Jeans%'),
          like(products.name, '%jeans%'),
          like(products.name, '%Denim%'),
          like(products.name, '%denim%')
        )
      );

    if (jeansProducts.length === 0) {
      console.log('⚠️  No denim/jeans products found!');
      process.exit(0);
    }

    console.log(`📋 Found ${jeansProducts.length} denim/jeans product(s)\n`);

    let updatedCount = 0;

    for (const product of jeansProducts) {
      const existingDescription = product.description || '';
      
      // Check if description already contains denim text
      if (existingDescription.includes('All Jeans material are customized')) {
        // Update existing denim description with new formatting
        // Remove old denim text (handles both single <br> and double <br><br> cases)
        const oldDenimPattern = /All Jeans material are customized[\s\S]*?over shoes, or MX boots\./;
        let descriptionWithoutOldDenim = existingDescription.replace(oldDenimPattern, '').trim();
        
        // Clean up any trailing <br> tags
        descriptionWithoutOldDenim = descriptionWithoutOldDenim.replace(/<br>\s*$/, '').trim();
        
        // Reconstruct description with new formatted denim text
        const newDescription = descriptionWithoutOldDenim
          ? `${descriptionWithoutOldDenim}<br><br>${DENIM_DESCRIPTION}`
          : DENIM_DESCRIPTION;
        
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
        ? `${existingDescription}<br><br>${DENIM_DESCRIPTION}`
        : DENIM_DESCRIPTION;

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
