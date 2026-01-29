/**
 * Add Blue Jeans to Bottoms Category Script
 * 
 * Adds Logo Jeans (Blue) to the Bottoms category
 */

import { config } from 'dotenv';
import { db } from '../src/lib/db';
import { categories, products, productCategories } from '../src/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { randomUUID } from 'crypto';

config({ path: '.env.local' });
config({ path: '.env' });

async function main() {
  console.log('👖 Adding Blue Jeans to Bottoms Category\n');

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not configured!');
    process.exit(1);
  }

  try {
    // Find bottoms category
    const bottomsCategory = await db
      .select()
      .from(categories)
      .where(eq(categories.slug, 'bottoms'))
      .limit(1);

    if (bottomsCategory.length === 0) {
      console.error('❌ Bottoms category not found!');
      process.exit(1);
    }

    const category = bottomsCategory[0];
    console.log(`✅ Found category: ${category.name} (${category.slug})`);

    // Find blue jeans product
    const blueJeans = await db
      .select()
      .from(products)
      .where(eq(products.name, 'Logo Jeans (Blue)'))
      .limit(1);

    if (blueJeans.length === 0) {
      console.error('❌ Logo Jeans (Blue) product not found!');
      process.exit(1);
    }

    const product = blueJeans[0];
    console.log(`✅ Found product: ${product.name} (${product.id})`);

    // Check if already in category
    const existing = await db
      .select()
      .from(productCategories)
      .where(
        and(
          eq(productCategories.productId, product.id),
          eq(productCategories.categoryId, category.id)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      console.log(`\n✅ Product is already in ${category.name} category!`);
      return;
    }

    // Add to category
    await db.insert(productCategories).values({
      id: randomUUID(),
      productId: product.id,
      categoryId: category.id,
    });

    console.log(`\n✅ Successfully added ${product.name} to ${category.name} category!`);
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : 'Unknown error');
    if (error instanceof Error && error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();
