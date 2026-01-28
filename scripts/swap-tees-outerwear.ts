/**
 * Swap Tees and Outerwear Category Order
 */

import { config } from 'dotenv';
import { db } from '../src/lib/db';
import { categories } from '../src/lib/db/schema';
import { eq } from 'drizzle-orm';

config({ path: '.env.local' });
config({ path: '.env' });

async function main() {
  console.log('🔄 Swap Tees and Outerwear Category Order\n');

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not configured!');
    process.exit(1);
  }

  try {
    // Find Tees and Outerwear categories
    const teesCategory = await db
      .select()
      .from(categories)
      .where(eq(categories.slug, 'tees'))
      .limit(1);

    const outerwearCategory = await db
      .select()
      .from(categories)
      .where(eq(categories.slug, 'outerwear'))
      .limit(1);

    if (teesCategory.length === 0 || outerwearCategory.length === 0) {
      console.error('❌ Could not find Tees or Outerwear category');
      process.exit(1);
    }

    const tees = teesCategory[0];
    const outerwear = outerwearCategory[0];

    console.log(`Current order:`);
    console.log(`   ${tees.sortOrder}. ${tees.name}`);
    console.log(`   ${outerwear.sortOrder}. ${outerwear.name}\n`);

    // Swap sortOrder values
    const teesNewOrder = outerwear.sortOrder;
    const outerwearNewOrder = tees.sortOrder;

    await db
      .update(categories)
      .set({
        sortOrder: teesNewOrder,
        updatedAt: new Date(),
      })
      .where(eq(categories.id, tees.id));

    await db
      .update(categories)
      .set({
        sortOrder: outerwearNewOrder,
        updatedAt: new Date(),
      })
      .where(eq(categories.id, outerwear.id));

    console.log(`✅ Swapped:`);
    console.log(`   ${teesNewOrder}. ${tees.name}`);
    console.log(`   ${outerwearNewOrder}. ${outerwear.name}`);
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : 'Unknown error');
    if (error instanceof Error && error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();
