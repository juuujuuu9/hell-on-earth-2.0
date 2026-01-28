/**
 * Remove Therma Mask (black) product completely
 * 
 * Deletes the product and all related records (images, categories, attributes)
 * via cascade delete
 */

import { config } from 'dotenv';
import { db } from '../src/lib/db';
import { products, productImages, productCategories, productAttributes } from '../src/lib/db/schema';
import { eq, ilike } from 'drizzle-orm';

// Load environment variables
config({ path: '.env.local' });
config({ path: '.env' });

async function main() {
  console.log('🗑️  Removing Therma Mask (black) product\n');

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not configured!');
    process.exit(1);
  }

  try {
    // Find the product - search for "therma mask" and "black"
    const productResults = await db
      .select()
      .from(products)
      .where(
        ilike(products.name, '%therma%mask%black%')
      )
      .limit(10);

    if (productResults.length === 0) {
      console.log('❌ Product not found! Searching for all products with "therma" or "mask"...\n');
      
      // Try broader search
      const broaderResults = await db
        .select()
        .from(products)
        .where(
          ilike(products.name, '%therma%')
        )
        .limit(20);
      
      if (broaderResults.length > 0) {
        console.log('Found products with "therma":');
        broaderResults.forEach(p => console.log(`   - ${p.name} (${p.slug})`));
      }

      const maskResults = await db
        .select()
        .from(products)
        .where(
          ilike(products.name, '%mask%')
        )
        .limit(20);
      
      if (maskResults.length > 0) {
        console.log('\nFound products with "mask":');
        maskResults.forEach(p => console.log(`   - ${p.name} (${p.slug})`));
      }
      
      process.exit(1);
    }

    // Find exact match or closest match
    let productToDelete = productResults.find(p => 
      p.name.toLowerCase().includes('therma') && 
      p.name.toLowerCase().includes('mask') && 
      p.name.toLowerCase().includes('black')
    );

    if (!productToDelete && productResults.length === 1) {
      productToDelete = productResults[0];
    }

    if (!productToDelete) {
      console.log('❌ Could not find exact match. Found products:');
      productResults.forEach(p => console.log(`   - ${p.name} (${p.slug})`));
      process.exit(1);
    }

    console.log(`📋 Found product to delete:`);
    console.log(`   Name: ${productToDelete.name}`);
    console.log(`   Slug: ${productToDelete.slug}`);
    console.log(`   ID: ${productToDelete.id}\n`);

    // Show related records before deletion
    const images = await db
      .select()
      .from(productImages)
      .where(eq(productImages.productId, productToDelete.id));
    
    const categories = await db
      .select()
      .from(productCategories)
      .where(eq(productCategories.productId, productToDelete.id));
    
    const attributes = await db
      .select()
      .from(productAttributes)
      .where(eq(productAttributes.productId, productToDelete.id));

    console.log(`📊 Related records:`);
    console.log(`   Images: ${images.length}`);
    console.log(`   Categories: ${categories.length}`);
    console.log(`   Attributes: ${attributes.length}\n`);

    // Delete the product (cascade will delete related records)
    await db
      .delete(products)
      .where(eq(products.id, productToDelete.id));

    console.log(`✅ Successfully deleted product: "${productToDelete.name}"`);
    console.log(`   (Cascade deleted ${images.length} image(s), ${categories.length} category link(s), ${attributes.length} attribute(s))`);

    // Verify deletion
    const verifyResults = await db
      .select()
      .from(products)
      .where(eq(products.id, productToDelete.id))
      .limit(1);

    if (verifyResults.length === 0) {
      console.log(`\n✅ Verification: Product successfully removed from database`);
    } else {
      console.log(`\n⚠️  Warning: Product still exists in database`);
    }

    // List remaining mask products
    const remainingMasks = await db
      .select()
      .from(products)
      .where(
        ilike(products.name, '%mask%')
      );

    console.log(`\n📋 Remaining mask products (${remainingMasks.length}):`);
    remainingMasks.forEach(p => console.log(`   - ${p.name} (${p.slug})`));

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : 'Unknown error');
    if (error instanceof Error && error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();
