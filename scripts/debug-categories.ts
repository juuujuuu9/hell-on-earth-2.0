/**
 * Debug Categories Script
 * 
 * Check how many products are actually in each category
 */

import { config } from 'dotenv';
import { db } from '../src/lib/db';
import { categories, products, productCategories } from '../src/lib/db/schema';
import { eq } from 'drizzle-orm';

config({ path: '.env.local' });
config({ path: '.env' });

async function main() {
  console.log('🔍 Debugging Category Assignments\n');

  const allCategories = await db.select().from(categories);
  const allProducts = await db.select().from(products);
  const allAssignments = await db.select().from(productCategories);

  console.log(`Total products: ${allProducts.length}`);
  console.log(`Total category assignments: ${allAssignments.length}\n`);

  for (const category of allCategories) {
    console.log(`\n📦 ${category.name} (${category.slug}):`);
    
    const assignments = await db
      .select({
        productId: productCategories.productId,
        productName: products.name,
      })
      .from(productCategories)
      .innerJoin(products, eq(productCategories.productId, products.id))
      .where(eq(productCategories.categoryId, category.id));
    
    console.log(`   Found ${assignments.length} product(s):`);
    assignments.forEach((a, i) => {
      console.log(`   ${i + 1}. ${a.productName}`);
    });
  }

  console.log('\n\n🔍 Products without categories:');
  const productsWithCategories = new Set(allAssignments.map(a => a.productId));
  const productsWithoutCategories = allProducts.filter(p => !productsWithCategories.has(p.id));
  console.log(`Found ${productsWithoutCategories.length} product(s) without categories:`);
  productsWithoutCategories.forEach((p, i) => {
    console.log(`   ${i + 1}. ${p.name}`);
  });
}

main();
