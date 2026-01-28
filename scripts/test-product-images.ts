/**
 * Test Product Images Query
 */

import { config } from 'dotenv';
import { getAllProducts } from '../src/lib/db/queries';

config({ path: '.env.local' });
config({ path: '.env' });

async function main() {
  console.log('🔍 Testing Product Images Query\n');

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not configured!');
    process.exit(1);
  }

  try {
    const allProducts = await getAllProducts();
    
    // Find products with multiple images
    const productsWithMultipleImages = allProducts.filter(p => 
      p.galleryImages && p.galleryImages.nodes && p.galleryImages.nodes.length > 1
    );

    console.log(`📋 Found ${productsWithMultipleImages.length} product(s) with multiple images:\n`);

    for (const product of productsWithMultipleImages.slice(0, 5)) {
      console.log(`\n📦 ${product.name}`);
      console.log(`   Primary image: ${product.image ? 'YES' : 'NO'}`);
      if (product.image) {
        console.log(`   Primary URL: ${product.image.sourceUrl}`);
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
