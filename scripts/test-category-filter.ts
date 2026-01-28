/**
 * Test Category Filter Script
 * 
 * Tests the category filtering to see what products are returned
 */

import { config } from 'dotenv';
import { getAllProducts } from '../src/lib/db/queries';

config({ path: '.env.local' });
config({ path: '.env' });

async function main() {
  console.log('🧪 Testing Category Filter\n');

  const categories = ['accessories', 'outerwear', 'bottoms', 'tees'];

  for (const categorySlug of categories) {
    console.log(`\n📦 Category: ${categorySlug}`);
    console.log('─'.repeat(50));
    
    try {
      const products = await getAllProducts(categorySlug);
      console.log(`Found ${products.length} product(s):`);
      products.forEach((p, i) => {
        console.log(`  ${i + 1}. ${p.name}`);
        if (p.productCategories?.nodes) {
          console.log(`     Categories: ${p.productCategories.nodes.map(c => c.slug).join(', ')}`);
        }
      });
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  console.log('\n\n📦 All Products (no filter)');
  console.log('─'.repeat(50));
  try {
    const allProducts = await getAllProducts();
    console.log(`Found ${allProducts.length} product(s)`);
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

main();
