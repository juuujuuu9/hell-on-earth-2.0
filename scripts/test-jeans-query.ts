/**
 * Test Logo Jeans Query
 */

import { config } from 'dotenv';
import { getAllProducts } from '../src/lib/db/queries';

config({ path: '.env.local' });
config({ path: '.env' });

async function main() {
  console.log('🔍 Testing Logo Jeans Query\n');

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not configured!');
    process.exit(1);
  }

  try {
    const allProducts = await getAllProducts();
    const jeansProducts = allProducts.filter(p => 
      p.name.toLowerCase().includes('logo jeans')
    );

    console.log(`📋 Found ${jeansProducts.length} Logo Jeans product(s) in query results:\n`);

    for (const product of jeansProducts) {
      console.log(`\n📦 ${product.name}`);
      console.log(`   ID: ${product.id}`);
      console.log(`   Slug: ${product.slug}`);
      console.log(`   Has image: ${product.image ? 'YES' : 'NO'}`);
      if (product.image) {
        console.log(`   Image URL: ${product.image.sourceUrl}`);
        console.log(`   Image alt: ${product.image.altText || 'N/A'}`);
      }
      console.log(`   Gallery images: ${product.galleryImages?.nodes.length || 0}`);
      if (product.galleryImages?.nodes) {
        product.galleryImages.nodes.forEach((img, i) => {
          console.log(`     ${i + 1}. ${img.altText || 'N/A'}`);
          console.log(`        ${img.sourceUrl}`);
        });
      }
    }
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : 'Unknown error');
    if (error instanceof Error && error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();
