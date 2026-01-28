/**
 * Upload logos and videos to Bunny.net CDN
 * 
 * This script uploads:
 * - Header logo: 3d-logo-header.webp
 * - Hero logo: 3d-logo-hero.webp
 * - All videos in the /videos/creep/ directory
 */

import { config } from 'dotenv';
import { uploadFileToBunny } from '../src/lib/bunny';
import { readdir } from 'fs/promises';
import { join } from 'path';

// Load environment variables (try .env.local first, then .env)
config({ path: '.env.local' });
config({ path: '.env' });

async function uploadLogosAndVideos() {
  console.log('🚀 Starting upload of logos and videos to Bunny.net...\n');

  const publicDir = join(process.cwd(), 'public');
  const results: Array<{ file: string; url: string; success: boolean; error?: string }> = [];

  // Upload logos
  const logos = [
    { localPath: join(publicDir, '3d-logo-header.webp'), bunnyPath: 'logos/3d-logo-header.webp' },
    { localPath: join(publicDir, '3d-logo-hero.webp'), bunnyPath: 'logos/3d-logo-hero.webp' },
  ];

  console.log('📸 Uploading logos...');
  for (const logo of logos) {
    try {
      console.log(`  Uploading ${logo.bunnyPath}...`);
      const url = await uploadFileToBunny(logo.localPath, logo.bunnyPath);
      results.push({ file: logo.bunnyPath, url, success: true });
      console.log(`  ✅ Success: ${url}\n`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      results.push({ file: logo.bunnyPath, url: '', success: false, error: errorMessage });
      console.log(`  ❌ Failed: ${errorMessage}\n`);
    }
  }

  // Upload videos
  const videosDir = join(publicDir, 'videos', 'creep');
  console.log('🎬 Uploading videos...');
  
  try {
    const videoFiles = await readdir(videosDir);
    const webmFiles = videoFiles.filter(file => file.endsWith('.webm'));

    for (const videoFile of webmFiles) {
      const localPath = join(videosDir, videoFile);
      const bunnyPath = `videos/creep/${videoFile}`;
      
      try {
        console.log(`  Uploading ${bunnyPath}...`);
        const url = await uploadFileToBunny(localPath, bunnyPath);
        results.push({ file: bunnyPath, url, success: true });
        console.log(`  ✅ Success: ${url}\n`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.push({ file: bunnyPath, url: '', success: false, error: errorMessage });
        console.log(`  ❌ Failed: ${errorMessage}\n`);
      }
    }
  } catch (error) {
    console.error(`❌ Error reading videos directory: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // Summary
  console.log('\n📊 Upload Summary:');
  console.log('='.repeat(60));
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`✅ Successful: ${successful.length}`);
  successful.forEach(r => {
    console.log(`   ${r.file}`);
    console.log(`   → ${r.url}`);
  });
  
  if (failed.length > 0) {
    console.log(`\n❌ Failed: ${failed.length}`);
    failed.forEach(r => {
      console.log(`   ${r.file}: ${r.error}`);
    });
  }
  
  console.log('='.repeat(60));
  
  if (failed.length > 0) {
    process.exit(1);
  }
}

uploadLogosAndVideos().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
