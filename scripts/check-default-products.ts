/**
 * Check Products with (Default) in Name
 */

import { config } from 'dotenv';
import { db } from '../src/lib/db';
import { products } from '../src/lib/db/schema';
import { like } from 'drizzle-orm';

config({ path: '.env.local' });
config({ path: '.env' });

async function main() {
  console.log('🔍 Checking Products with (Default) in Name\n');

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not configured!');
    process.exit(1);
  }

  try {
    const productsWithDefault = await db
      .select()
      .from(products)
      .where(like(products.name, '%(Default)%'));

    console.log(`📋 Found ${productsWithDefault.length} product(s) with "(Default)" in name:\n`);

    for (const product of productsWithDefault) {
      console.log(`   - ${product.name}`);
    }
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

main();
