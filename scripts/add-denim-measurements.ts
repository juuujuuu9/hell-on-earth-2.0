/**
 * Add Measurements to Denim Products Script
 * 
 * Adds measurements data to all denim/jeans products
 * 
 * Usage:
 *   npx tsx scripts/add-denim-measurements.ts
 */

import { config } from 'dotenv';
import { db } from '../src/lib/db';
import { products } from '../src/lib/db/schema';
import { eq, or, like } from 'drizzle-orm';

// Load environment variables
config({ path: '.env.local' });
config({ path: '.env' });

// Measurements data structure
interface MeasurementSize {
  size: string; // e.g., "28\"", "29\"", "30\""
  waist: {
    inch: string;
    cm: string;
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
  sizeRange: string; // e.g., "28\" – 30\""
  sizes: MeasurementSize[];
}

// Measurements for sizes 28" - 30"
const measurements28to30: MeasurementsData = {
  sizeRange: '28" – 30"',
  sizes: [
    {
      size: '28"',
      waist: { inch: '28½-29½', cm: '73-75' },
      lowHip: { inch: '35½-36', cm: '90-92' },
      lengths: {
        '32"': { inch: '31½-32', cm: '80-82' },
        '30"': { inch: '29½-30', cm: '76-78' },
        '34"': { inch: '33½-34', cm: '84-86' },
      },
    },
    {
      size: '29"',
      waist: { inch: '29½-31', cm: '75-78' },
      lowHip: { inch: '36-37', cm: '92-94' },
      lengths: {
        '32"': { inch: '32-33', cm: '81-83' },
        '30"': { inch: '30-31', cm: '77-79' },
        '34"': { inch: '34-35', cm: '85-87' },
      },
    },
    {
      size: '30"',
      waist: { inch: '31-32', cm: '78-81' },
      lowHip: { inch: '37-38', cm: '94-97' },
      lengths: {
        '32"': { inch: '32-33', cm: '81-83' },
        '30"': { inch: '30-31', cm: '77-79' },
        '34"': { inch: '34-35', cm: '85-87' },
      },
    },
  ],
};

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

// Combined measurements data (all three size ranges)
const measurementsData: MeasurementsData[] = [
  measurements28to30,
  measurements31to33,
  measurements34to38,
];

async function main(): Promise<void> {
  console.log('📏 Adding Measurements to Denim Products\n');

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not configured!');
    process.exit(1);
  }

  try {
    // Find all denim/jeans products by name pattern
    const denimProducts = await db
      .select()
      .from(products)
      .where(
        or(
          like(products.name, '%Jeans%'),
          like(products.name, '%jeans%'),
          like(products.name, '%Denim%'),
          like(products.name, '%denim%')
        )
      );

    if (denimProducts.length === 0) {
      console.log('⚠️  No denim/jeans products found.');
      return;
    }

    console.log(`📋 Found ${denimProducts.length} denim product(s):\n`);
    denimProducts.forEach(p => console.log(`   - ${p.name}`));
    console.log('');

    // Store measurements as JSON string
    const measurementsJson = JSON.stringify(measurementsData, null, 2);

    let updatedCount = 0;

    // Update each product with measurements
    for (const product of denimProducts) {
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
    console.log(`✅ Products updated: ${updatedCount} out of ${denimProducts.length}`);
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
