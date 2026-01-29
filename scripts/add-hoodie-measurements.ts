/**
 * Add Measurements to Hoodie Products Script
 * 
 * Adds measurements data (Sleeve, Width, Length) to all hoodie products
 * 
 * Usage:
 *   npx tsx scripts/add-hoodie-measurements.ts
 */

import { config } from 'dotenv';
import { db } from '../src/lib/db';
import { products } from '../src/lib/db/schema';
import { eq, or, like } from 'drizzle-orm';

// Load environment variables
config({ path: '.env.local' });
config({ path: '.env' });

// Measurements data structure for hoodies
interface HoodieMeasurementSize {
  size: string; // e.g., "XS", "S", "M", "L", "XL", "XXL"
  measurements: {
    'Sleeve (IN)': string;
    'Width (IN)': string;
    'Length (IN)': string;
  };
}

interface HoodieMeasurementsData {
  sizes: HoodieMeasurementSize[];
}

// Measurements for all hoodie sizes
const hoodieMeasurements: HoodieMeasurementsData = {
  sizes: [
    {
      size: 'XS',
      measurements: {
        'Sleeve (IN)': '33 1/2',
        'Width (IN)': '23',
        'Length (IN)': '23 1/2',
      },
    },
    {
      size: 'S',
      measurements: {
        'Sleeve (IN)': '34 1/2',
        'Width (IN)': '24',
        'Length (IN)': '24 1/2',
      },
    },
    {
      size: 'M',
      measurements: {
        'Sleeve (IN)': '35 1/2',
        'Width (IN)': '25',
        'Length (IN)': '25',
      },
    },
    {
      size: 'L',
      measurements: {
        'Sleeve (IN)': '36 1/2',
        'Width (IN)': '26 1/2',
        'Length (IN)': '26',
      },
    },
    {
      size: 'XL',
      measurements: {
        'Sleeve (IN)': '37 1/4',
        'Width (IN)': '28 1/2',
        'Length (IN)': '27',
      },
    },
    {
      size: 'XXL',
      measurements: {
        'Sleeve (IN)': '38',
        'Width (IN)': '30 1/2',
        'Length (IN)': '28',
      },
    },
  ],
};

async function main(): Promise<void> {
  console.log('📏 Adding Measurements to Hoodie Products\n');

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not configured!');
    process.exit(1);
  }

  try {
    // Find all hoodie products by name pattern
    const hoodieProducts = await db
      .select()
      .from(products)
      .where(
        or(
          like(products.name, '%Hoodie%'),
          like(products.name, '%hoodie%')
        )
      );

    if (hoodieProducts.length === 0) {
      console.log('⚠️  No hoodie products found.');
      return;
    }

    console.log(`📋 Found ${hoodieProducts.length} hoodie product(s):\n`);
    hoodieProducts.forEach(p => console.log(`   - ${p.name}`));
    console.log('');

    // Store measurements as JSON string (wrapped in array to match rendering format)
    const measurementsJson = JSON.stringify([hoodieMeasurements], null, 2);

    let updatedCount = 0;

    // Update each product with measurements
    for (const product of hoodieProducts) {
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
    console.log(`✅ Products updated: ${updatedCount} out of ${hoodieProducts.length}`);
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
