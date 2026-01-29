/**
 * Add Color Attributes to Products Script
 * 
 * Adds color attributes to products based on product names or manual mapping
 */

import { config } from 'dotenv';
import { db } from '../src/lib/db';
import { products, productAttributes } from '../src/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { randomUUID } from 'crypto';

config({ path: '.env.local' });
config({ path: '.env' });

/**
 * Extract color from product name
 * Colors are typically in parentheses at the end: "Product Name (Color)"
 */
function extractColorFromName(productName: string): string[] {
  const colors: string[] = [];
  
  // Extract text in parentheses (usually contains color)
  const parenMatch = productName.match(/\(([^)]+)\)/);
  if (parenMatch) {
    const colorText = parenMatch[1].trim();
    const lowerColor = colorText.toLowerCase();
    
    // Handle specific cases
    if (lowerColor === 'blackwhite' || lowerColor === 'black white') {
      colors.push('blackwhite');
    } else if (lowerColor === 'glow') {
      colors.push('therma glow');
    } else if (lowerColor === 'camo') {
      colors.push('camo');
    } else if (lowerColor.includes('black') && lowerColor.includes('blue')) {
      colors.push('black');
      colors.push('blue');
    } else if (lowerColor.includes('black') && lowerColor.includes('red')) {
      colors.push('black');
      colors.push('red');
    } else {
      // For simple single colors, use as-is but normalize
      const normalizedColor = colorText.toLowerCase();
      colors.push(normalizedColor);
    }
  } else {
    // Fallback: check entire name for color keywords
    const lowerName = productName.toLowerCase();
    
    if (lowerName.includes('blackwhite') || lowerName.includes('black white')) {
      colors.push('blackwhite');
    } else if (lowerName.includes('camo')) {
      colors.push('camo');
    } else if (lowerName.includes('therma glow') || lowerName.includes('thermaglow') || lowerName.includes('glow')) {
      colors.push('therma glow');
    } else if (lowerName.includes('black')) {
      colors.push('black');
    }
    
    if (lowerName.includes('white') && !lowerName.includes('blackwhite')) {
      colors.push('white');
    }
    
    if (lowerName.includes('blue')) {
      colors.push('blue');
    }
    
    if (lowerName.includes('red')) {
      colors.push('red');
    }
    
    if (lowerName.includes('green')) {
      colors.push('green');
    }
  }

  // Remove duplicates and return
  return Array.from(new Set(colors));
}

/**
 * Manual color mapping for specific products
 * Add product names or slugs here to override automatic detection
 */
const manualColorMap: Record<string, string[]> = {
  // Example: 'product-slug': ['black', 'white'],
  // Add your manual mappings here
};

async function main() {
  console.log('🎨 Adding Color Attributes to Products\n');

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not configured!');
    process.exit(1);
  }

  try {
    const allProducts = await db.select().from(products);

    console.log(`📋 Processing ${allProducts.length} product(s)...\n`);

    let added = 0;
    let updated = 0;
    let skipped = 0;

    for (const product of allProducts) {
      // Check if product already has color attribute
      const existingAttributes = await db
        .select()
        .from(productAttributes)
        .where(
          and(
            eq(productAttributes.productId, product.id),
            eq(productAttributes.name, 'Color')
          )
        );

      // Determine colors to use
      let colors: string[] = [];
      
      // Check manual mapping first
      if (manualColorMap[product.slug] || manualColorMap[product.name]) {
        colors = manualColorMap[product.slug] || manualColorMap[product.name] || [];
        console.log(`   📝 Using manual mapping for: ${product.name}`);
      } else {
        // Try to extract from name
        colors = extractColorFromName(product.name);
      }

      // Skip if no colors found
      if (colors.length === 0) {
        console.log(`   ⏭️  Skipping ${product.name} (no color detected)`);
        skipped++;
        continue;
      }

      const colorsJson = JSON.stringify(colors);

      if (existingAttributes.length > 0) {
        // Update existing color attribute
        const existing = existingAttributes[0];
        if (existing.options !== colorsJson) {
          await db
            .update(productAttributes)
            .set({ options: colorsJson })
            .where(eq(productAttributes.id, existing.id));
          
          console.log(`   ✏️  Updated ${product.name}: ${colors.join(', ')}`);
          updated++;
        } else {
          console.log(`   ✓ Already set: ${product.name}: ${colors.join(', ')}`);
        }
      } else {
        // Add new color attribute
        await db.insert(productAttributes).values({
          id: randomUUID(),
          productId: product.id,
          name: 'Color',
          options: colorsJson,
        });

        console.log(`   ➕ Added ${product.name}: ${colors.join(', ')}`);
        added++;
      }
    }

    console.log('\n📊 Summary:');
    console.log(`   Added: ${added}`);
    console.log(`   Updated: ${updated}`);
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
