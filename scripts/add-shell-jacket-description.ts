/**
 * Add Description to Shell Jacket Blue
 * 
 * Adds a description to the Shell Jacket Blue product
 */

import { config } from 'dotenv';
import { db } from '../src/lib/db';
import { products } from '../src/lib/db/schema';
import { eq, like } from 'drizzle-orm';

config({ path: '.env.local' });
config({ path: '.env' });

async function main(): Promise<void> {
  console.log('📝 Adding Description to Shell Jacket Blue\n');

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not configured!');
    process.exit(1);
  }

  try {
    // Find Shell Jacket Blue product
    const productResults = await db
      .select()
      .from(products)
      .where(eq(products.name, 'Shell Jacket (Blue)'));

    let product;
    
    if (productResults.length === 0) {
      // Try alternative name formats
      const allProducts = await db.select().from(products);
      product = allProducts.find(
        p => p.name.toLowerCase().includes('shell jacket') && 
             p.name.toLowerCase().includes('blue')
      );

      if (!product) {
        console.error('❌ Shell Jacket Blue product not found!');
        console.log('\nAvailable products with "shell" or "jacket" in name:');
        const relatedProducts = allProducts.filter(
          p => p.name.toLowerCase().includes('shell') || 
               p.name.toLowerCase().includes('jacket')
        );
        relatedProducts.forEach(p => console.log(`   - ${p.name} (slug: ${p.slug})`));
        process.exit(1);
      }
    } else {
      product = productResults[0];
    }

    console.log(`Found product: ${product.name} (ID: ${product.id})\n`);

    const description = `A versatile shell jacket designed for performance and style. Crafted with premium materials including waterproof and windproof technology, this jacket offers protection from the elements while maintaining breathability.

The Shell Jacket (Blue) features a detachable hood, multiple pockets for storage, and a regular fit that works for various activities. Whether you're navigating urban environments or exploring the outdoors, this jacket provides the functionality you need without compromising on aesthetics.

Constructed from a blend of polyester and nylon with a mesh lining, the jacket balances durability with comfort. The clean blue colorway makes it easy to pair with your existing wardrobe while standing out with its distinctive style.`;

    // Update description
    await db
      .update(products)
      .set({ description })
      .where(eq(products.id, product.id));

    console.log('✅ Description added successfully!');
    console.log(`\nProduct: ${product.name}`);
    console.log(`Description length: ${description.length} characters`);
    console.log(`\nPreview:\n${description.substring(0, 150)}...`);
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : 'Unknown error');
    if (error instanceof Error && error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();
