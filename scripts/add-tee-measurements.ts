/**
 * Add Measurements to Tee Shirt Products Script
 * 
 * Adds measurements data (Body Length, Chest, Sleeve Length) to all products in the tees category
 * 
 * Usage:
 *   npx tsx scripts/add-tee-measurements.ts
 */

import { config } from 'dotenv';
import { db } from '../src/lib/db';
import { products, categories, productCategories } from '../src/lib/db/schema';
import { eq, inArray } from 'drizzle-orm';

// Load environment variables
config({ path: '.env.local' });
config({ path: '.env' });

// Measurements data structure for tee shirts
interface TeeMeasurementSize {
  size: string; // e.g., "XS", "S", "M", "L", "XL", "2XL", "3XL"
  measurements: {
    'Body Length': string;
    'Chest': string;
    'Sleeve Length': string;
  };
}

interface TeeMeasurementsData {
  sizes: TeeMeasurementSize[];
}

// Measurements for all tee shirt sizes
const teeMeasurements: TeeMeasurementsData = {
  sizes: [
    {
      size: 'XS',
      measurements: {
        'Body Length': '25 3⁄4',
        'Chest': '17',
        'Sleeve Length': '8 1⁄2',
      },
    },
    {
      size: 'S',
      measurements: {
        'Body Length': '26 3⁄4',
        'Chest': '19',
        'Sleeve Length': '8 3⁄4',
      },
    },
    {
      size: 'M',
      measurements: {
        'Body Length': '27 3⁄4',
        'Chest': '21',
        'Sleeve Length': '9',
      },
    },
    {
      size: 'L',
      measurements: {
        'Body Length': '28 3⁄4',
        'Chest': '23',
        'Sleeve Length': '9 1⁄4',
      },
    },
    {
      size: 'XL',
      measurements: {
        'Body Length': '29 3⁄4',
        'Chest': '25',
        'Sleeve Length': '9 1⁄2',
      },
    },
    {
      size: '2XL',
      measurements: {
        'Body Length': '30 3⁄4',
        'Chest': '27',
        'Sleeve Length': '9 3⁄4',
      },
    },
    {
      size: '3XL',
      measurements: {
        'Body Length': '31 3⁄4',
        'Chest': '29',
        'Sleeve Length': '10',
      },
    },
  ],
};

async function main(): Promise<void> {
  console.log('📏 Adding Measurements to Tee Shirt Products\n');

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not configured!');
    process.exit(1);
  }

  try {
    // Find the tees category
    const categoryResults = await db
      .select({ id: categories.id, slug: categories.slug, name: categories.name })
      .from(categories)
      .where(eq(categories.slug, 'tees'))
      .limit(1);

    if (categoryResults.length === 0) {
      console.error('❌ Tees category not found!');
      process.exit(1);
    }

    const teesCategory = categoryResults[0];
    console.log(`📦 Found category: ${teesCategory.name} (${teesCategory.slug})\n`);

    // Get all products in the tees category
    const productCategoryResults = await db
      .select({ productId: productCategories.productId })
      .from(productCategories)
      .where(eq(productCategories.categoryId, teesCategory.id));

    if (productCategoryResults.length === 0) {
      console.log('⚠️  No products found in tees category.');
      return;
    }

    const productIds = productCategoryResults.map(pc => pc.productId);
    const teeProducts = await db
      .select()
      .from(products)
      .where(inArray(products.id, productIds));

    console.log(`📋 Found ${teeProducts.length} tee product(s)\n`);

    // Store measurements as JSON string (wrapped in array to match rendering format)
    const measurementsJson = JSON.stringify([teeMeasurements], null, 2);

    let updatedCount = 0;

    // Update each product with measurements
    for (const product of teeProducts) {
      await db
        .update(products)
        .set({
          measurements: measurementsJson,
          updatedAt: new Date(),
        })
        .where(eq(products.id, product.id));

      console.log(`   ✅ Updated "${product.name}"`);
      updatedCount++;
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Summary:\n');
    console.log(`✅ Products updated: ${updatedCount} out of ${teeProducts.length}`);
    console.log('\n💡 Measurements stored as JSON and ready for table display');
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : 'Unknown error');
    if (error instanceof Error && error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();
