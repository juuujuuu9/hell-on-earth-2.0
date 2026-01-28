/**
 * Debug Bunny.net Credentials
 * 
 * Shows what credentials are being used
 */

import { config } from 'dotenv';

config({ path: '.env.local' });
config({ path: '.env' });

console.log('🔍 Bunny.net Credentials Debug\n');
console.log('BUNNY_API_KEY:', process.env.BUNNY_API_KEY ? `${process.env.BUNNY_API_KEY.substring(0, 10)}...` : 'NOT SET');
console.log('BUNNY_STORAGE_ZONE:', process.env.BUNNY_STORAGE_ZONE || 'NOT SET');
console.log('BUNNY_CDN_URL:', process.env.BUNNY_CDN_URL || 'NOT SET');
console.log('\n📝 Testing API call...\n');

const apiKey = process.env.BUNNY_API_KEY;
const storageZone = process.env.BUNNY_STORAGE_ZONE;

if (!apiKey || !storageZone) {
  console.error('❌ Missing credentials');
  process.exit(1);
}

const testUrl = `https://storage.bunnycdn.com/${storageZone}/test.txt`;
console.log('URL:', testUrl);
console.log('AccessKey header:', apiKey.substring(0, 20) + '...');
console.log('\nMaking request...\n');

fetch(testUrl, {
  method: 'PUT',
  headers: {
    'AccessKey': apiKey,
    'Content-Type': 'text/plain',
  },
  body: Buffer.from('test'),
})
  .then(async (res) => {
    console.log('Status:', res.status, res.statusText);
    const text = await res.text();
    console.log('Response:', text);
    
    if (res.status === 401) {
      console.log('\n💡 Troubleshooting:');
      console.log('1. Verify the storage zone name matches EXACTLY as shown in dashboard');
      console.log('2. Check that you copied the Password (not Read-Only Password)');
      console.log('3. Ensure HTTP API is enabled for this storage zone');
      console.log('4. Try regenerating the password in FTP & HTTP API section');
    }
  })
  .catch((err) => {
    console.error('Error:', err.message);
  });
