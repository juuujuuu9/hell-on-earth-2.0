/**
 * Check Logo Jeans Products Script
 * 
 * Lists all products that might be Logo Jeans variants
 */

import { config } from 'dotenv';
import { db } from '../src/lib/db';
import { products, productImages } from '../src/lib/db/schema';
import { eq, like, or } from 'drizzle-orm';

config({ path: '.env.local' });
config({ path: '.env' });

async function main() {
  console.log('🔍 Checking Logo Jeans Products\n');

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not configured!');
    process.exit(1);
  }

  try {
    // Find all products with "jeans" or "logo" in name
    const allProducts = await db
      .select()
      .from(products)
      .where(
        or(
          like(products.name, '%Jeans%'),
          like(products.name, '%jeans%'),
          like(products.name, '%Logo%'),
          like(products.name, '%logo%')
        )
      );

    console.log(`📋 Found ${allProducts.length} product(s):\n`);

    for (const product of allProducts) {
      const images = await db
        .select()
        .from(productImages)
        .where(eq(productImages.productId, product.id));

      const primaryImage = images.find(img => img.isPrimary);
      const imageCount = images.length;

      console.log(`   ${product.name}`);
      console.log(`      ID: ${product.id}`);
      console.log(`      Slug: ${product.slug}`);
      console.log(`      Images: ${imageCount} (primary: ${primaryImage ? 'yes' : 'no'})`);
      if (primaryImage) {
        console.log(`      Primary image alt: ${primaryImage.altText || 'N/A'}`);
      }
      console.log('');
    }
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

main();
