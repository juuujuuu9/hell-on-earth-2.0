/**
 * Apply Shell Jacket Blue Details to Other Shell Jackets
 * 
 * Copies the description and features from Shell Jacket Blue to all other shell jackets
 */

import { config } from 'dotenv';
import { db } from '../src/lib/db';
import { products, productAttributes } from '../src/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { randomUUID } from 'crypto';

config({ path: '.env.local' });
config({ path: '.env' });

async function main(): Promise<void> {
  console.log('📝 Applying Shell Jacket Blue Details to Other Shell Jackets\n');

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not configured!');
    process.exit(1);
  }

  try {
    // Find Shell Jacket Blue product
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

    console.log(`✅ Found source product: ${blueJacket.name} (ID: ${blueJacket.id})\n`);

    // Get blue jacket's description
    const blueDescription = blueJacket.description || '';
    
    // Get blue jacket's features/attributes
    const blueAttributes = await db
      .select()
      .from(productAttributes)
      .where(eq(productAttributes.productId, blueJacket.id));

    console.log(`📋 Source description length: ${blueDescription.length} characters`);
    console.log(`📋 Source features count: ${blueAttributes.length}\n`);

    // Find all other shell jackets (excluding blue)
    const otherShellJackets = allProducts.filter(
      p => p.name.toLowerCase().includes('shell jacket') && 
           !p.name.toLowerCase().includes('blue')
    );

    if (otherShellJackets.length === 0) {
      console.log('⚠️  No other shell jackets found to update.');
      process.exit(0);
    }

    console.log(`🎯 Found ${otherShellJackets.length} other shell jacket(s) to update:\n`);
    otherShellJackets.forEach(p => console.log(`   - ${p.name}`));
    console.log('');

    // Apply details to each shell jacket
    for (const jacket of otherShellJackets) {
      console.log(`\n📦 Processing: ${jacket.name} (ID: ${jacket.id})`);
      
      // Update description (replace color name)
      const jacketColor = jacket.name.match(/\(([^)]+)\)/)?.[1] || 'Shell Jacket';
      const updatedDescription = blueDescription
        .replace(/Shell Jacket \(Blue\)/g, jacket.name)
        .replace(/Shell Jacket \(Blue/g, `Shell Jacket (${jacketColor}`)
        .replace(/blue colorway/g, `${jacketColor.toLowerCase()} colorway`)
        .replace(/The clean blue/g, `The clean ${jacketColor.toLowerCase()}`);

      await db
        .update(products)
        .set({ description: updatedDescription })
        .where(eq(products.id, jacket.id));

      console.log(`   ✅ Updated description`);

      // Apply features/attributes
      let added = 0;
      let updated = 0;
      let skipped = 0;

      for (const attribute of blueAttributes) {
        // Check if attribute already exists
        const existingAttributes = await db
          .select()
          .from(productAttributes)
          .where(
            and(
              eq(productAttributes.productId, jacket.id),
              eq(productAttributes.name, attribute.name)
            )
          );

        if (existingAttributes.length > 0) {
          // Update existing attribute
          const existing = existingAttributes[0];
          if (existing.options !== attribute.options) {
            await db
              .update(productAttributes)
              .set({ options: attribute.options })
              .where(eq(productAttributes.id, existing.id));
            
            console.log(`   ✏️  Updated ${attribute.name}`);
            updated++;
          } else {
            console.log(`   ✓ Already set: ${attribute.name}`);
            skipped++;
          }
        } else {
          // Add new attribute
          await db.insert(productAttributes).values({
            id: randomUUID(),
            productId: jacket.id,
            name: attribute.name,
            options: attribute.options,
          });

          console.log(`   ➕ Added ${attribute.name}`);
          added++;
        }
      }

      console.log(`   📊 Features: ${added} added, ${updated} updated, ${skipped} skipped`);
    }

    console.log('\n✅ Done! All shell jackets updated successfully.');
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : 'Unknown error');
    if (error instanceof Error && error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();
