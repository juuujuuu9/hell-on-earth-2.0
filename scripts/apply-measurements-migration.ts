/**
 * Apply measurements column migration
 * 
 * This script adds the measurements column to the products table
 * Usage: npx tsx scripts/apply-measurements-migration.ts
 */

import { config } from 'dotenv';
import { neon } from '@neondatabase/serverless';

// Load environment variables
config({ path: '.env.local' });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in .env.local');
  process.exit(1);
}

async function applyMigration() {
  console.log('🚀 Applying measurements column migration...\n');

  try {
    const sql = neon(DATABASE_URL);
    
    // Check if column already exists
    const checkResult = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'products' AND column_name = 'measurements'
    `;
    
    if (checkResult.length > 0) {
      console.log('✅ Measurements column already exists\n');
      return;
    }
    
    // Add the measurements column
    await sql`ALTER TABLE "products" ADD COLUMN "measurements" text`;
    console.log('✅ Successfully added measurements column to products table\n');
    
  } catch (error: any) {
    console.error('❌ Migration failed:');
    console.error(error.message);
    
    // If column already exists, that's okay
    if (error.message?.includes('already exists') || error.message?.includes('duplicate')) {
      console.log('\n✅ Column already exists (this is fine)\n');
      return;
    }
    
    process.exit(1);
  }
}

applyMigration();
