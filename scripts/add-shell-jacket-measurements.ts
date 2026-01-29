/**
 * Add Measurements to Shell Jacket Products Script
 * 
 * Adds measurements data (Body, Shoulder, Chest) to all Shell Jacket products
 * 
 * Usage:
 *   npx tsx scripts/add-shell-jacket-measurements.ts
 */

import { config } from 'dotenv';
import { db } from '../src/lib/db';
import { products } from '../src/lib/db/schema';
import { eq, like, or } from 'drizzle-orm';

// Load environment variables
config({ path: '.env.local' });
config({ path: '.env' });

// Measurements data structure for shell jackets
interface ShellJacketMeasurementSize {
  size: string; // e.g., "S", "M", "L", "XL"
  measurements: {
    'Body': string;
    'Shoulder': string;
    'Chest': string;
  };
}

interface ShellJacketMeasurementsData {
  sizes: ShellJacketMeasurementSize[];
}

// Measurements for all shell jacket sizes
const shellJacketMeasurements: ShellJacketMeasurementsData = {
  sizes: [
    {
      size: 'S',
      measurements: {
        'Body': '50cm',
        'Shoulder': '59cm',
        'Chest': '63cm',
      },
    },
    {
      size: 'M',
      measurements: {
        'Body': '52cm',
        'Shoulder': '62cm',
        'Chest': '65cm',
      },
    },
    {
      size: 'L',
      measurements: {
        'Body': '54cm',
        'Shoulder': '65cm',
        'Chest': '67cm',
      },
    },
    {
      size: 'XL',
      measurements: {
        'Body': '56cm',
        'Shoulder': '68cm',
        'Chest': '69cm',
      },
    },
  ],
};

async function main(): Promise<void> {
  console.log('📏 Adding Measurements to Shell Jacket Products\n');

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not configured!');
    process.exit(1);
  }

  try {
    // Find all shell jacket products by name pattern
    const shellJacketProducts = await db
      .select()
      .from(products)
      .where(
        or(
          like(products.name, '%Shell Jacket%'),
          like(products.name, '%shell jacket%')
        )
      );

    if (shellJacketProducts.length === 0) {
      console.log('⚠️  No shell jacket products found.');
      return;
    }

    console.log(`📋 Found ${shellJacketProducts.length} shell jacket product(s):\n`);
    shellJacketProducts.forEach(p => console.log(`   - ${p.name}`));
    console.log('');

    // Store measurements as JSON string (wrapped in array to match rendering format)
    const measurementsJson = JSON.stringify([shellJacketMeasurements], null, 2);

    let updatedCount = 0;

    // Update each product with measurements
    for (const product of shellJacketProducts) {
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
    console.log(`✅ Products updated: ${updatedCount} out of ${shellJacketProducts.length}`);
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
