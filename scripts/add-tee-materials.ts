/**
 * Add Materials Information to All Tees
 * 
 * Sets the standardized materials information for all products in the tees category
 */

import { config } from 'dotenv';
import { db } from '../src/lib/db';
import { products, categories, productCategories } from '../src/lib/db/schema';
import { eq, inArray } from 'drizzle-orm';

config({ path: '.env.local' });
config({ path: '.env' });

async function main(): Promise<void> {
  console.log('📝 Adding Materials Information to All Tees\n');

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not configured!');
    process.exit(1);
  }

  try {
    // Find the tees category
    const categoryResults = await db
      .select()
      .from(categories)
      .where(eq(categories.slug, 'tees'))
      .limit(1);

    if (categoryResults.length === 0) {
      console.error('❌ Tees category not found!');
      process.exit(1);
    }

    const teesCategory = categoryResults[0];
    console.log(`📦 Found category: ${teesCategory.name} (${teesCategory.slug})\n`);

    // Get all products in the tees category
    const productCategoryResults = await db
      .select({ productId: productCategories.productId })
      .from(productCategories)
      .where(eq(productCategories.categoryId, teesCategory.id));

    if (productCategoryResults.length === 0) {
      console.log('⚠️  No products found in tees category');
      process.exit(0);
    }

    const productIds = productCategoryResults.map(pc => pc.productId);
    const teeProducts = await db
      .select()
      .from(products)
      .where(inArray(products.id, productIds));

    console.log(`📋 Found ${teeProducts.length} tee product(s)\n`);

    // Materials information for all tees as bullet points
    const materialsInfo = `<ul>
<li>Weight: 6.5 oz/yd2 / ~220 GSM.</li>
<li>Material: 100% Cotton.</li>
<li>Features: Garment-dyed, enzyme-washed, and shrink-free.</li>
<li>Style: Unisex, heavyweight, and durable.</li>
</ul>`;

    let updatedCount = 0;

    for (const product of teeProducts) {
      // Set the materials field (separate from description)
      await db
        .update(products)
        .set({ materials: materialsInfo })
        .where(eq(products.id, product.id));

      console.log(`✅ Updated: ${product.name}`);
      updatedCount++;
    }

    console.log(`\n✅ Successfully updated ${updatedCount} out of ${teeProducts.length} tee product(s)`);
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : 'Unknown error');
    if (error instanceof Error && error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();
