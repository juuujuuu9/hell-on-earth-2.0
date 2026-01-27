/**
 * Database Setup Script
 * 
 * Run this script to initialize your database schema
 * Usage: npx tsx scripts/setup-db.ts
 */

import { config } from 'dotenv';
import { neon } from '@neondatabase/serverless';

// Load environment variables
config({ path: '.env.local' });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in .env.local');
  console.log('\nPlease add your Neon DB connection string to .env.local:');
  console.log('DATABASE_URL=postgresql://user:password@host/database?sslmode=require\n');
  process.exit(1);
}

async function setupDatabase() {
  console.log('🚀 Setting up database...\n');

  try {
    const sql = neon(DATABASE_URL);
    
    // Test connection
    await sql`SELECT 1`;
    console.log('✅ Database connection successful\n');

    console.log('📝 Next steps:');
    console.log('1. Run: npm run db:generate');
    console.log('2. Run: npm run db:push');
    console.log('3. Run: npm run db:studio (to add products)\n');
    
  } catch (error) {
    console.error('❌ Database connection failed:');
    console.error(error);
    console.log('\nPlease check your DATABASE_URL in .env.local');
    process.exit(1);
  }
}

setupDatabase();
