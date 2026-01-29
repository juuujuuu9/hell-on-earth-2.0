/**
 * Check Bottoms Category Script
 * 
 * Lists all categories and products in the bottoms category
 */

import { config } from 'dotenv';
import { db } from '../src/lib/db';
import { categories, products, productCategories } from '../src/lib/db/schema';
import { eq } from 'drizzle-orm';

config({ path: '.env.local' });
config({ path: '.env' });

async function main() {
  console.log('🔍 Checking Categories and Bottoms Products\n');

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not configured!');
    process.exit(1);
  }

  try {
    const allCategories = await db.select().from(categories);
    
    console.log('📋 All Categories:');
    allCategories.forEach(cat => {
      console.log(`   - ${cat.name} (slug: ${cat.slug})`);
    });

    const bottomsCategory = allCategories.find(c => 
      c.name.toLowerCase().includes('bottom') || 
      c.slug.toLowerCase().includes('bottom')
    );

    if (!bottomsCategory) {
      console.log('\n❌ No "bottoms" category found!');
      return;
    }

    console.log(`\n👖 Bottoms Category: ${bottomsCategory.name} (${bottomsCategory.slug})`);

    // Get all products in bottoms category
    const bottomsProducts = await db
      .select({
        product: products,
        pc: productCategories,
      })
      .from(productCategories)
      .innerJoin(products, eq(productCategories.productId, products.id))
      .where(eq(productCategories.categoryId, bottomsCategory.id));

    console.log(`\n📦 Products in Bottoms category (${bottomsProducts.length}):`);
    bottomsProducts.forEach(({ product }) => {
      console.log(`   - ${product.name}`);
    });

    // Check for jeans products
    const allJeans = await db
      .select()
      .from(products)
      .where(eq(products.name, 'Logo Jeans (Black)') || eq(products.name, 'Logo Jeans (Blue)'));

    console.log('\n👖 All Jeans Products:');
    const jeansProducts = await db.select().from(products);
    jeansProducts
      .filter(p => p.name.toLowerCase().includes('jeans'))
      .forEach(product => {
        const inBottoms = bottomsProducts.some(bp => bp.product.id === product.id);
        console.log(`   ${inBottoms ? '✅' : '❌'} ${product.name} ${inBottoms ? '(in bottoms)' : '(NOT in bottoms)'}`);
      });

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : 'Unknown error');
    if (error instanceof Error && error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();
