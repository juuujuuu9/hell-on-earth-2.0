/**
 * Batch Image Compression Script
 * 
 * Compresses PNGs (and other images) for web optimization
 * Converts to WebP for better compression (optional)
 * 
 * Usage:
 *   npx tsx scripts/compress-images.ts                    # Compress PNGs in place
 *   npx tsx scripts/compress-images.ts --webp             # Convert to WebP
 *   npx tsx scripts/compress-images.ts --dir public/products/images  # Custom directory
 */

import { readdir, readFile, writeFile, stat, rename, unlink } from 'fs/promises';
import { join, extname, basename, dirname } from 'path';
import sharp from 'sharp';

const DEFAULT_DIR = join(process.cwd(), 'public', 'products', 'images');
const SUPPORTED_FORMATS = ['.png', '.jpg', '.jpeg', '.webp'];

interface CompressionOptions {
  quality?: number;
  maxWidth?: number;
  maxHeight?: number;
  webp?: boolean;
}

interface CompressionResult {
  filename: string;
  originalSize: number;
  compressedSize: number;
  savings: number;
  savingsPercent: number;
  success: boolean;
  error?: string;
}

/**
 * Format bytes to human-readable size
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Compress a single image
 */
async function compressImage(
  filePath: string,
  options: CompressionOptions = {}
): Promise<CompressionResult> {
  const filename = basename(filePath);
  const ext = extname(filePath).toLowerCase();
  const dir = dirname(filePath);
  const nameWithoutExt = basename(filePath, ext);

  const {
    quality = 85,
    maxWidth = 2000,
    maxHeight = 2000,
    webp = false,
  } = options;

  try {
    // Get original file size
    const stats = await stat(filePath);
    const originalSize = stats.size;

    // Read image
    let image = sharp(filePath);

    // Get metadata
    const metadata = await image.metadata();
    const width = metadata.width || 0;
    const height = metadata.height || 0;

    // Resize if needed
    if (width > maxWidth || height > maxHeight) {
      image = image.resize(maxWidth, maxHeight, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    }

    // Determine output format and path
    const outputExt = webp ? '.webp' : ext;
    const outputPath = webp
      ? join(dir, `${nameWithoutExt}.webp`)
      : join(dir, `${nameWithoutExt}.tmp${ext}`); // Use temp file for in-place compression

    // Compress based on format
    if (webp || ext === '.png') {
      // PNG: use png compression
      if (ext === '.png' && !webp) {
        await image
          .png({
            quality: quality,
            compressionLevel: 9,
            adaptiveFiltering: true,
          })
          .toFile(outputPath);
      } else {
        // Convert to WebP
        await image
          .webp({
            quality: quality,
            effort: 6, // Higher effort = better compression, slower
          })
          .toFile(outputPath);
      }
    } else if (ext === '.jpg' || ext === '.jpeg') {
      await image
        .jpeg({
          quality: quality,
          mozjpeg: true, // Better compression
        })
        .toFile(outputPath);
    } else {
      // For other formats, just optimize
      await image.toFile(outputPath);
    }

    // Get compressed file size
    const compressedStats = await stat(outputPath);
    const compressedSize = compressedStats.size;
    const savings = originalSize - compressedSize;
    const savingsPercent = ((savings / originalSize) * 100);

    // Replace original with compressed version (if not WebP conversion)
    const finalPath = webp ? outputPath : filePath;
    if (!webp && outputPath !== filePath) {
      // Replace original with compressed temp file
      await rename(outputPath, filePath);
    }

    return {
      filename: basename(finalPath),
      originalSize,
      compressedSize,
      savings,
      savingsPercent,
      success: true,
    };
  } catch (error) {
    return {
      filename,
      originalSize: 0,
      compressedSize: 0,
      savings: 0,
      savingsPercent: 0,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function main() {
  const args = process.argv.slice(2);
  const webp = args.includes('--webp');
  const dirArg = args.find((arg) => arg.startsWith('--dir='));
  const targetDir = dirArg ? dirArg.split('=')[1] : DEFAULT_DIR;

  console.log('🖼️  Batch Image Compression\n');
  console.log(`Directory: ${targetDir}`);
  console.log(`Mode: ${webp ? 'Convert to WebP' : 'Compress in place'}\n`);

  try {
    // Read directory
    const files = await readdir(targetDir);
    const imageFiles = files.filter((file) => {
      const ext = extname(file).toLowerCase();
      return SUPPORTED_FORMATS.includes(ext);
    });

    if (imageFiles.length === 0) {
      console.log('⚠️  No supported image files found');
      console.log(`   Supported formats: ${SUPPORTED_FORMATS.join(', ')}`);
      process.exit(0);
    }

    console.log(`Found ${imageFiles.length} image(s) to compress:\n`);

    const results: CompressionResult[] = [];

    // Process each image
    for (const filename of imageFiles) {
      const filePath = join(targetDir, filename);
      console.log(`📦 Processing: ${filename}...`);

      const result = await compressImage(filePath, {
        quality: 85,
        maxWidth: 2000,
        maxHeight: 2000,
        webp,
      });

      if (result.success) {
        console.log(`   ✅ Compressed: ${formatBytes(result.originalSize)} → ${formatBytes(result.compressedSize)}`);
        console.log(`   💾 Saved: ${formatBytes(result.savings)} (${result.savingsPercent.toFixed(1)}%)`);
        if (webp && result.filename !== filename) {
          console.log(`   📄 Output: ${result.filename}`);
        }
      } else {
        console.error(`   ❌ Failed: ${result.error}`);
      }
      console.log('');

      results.push(result);
    }

    // Summary
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Summary:\n');

    const successful = results.filter((r) => r.success);
    const failed = results.filter((r) => !r.success);

    if (successful.length > 0) {
      const totalOriginal = successful.reduce((sum, r) => sum + r.originalSize, 0);
      const totalCompressed = successful.reduce((sum, r) => sum + r.compressedSize, 0);
      const totalSavings = totalOriginal - totalCompressed;
      const avgSavingsPercent = (totalSavings / totalOriginal) * 100;

      console.log(`✅ Successfully compressed: ${successful.length} file(s)`);
      console.log(`   Original size: ${formatBytes(totalOriginal)}`);
      console.log(`   Compressed size: ${formatBytes(totalCompressed)}`);
      console.log(`   Total savings: ${formatBytes(totalSavings)} (${avgSavingsPercent.toFixed(1)}%)`);
    }

    if (failed.length > 0) {
      console.log(`\n❌ Failed: ${failed.length} file(s)`);
      failed.forEach((r) => {
        console.log(`   - ${r.filename}: ${r.error}`);
      });
    }

    if (webp && successful.length > 0) {
      console.log('\n💡 Note: Original files kept. Delete manually if satisfied with WebP versions.');
    }
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

main();
