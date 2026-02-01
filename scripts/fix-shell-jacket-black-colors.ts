/**
 * Fix Shell Jacket (Black) and (BlackWhite) Color Attributes
 *
 * Ensures these products are not classified as blue. Sets Color to black/blackwhite only.
 * Run once: npx tsx scripts/fix-shell-jacket-black-colors.ts
 */

import { config } from 'dotenv';
import { db } from '../src/lib/db';
import { products, productAttributes } from '../src/lib/db/schema';
import { eq, and } from 'drizzle-orm';

config({ path: '.env.local' });
config({ path: '.env' });

const FIXES: { productName: string; colors: string[] }[] = [
  { productName: 'Shell Jacket (BlackWhite)', colors: ['blackwhite'] },
  { productName: 'Shell Jacket (Black)', colors: ['black'] },
];

async function main(): Promise<void> {
  console.log('🎨 Fixing Shell Jacket (Black) and (BlackWhite) color attributes\n');

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not configured!');
    process.exit(1);
  }

  try {
    const allProducts = await db.select().from(products);

    for (const { productName, colors } of FIXES) {
      const product = allProducts.find((p) => p.name === productName);
      if (!product) {
        console.log(`   ⏭️  No product found: ${productName}`);
        continue;
      }

      const existing = await db
        .select()
        .from(productAttributes)
        .where(
          and(
            eq(productAttributes.productId, product.id),
            eq(productAttributes.name, 'Color')
          )
        );

      const optionsJson = JSON.stringify(colors);
      if (existing.length > 0) {
        await db
          .update(productAttributes)
          .set({ options: optionsJson })
          .where(eq(productAttributes.id, existing[0].id));
        console.log(`   ✅ ${product.name}: Color set to [${colors.join(', ')}]`);
      } else {
        const { randomUUID } = await import('crypto');
        await db.insert(productAttributes).values({
          id: randomUUID(),
          productId: product.id,
          name: 'Color',
          options: optionsJson,
        });
        console.log(`   ➕ ${product.name}: Color added as [${colors.join(', ')}]`);
      }
    }

    console.log('\n✅ Done.');
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

main();
