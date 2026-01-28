/**
 * Check Category Order
 */

import { config } from 'dotenv';
import { db } from '../src/lib/db';
import { categories } from '../src/lib/db/schema';

config({ path: '.env.local' });
config({ path: '.env' });

async function main() {
  console.log('🔍 Checking Category Order\n');

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not configured!');
    process.exit(1);
  }

  try {
    const allCategories = await db
      .select()
      .from(categories)
      .orderBy(categories.sortOrder);

    console.log(`📋 Found ${allCategories.length} category(ies):\n`);

    for (const category of allCategories) {
      console.log(`   ${category.sortOrder}. ${category.name} (${category.slug})`);
    }
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

main();
