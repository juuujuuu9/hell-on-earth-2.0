/**
 * Add size variations to all products
 *
 * Assigns sizes per product type (labels only, no measurements). Each size gets quantity 1.
 * Sizes are derived from existing measurement scripts: tees, hoodies, jackets, jeans, beanies/masks.
 *
 * Prerequisite: Run apply-size-inventory-migration.ts first.
 * Usage: npx tsx scripts/add-product-sizes.ts
 */

import { config } from 'dotenv';
import { db } from '../src/lib/db';
import { products, productSizeInventory } from '../src/lib/db/schema';
import { eq, and } from 'drizzle-orm';

config({ path: '.env.local' });
config({ path: '.env' });

// Size labels only (no measurements), per product type
const SIZES_BY_TYPE = {
  tee: ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'],
  hoodie: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  jacket: ['S', 'M', 'L', 'XL'],
  jeans: ['28"', '29"', '30"', '31"', '32"', '33"', '34"', '36"', '38"'],
  beanie: ['One Size'],
  mask: ['One Size'],
} as const;

function getSizesForProduct(name: string): string[] {
  const n = name.toLowerCase();
  if (n.includes('jacket')) return [...SIZES_BY_TYPE.jacket];
  if (n.includes('hoodie')) return [...SIZES_BY_TYPE.hoodie];
  if (n.includes('tee') || n.includes('t-shirt') || n.includes('shirt')) return [...SIZES_BY_TYPE.tee];
  if (n.includes('jeans') || n.includes('denim')) return [...SIZES_BY_TYPE.jeans];
  if (n.includes('beanie')) return [...SIZES_BY_TYPE.beanie];
  if (n.includes('mask') || n.includes('therma')) return [...SIZES_BY_TYPE.mask];
  // Default: apparel sizes
  return [...SIZES_BY_TYPE.tee];
}

function generateId(): string {
  return crypto.randomUUID();
}

async function main(): Promise<void> {
  console.log('📐 Adding size variations to all products (quantity 1 per size)\n');

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not configured');
    process.exit(1);
  }

  const allProducts = await db.select({ id: products.id, name: products.name }).from(products);

  if (allProducts.length === 0) {
    console.log('⚠️ No products found.');
    return;
  }

  let added = 0;
  let skipped = 0;

  for (const product of allProducts) {
    const sizes = getSizesForProduct(product.name);

    for (const size of sizes) {
      const existing = await db
        .select({ id: productSizeInventory.id })
        .from(productSizeInventory)
        .where(and(eq(productSizeInventory.productId, product.id), eq(productSizeInventory.size, size)))
        .limit(1);

      if (existing.length > 0) {
        skipped++;
        continue;
      }

      await db.insert(productSizeInventory).values({
        id: generateId(),
        productId: product.id,
        size,
        quantity: 1,
      });
      added++;
      console.log(`   ${product.name} → ${size} (qty 1)`);
    }
  }

  console.log(`\n✅ Done. Added ${added} size rows, skipped ${skipped} (already present).\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
