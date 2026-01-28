/**
 * Remove (Default) from Product Titles
 */

import { config } from 'dotenv';
import { db } from '../src/lib/db';
import { products } from '../src/lib/db/schema';
import { eq, like } from 'drizzle-orm';

config({ path: '.env.local' });
config({ path: '.env' });

async function main() {
  console.log('🔄 Remove (Default) from Product Titles\n');

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not configured!');
    process.exit(1);
  }

  try {
    const productsWithDefault = await db
      .select()
      .from(products)
      .where(like(products.name, '%(Default)%'));

    console.log(`📋 Found ${productsWithDefault.length} product(s) to update\n`);

    let updated = 0;

    for (const product of productsWithDefault) {
      // Remove "(Default)" from name (case-insensitive, with or without spaces)
      const newName = product.name
        .replace(/\s*\([Dd]efault\)\s*/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (newName !== product.name) {
        // Generate new slug
        const newSlug = newName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');

        await db
          .update(products)
          .set({
            name: newName,
            slug: newSlug,
            updatedAt: new Date(),
          })
          .where(eq(products.id, product.id));

        console.log(`   ✅ "${product.name}" → "${newName}"`);
        updated++;
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ Updated: ${updated} product(s)`);
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : 'Unknown error');
    if (error instanceof Error && error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();
