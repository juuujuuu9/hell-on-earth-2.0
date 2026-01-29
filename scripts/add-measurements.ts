/**
 * Add Measurements to Products Script
 * 
 * Adds measurements data to products in tees, jackets (outerwear), and denim (bottoms) categories
 * 
 * Usage:
 *   npx tsx scripts/add-measurements.ts
 */

import { config } from 'dotenv';
import { db } from '../src/lib/db';
import { products, categories, productCategories } from '../src/lib/db/schema';
import { eq, inArray } from 'drizzle-orm';

// Load environment variables
config({ path: '.env.local' });
config({ path: '.env' });

// Measurements data structure
interface MeasurementSize {
  size: string; // e.g., "31\"", "32\"", "33\""
  waist: {
    inch: string; // e.g., "32-33"
    cm: string; // e.g., "81-84"
  };
  lowHip: {
    inch: string;
    cm: string;
  };
  lengths: {
    '32"': {
      inch: string;
      cm: string;
    };
    '30"': {
      inch: string;
      cm: string;
    };
    '34"': {
      inch: string;
      cm: string;
    };
  };
}

interface MeasurementsData {
  sizeRange: string; // e.g., "31\" – 33\""
  sizes: MeasurementSize[];
}

// Measurements for sizes 31" - 33"
const measurements31to33: MeasurementsData = {
  sizeRange: '31" – 33"',
  sizes: [
    {
      size: '31"',
      waist: { inch: '32-33', cm: '81-84' },
      lowHip: { inch: '38-39', cm: '97-99' },
      lengths: {
        '32"': { inch: '32-33', cm: '81-83' },
        '30"': { inch: '30-31', cm: '77-79' },
        '34"': { inch: '34-35', cm: '85-87' },
      },
    },
    {
      size: '32"',
      waist: { inch: '33-34', cm: '84-87' },
      lowHip: { inch: '39-40', cm: '99-101' },
      lengths: {
        '32"': { inch: '32-33', cm: '82-84' },
        '30"': { inch: '30-31', cm: '79-80' },
        '34"': { inch: '34-35', cm: '86-88' },
      },
    },
    {
      size: '33"',
      waist: { inch: '34-35', cm: '87-89' },
      lowHip: { inch: '40-40½', cm: '101-103' },
      lengths: {
        '32"': { inch: '32-33', cm: '82-84' },
        '30"': { inch: '30-31', cm: '79-80' },
        '34"': { inch: '34-35', cm: '86-88' },
      },
    },
  ],
};

// Measurements for sizes 34" - 38"
const measurements34to38: MeasurementsData = {
  sizeRange: '34" – 38"',
  sizes: [
    {
      size: '34"',
      waist: { inch: '35-36½', cm: '89-92' },
      lowHip: { inch: '40½-41½', cm: '103-105' },
      lengths: {
        '32"': { inch: '32-33', cm: '82-84' },
        '30"': { inch: '30-31', cm: '79-80' },
        '34"': { inch: '34-35', cm: '86-88' },
      },
    },
    {
      size: '36"',
      waist: { inch: '37-38½', cm: '94-98' },
      lowHip: { inch: '42-43', cm: '106-109' },
      lengths: {
        '32"': { inch: '33-33½', cm: '83-85' },
        '30"': { inch: '31-31½', cm: '79-81' },
        '34"': { inch: '35-35½', cm: '87-89' },
      },
    },
    {
      size: '38"',
      waist: { inch: '39-41', cm: '100-104' },
      lowHip: { inch: '43½-44½', cm: '110-113' },
      lengths: {
        '32"': { inch: '33-33½', cm: '83-85' },
        '30"': { inch: '31-31½', cm: '79-81' },
        '34"': { inch: '35-35½', cm: '87-89' },
      },
    },
  ],
};

// Combined measurements data (both size ranges)
const measurementsData: MeasurementsData[] = [measurements31to33, measurements34to38];

async function main() {
  console.log('📏 Adding Measurements to Products\n');

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not configured!');
    process.exit(1);
  }

  try {
    // Get category IDs for tees, outerwear (jackets), and bottoms (denim)
    const categorySlugs = ['tees', 'outerwear', 'bottoms'];
    const categoryResults = await db
      .select({ id: categories.id, slug: categories.slug, name: categories.name })
      .from(categories)
      .where(inArray(categories.slug, categorySlugs));

    if (categoryResults.length === 0) {
      console.error('❌ No matching categories found. Please create categories first.');
      process.exit(1);
    }

    const categoryMap = new Map(categoryResults.map(c => [c.slug, c]));
    console.log('📦 Found categories:');
    categoryResults.forEach(cat => {
      console.log(`   ✅ ${cat.name} (${cat.slug})`);
    });
    console.log('');

    // Get all products in these categories
    const categoryIds = categoryResults.map(c => c.id);
    const productCategoryResults = await db
      .select({
        productId: productCategories.productId,
        categoryId: productCategories.categoryId,
      })
      .from(productCategories)
      .where(inArray(productCategories.categoryId, categoryIds));

    if (productCategoryResults.length === 0) {
      console.log('⚠️  No products found in these categories.');
      return;
    }

    const productIds = [...new Set(productCategoryResults.map(pc => pc.productId))];
    const productResults = await db
      .select()
      .from(products)
      .where(inArray(products.id, productIds));

    console.log(`📋 Found ${productResults.length} product(s) to update\n`);

    // Store measurements as JSON string
    const measurementsJson = JSON.stringify(measurementsData, null, 2);

    let updated = 0;
    let skipped = 0;

    // Update each product with measurements
    for (const product of productResults) {
      // Find which category this product belongs to
      const productCategory = productCategoryResults.find(pc => pc.productId === product.id);
      if (!productCategory) {
        skipped++;
        continue;
      }

      const category = categoryResults.find(c => c.id === productCategory.categoryId);
      if (!category) {
        skipped++;
        continue;
      }

      // Update product with measurements
      await db
        .update(products)
        .set({
          measurements: measurementsJson,
          updatedAt: new Date(),
        })
        .where(eq(products.id, product.id));

      console.log(`   ✅ Updated "${product.name}" (${category.name})`);
      updated++;
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Summary:\n');
    console.log(`✅ Products updated: ${updated}`);
    if (skipped > 0) {
      console.log(`⚠️  Products skipped: ${skipped}`);
    }
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
