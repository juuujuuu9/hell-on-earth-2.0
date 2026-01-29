/**
 * Check Product Colors Script
 * 
 * Lists all products and their color attributes
 */

import { config } from 'dotenv';
import { db } from '../src/lib/db';
import { products, productAttributes } from '../src/lib/db/schema';
import { eq } from 'drizzle-orm';

config({ path: '.env.local' });
config({ path: '.env' });

async function main() {
  console.log('🔍 Checking Product Colors\n');

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not configured!');
    process.exit(1);
  }

  try {
    const allProducts = await db.select().from(products);

    console.log(`📋 Found ${allProducts.length} product(s):\n`);

    let productsWithColors = 0;
    let productsWithoutColors = 0;
    const allColorValues = new Set<string>();

    for (const product of allProducts) {
      const attributes = await db
        .select()
        .from(productAttributes)
        .where(eq(productAttributes.productId, product.id));

      const colorAttribute = attributes.find(attr => attr.name.toLowerCase() === 'color');
      
      if (colorAttribute) {
        productsWithColors++;
        const colors = JSON.parse(colorAttribute.options) as string[];
        colors.forEach(color => allColorValues.add(color));
        
        console.log(`   ✅ ${product.name}`);
        console.log(`      Colors: ${colors.join(', ')}`);
      } else {
        productsWithoutColors++;
        console.log(`   ❌ ${product.name} (no color attribute)`);
      }
    }

    console.log('\n📊 Summary:');
    console.log(`   Products with colors: ${productsWithColors}`);
    console.log(`   Products without colors: ${productsWithoutColors}`);
    console.log(`   Unique color values: ${Array.from(allColorValues).sort().join(', ')}`);
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

main();
