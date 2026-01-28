/**
 * Check Quake Hoodie Products
 */

import { config } from 'dotenv';
import { db } from '../src/lib/db';
import { products, productImages } from '../src/lib/db/schema';
import { eq, like, or } from 'drizzle-orm';

config({ path: '.env.local' });
config({ path: '.env' });

async function main() {
  console.log('🔍 Checking Quake Hoodie Products\n');

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not configured!');
    process.exit(1);
  }

  try {
    const quakeProducts = await db
      .select()
      .from(products)
      .where(
        or(
          like(products.name, '%Quake%Hoodie%'),
          like(products.slug, '%quake%hoodie%')
        )
      );

    console.log(`📋 Found ${quakeProducts.length} Quake Hoodie product(s):\n`);

    for (const product of quakeProducts) {
      console.log(`\n📦 ${product.name}`);
      console.log(`   ID: ${product.id}`);
      console.log(`   Slug: ${product.slug}`);
      
      const images = await db
        .select()
        .from(productImages)
        .where(eq(productImages.productId, product.id))
        .orderBy(productImages.sortOrder);

      console.log(`   Images: ${images.length}`);
      
      for (const img of images) {
        console.log(`   - ${img.isPrimary ? '⭐ PRIMARY' : '  '} ${img.altText || 'N/A'}`);
        console.log(`     URL: ${img.imageUrl}`);
        console.log(`     Sort: ${img.sortOrder}`);
      }
    }
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

main();
