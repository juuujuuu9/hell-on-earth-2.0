/**
 * Update Product Description Script
 * 
 * Updates description for specific products
 */

import { config } from 'dotenv';
import { db } from '../src/lib/db';
import { products } from '../src/lib/db/schema';
import { eq, like } from 'drizzle-orm';

config({ path: '.env.local' });
config({ path: '.env' });

async function main(): Promise<void> {
  console.log('📝 Updating Product Description\n');

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not configured!');
    process.exit(1);
  }

  try {
    // Find Shell Jacket (BlackWhite)
    const productResults = await db
      .select()
      .from(products)
      .where(like(products.name, '%BlackWhite%'));

    if (productResults.length === 0) {
      console.error('❌ Product "Shell Jacket (BlackWhite)" not found!');
      process.exit(1);
    }

    const product = productResults[0];
    console.log(`Found product: ${product.name} (ID: ${product.id})\n`);

    const description = `At a minimum, the list must contain chemicals identified by reference in Labor Code section 6382(b)(1) or (d).  Labor Code section 6382(b)(1) incorporates chemicals identified by the World Health Organization's International Agency for Research on Cancer (IARC) as causing cancer in humans or laboratory animals.

Figure showing process for listing via Labor Code mechanism
Figure showing process for reconsideration via Labor Code mechanism`;

    // Update description
    await db
      .update(products)
      .set({ description })
      .where(eq(products.id, product.id));

    console.log('✅ Description updated successfully!');
    console.log(`\nProduct: ${product.name}`);
    console.log(`Description length: ${description.length} characters`);
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : 'Unknown error');
    if (error instanceof Error && error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();
