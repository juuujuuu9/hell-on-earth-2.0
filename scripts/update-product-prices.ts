/**
 * Update Product Prices Script
 * 
 * Updates prices for all products based on MMXXVI-I pricing structure:
 * - Thermochromic Shell Jackets: $150.00
 * - Regular Blue Shell Jackets: $120.00
 * - Hoodies (Front graphic only): $80
 * - Hoodies (Front + Back Graphic): $90
 * - T-Shirts (Front graphic only): $50
 * - T-Shirts (Front + Back Graphic): $55
 * - Jeans: $90
 * - Beanies: $40
 * - Masks: $45
 */

import { config } from 'dotenv';
import { db } from '../src/lib/db';
import { products, productImages } from '../src/lib/db/schema';
import { eq } from 'drizzle-orm';

config({ path: '.env.local' });
config({ path: '.env' });

/**
 * Determine price based on product name and image count
 */
function determinePrice(productName: string, imageCount: number): string | null {
  const nameLower = productName.toLowerCase();
  
  // Shell Jackets
  if (nameLower.includes('jacket')) {
    // Regular Blue Shell Jackets: $120.00
    if (nameLower.includes('blue')) {
      return '120.00';
    }
    // All other Shell Jackets are Thermochromic: $150.00
    return '150.00';
  }
  
  // Hoodies
  if (nameLower.includes('hoodie')) {
    // Front + Back Graphic: $90 (2+ images)
    if (imageCount >= 2) {
      return '90.00';
    }
    // Front graphic only: $80
    return '80.00';
  }
  
  // T-Shirts
  if (nameLower.includes('tee') || nameLower.includes('t-shirt') || nameLower.includes('shirt')) {
    // Front + Back Graphic: $55 (2+ images)
    if (imageCount >= 2) {
      return '55.00';
    }
    // Front graphic only: $50
    return '50.00';
  }
  
  // Jeans: $90
  if (nameLower.includes('jeans') || nameLower.includes('denim')) {
    return '90.00';
  }
  
  // Beanies: $40
  if (nameLower.includes('beanie')) {
    return '40.00';
  }
  
  // Masks: $45
  if (nameLower.includes('mask') || nameLower.includes('therma')) {
    return '45.00';
  }
  
  // Default: no price match
  return null;
}

async function main(): Promise<void> {
  console.log('💰 Updating Product Prices (MMXXVI-I)\n');

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not configured!');
    process.exit(1);
  }

  try {
    const allProducts = await db.select().from(products);

    console.log(`📋 Processing ${allProducts.length} product(s)...\n`);

    let updated = 0;
    let skipped = 0;
    let unchanged = 0;

    for (const product of allProducts) {
      // Get all images for this product
      const images = await db
        .select()
        .from(productImages)
        .where(eq(productImages.productId, product.id));

      const imageCount = images.length;
      const newPrice = determinePrice(product.name, imageCount);

      if (!newPrice) {
        console.log(`   ⏭️  Skipping ${product.name} (no price match)`);
        skipped++;
        continue;
      }

      // Check if price needs updating
      const currentPrice = product.price;
      if (currentPrice === newPrice) {
        console.log(`   ✓ Already set: ${product.name} - $${newPrice}`);
        unchanged++;
        continue;
      }

      // Update price
      await db
        .update(products)
        .set({ price: newPrice })
        .where(eq(products.id, product.id));

      console.log(`   ✏️  Updated ${product.name}: $${currentPrice || 'N/A'} → $${newPrice} (${imageCount} image${imageCount !== 1 ? 's' : ''})`);
      updated++;
    }

    console.log('\n📊 Summary:');
    console.log(`   Updated: ${updated}`);
    console.log(`   Unchanged: ${unchanged}`);
    console.log(`   Skipped: ${skipped}`);
    console.log('\n✅ Done!');
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : 'Unknown error');
    if (error instanceof Error && error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();
