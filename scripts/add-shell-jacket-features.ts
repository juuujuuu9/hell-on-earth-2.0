/**
 * Add Dummy Features to Shell Jacket Blue
 * 
 * Adds dummy product features/attributes to the Shell Jacket Blue product
 */

import { config } from 'dotenv';
import { db } from '../src/lib/db';
import { products, productAttributes } from '../src/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { randomUUID } from 'crypto';

config({ path: '.env.local' });
config({ path: '.env' });

async function main() {
  console.log('🎯 Adding Dummy Features to Shell Jacket Blue\n');

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not configured!');
    process.exit(1);
  }

  try {
    // Find the Shell Jacket Blue product
    const shellJacketProducts = await db
      .select()
      .from(products)
      .where(eq(products.name, 'Shell Jacket (Blue)'));

    if (shellJacketProducts.length === 0) {
      // Try alternative name formats
      const allProducts = await db.select().from(products);
      const blueJacket = allProducts.find(
        p => p.name.toLowerCase().includes('shell jacket') && 
             p.name.toLowerCase().includes('blue')
      );

      if (!blueJacket) {
        console.error('❌ Shell Jacket Blue product not found!');
        console.log('\nAvailable products with "shell" or "jacket" in name:');
        const relatedProducts = allProducts.filter(
          p => p.name.toLowerCase().includes('shell') || 
               p.name.toLowerCase().includes('jacket')
        );
        relatedProducts.forEach(p => console.log(`   - ${p.name} (slug: ${p.slug})`));
        process.exit(1);
      }

      await addFeatures(blueJacket);
    } else {
      await addFeatures(shellJacketProducts[0]);
    }

    console.log('\n✅ Done!');
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : 'Unknown error');
    if (error instanceof Error && error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

async function addFeatures(product: typeof products.$inferSelect) {
  console.log(`📦 Found product: ${product.name} (ID: ${product.id})\n`);

  // Define dummy features
  const dummyFeatures = [
    { name: 'Waterproof', options: ['Yes'] },
    { name: 'Windproof', options: ['Yes'] },
    { name: 'Breathable', options: ['Yes'] },
    { name: 'Material', options: ['Polyester', 'Nylon'] },
    { name: 'Lining', options: ['Mesh'] },
    { name: 'Pockets', options: ['2 Side Pockets', '1 Chest Pocket'] },
    { name: 'Hood', options: ['Detachable'] },
    { name: 'Fit', options: ['Regular'] },
  ];

  let added = 0;
  let updated = 0;
  let skipped = 0;

  for (const feature of dummyFeatures) {
    // Check if attribute already exists
    const existingAttributes = await db
      .select()
      .from(productAttributes)
      .where(
        and(
          eq(productAttributes.productId, product.id),
          eq(productAttributes.name, feature.name)
        )
      );

    const optionsJson = JSON.stringify(feature.options);

    if (existingAttributes.length > 0) {
      // Update existing attribute
      const existing = existingAttributes[0];
      if (existing.options !== optionsJson) {
        await db
          .update(productAttributes)
          .set({ options: optionsJson })
          .where(eq(productAttributes.id, existing.id));
        
        console.log(`   ✏️  Updated ${feature.name}: ${feature.options.join(', ')}`);
        updated++;
      } else {
        console.log(`   ✓ Already set: ${feature.name}: ${feature.options.join(', ')}`);
        skipped++;
      }
    } else {
      // Add new attribute
      await db.insert(productAttributes).values({
        id: randomUUID(),
        productId: product.id,
        name: feature.name,
        options: optionsJson,
      });

      console.log(`   ➕ Added ${feature.name}: ${feature.options.join(', ')}`);
      added++;
    }
  }

  console.log('\n📊 Summary:');
  console.log(`   Added: ${added}`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Skipped: ${skipped}`);
}

main();
