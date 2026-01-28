/**
 * Test Bunny.net Connection Script
 * 
 * Run: npx tsx scripts/test-bunny.ts
 * 
 * Tests that Bunny.net credentials are configured correctly
 */

import { config } from 'dotenv';
import { testBunnyConnection } from '../src/lib/bunny';

// Load environment variables (try .env.local first, then .env)
config({ path: '.env.local' });
config({ path: '.env' });

async function main() {
  console.log('🧪 Testing Bunny.net connection...\n');

  const result = await testBunnyConnection();

  if (result.success) {
    console.log('✅', result.message);
    console.log('\n📝 Bunny.net is ready to use!');
    console.log('   - Storage Zone:', process.env.BUNNY_STORAGE_ZONE);
    console.log('   - CDN URL:', process.env.BUNNY_CDN_URL);
  } else {
    console.error('❌', result.message);
    console.log('\n💡 Setup instructions:');
    console.log('1. Sign up at https://bunny.net');
    console.log('2. Create a storage zone');
    console.log('3. Get your API key from the dashboard');
    console.log('4. Add to .env.local:');
    console.log('   BUNNY_API_KEY=your-api-key');
    console.log('   BUNNY_STORAGE_ZONE=your-storage-zone-name');
    console.log('   BUNNY_CDN_URL=https://your-storage-zone.b-cdn.net');
    process.exit(1);
  }
}

main();
