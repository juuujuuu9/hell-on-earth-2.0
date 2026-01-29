/**
 * Add Materials Information to All Hoodies
 * 
 * Sets the standardized materials information for all hoodie products
 * 
 * Usage:
 *   npx tsx scripts/add-hoodie-materials.ts
 */

import { config } from 'dotenv';
import { db } from '../src/lib/db';
import { products } from '../src/lib/db/schema';
import { eq, like, or } from 'drizzle-orm';

config({ path: '.env.local' });
config({ path: '.env' });

async function main(): Promise<void> {
  console.log('👕 Adding Materials Information to All Hoodie Products\n');

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

    // Materials information for all hoodies
    const materialsInfo = `100% Cotton`;

    let updatedCount = 0;

    for (const product of hoodieProducts) {
      // Set the materials field
      await db
        .update(products)
        .set({ materials: materialsInfo })
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
