/**
 * Apply product_size_inventory table migration
 *
 * Creates the product_size_inventory table for size variations with updatable quantities.
 * Run once before add-product-sizes.ts.
 *
 * Usage: npx tsx scripts/apply-size-inventory-migration.ts
 */

import { config } from 'dotenv';
import { neon } from '@neondatabase/serverless';

config({ path: '.env.local' });
config({ path: '.env' });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in .env.local or .env');
  process.exit(1);
}

async function applyMigration(): Promise<void> {
  console.log('🚀 Applying product_size_inventory table migration...\n');

  try {
    const sql = neon(DATABASE_URL);

    const checkResult = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'product_size_inventory'
    `;

    if (checkResult.length > 0) {
      console.log('✅ product_size_inventory table already exists\n');
      return;
    }

    await sql`
      CREATE TABLE "product_size_inventory" (
        "id" text PRIMARY KEY NOT NULL,
        "product_id" text NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
        "size" text NOT NULL,
        "quantity" integer DEFAULT 0 NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL,
        UNIQUE("product_id", "size")
      )
    `;
    console.log('✅ Successfully created product_size_inventory table\n');
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('❌ Migration failed:');
    console.error(message);
    if (message.includes('already exists') || message.includes('duplicate')) {
      console.log('\n✅ Table already exists (this is fine)\n');
      return;
    }
    process.exit(1);
  }
}

applyMigration();
