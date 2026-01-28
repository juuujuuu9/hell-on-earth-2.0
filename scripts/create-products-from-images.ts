/**
 * Create Products from Images Script
 * 
 * Analyzes images in a folder and creates products based on filenames.
 * Groups images with same base name + color as the same product.
 * Handles Front/Back and (1)/(2) variations as gallery images.
 * 
 * Usage:
 *   npx tsx scripts/create-products-from-images.ts --dir=public/products/images/MMXXVI-I
 */

import { config } from 'dotenv';
import { readdir, readFile } from 'fs/promises';
import { join, extname, basename } from 'path';
import { uploadImageToBunny } from '../src/lib/bunny';
import { db } from '../src/lib/db';
import { products, productImages } from '../src/lib/db/schema';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

// Load environment variables
config({ path: '.env.local' });
config({ path: '.env' });

interface ImageInfo {
  filename: string;
  filePath: string;
  baseName: string; // Product name without color/view
  color: string; // Color/variant
  view: 'front' | 'back' | 'none'; // Front, Back, or none
  viewNumber: number | null; // (1) or (2) if present
}

interface ProductGroup {
  productName: string; // Full product name with color
  slug: string;
  color: string;
  images: ImageInfo[];
}

/**
 * Parse filename to extract product info
 */
function parseFilename(filename: string): ImageInfo {
  const nameWithoutExt = basename(filename, extname(filename));
  
  // Remove view indicators and extract them
  let baseName = nameWithoutExt;
  let view: 'front' | 'back' | 'none' = 'none';
  let viewNumber: number | null = null;
  
  // Check for (Front) or (Back) in parentheses
  if (baseName.includes('(Front)')) {
    view = 'front';
    baseName = baseName.replace(/\s*\(Front\)\s*/gi, ' ').trim();
  } else if (baseName.includes('(Back)')) {
    view = 'back';
    baseName = baseName.replace(/\s*\(Back\)\s*/gi, ' ').trim();
  }
  
  // Also check for "Front" or "Back" as standalone words (case-insensitive)
  // But only if not already found in parentheses
  if (view === 'none') {
    const frontMatch = baseName.match(/\bFront\b/i);
    const backMatch = baseName.match(/\bBack\b/i);
    
    if (frontMatch && !backMatch) {
      view = 'front';
      baseName = baseName.replace(/\bFront\b/gi, '').trim();
    } else if (backMatch && !frontMatch) {
      view = 'back';
      baseName = baseName.replace(/\bBack\b/gi, '').trim();
    }
  }
  
  // Check for (1) or (2) - these are also front/back indicators
  const numberMatch = baseName.match(/\((\d+)\)/);
  if (numberMatch) {
    const num = parseInt(numberMatch[1]);
    if (num === 1) {
      view = 'front';
    } else if (num === 2) {
      view = 'back';
    }
    viewNumber = num;
    baseName = baseName.replace(/\s*\(\d+\)\s*/g, ' ').trim();
  }
  
  // Extract color from parentheses at the end
  // Pattern: "Product Name (Color)" or "Product Name (Color)(Color2)"
  const colorMatch = baseName.match(/\(([^)]+)\)(?:\s*\(([^)]+)\))?\s*$/);
  let color = '';
  
  if (colorMatch) {
    // Get all color parts
    const colors = [colorMatch[1], colorMatch[2]].filter(Boolean);
    color = colors.join(' ');
    
    // Remove color from base name
    baseName = baseName.replace(/\s*\([^)]+\)(?:\s*\([^)]+\))?\s*$/, '').trim();
  }
  
  // If no color found, check for color-like words at the end
  if (!color) {
    const colorWords = ['Black', 'White', 'Blue', 'Red', 'Green', 'BlackWhite'];
    for (const word of colorWords) {
      if (baseName.endsWith(` ${word}`) || baseName === word) {
        color = word;
        baseName = baseName.replace(new RegExp(`\\s*${word}\\s*$`, 'i'), '').trim();
        break;
      }
    }
  }
  
  // Clean up base name (remove extra spaces)
  baseName = baseName.replace(/\s+/g, ' ').trim();
  
  // If still no color, try to extract from remaining text
  if (!color) {
    // Check if the last word might be a color
    const parts = baseName.split(' ');
    const lastWord = parts[parts.length - 1];
    if (['Black', 'White', 'Blue', 'Red', 'Green', 'BlackWhite'].includes(lastWord)) {
      color = lastWord;
      baseName = parts.slice(0, -1).join(' ').trim();
    } else {
      // Don't use "Default" - just leave empty and we'll handle it in formatting
      color = '';
    }
  }
  
  // Capitalize color properly
  if (color) {
    color = color
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }
  
  return {
    filename,
    filePath: '', // Will be set later
    baseName,
    color,
    view,
    viewNumber,
  };
}

/**
 * Convert product name to slug
 */
function nameToSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Format product name (capitalize properly)
 */
function formatProductName(baseName: string, color: string): string {
  const formattedBase = baseName
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
  
  // Handle special cases like "Logo Jeans" - should be "Logo Jeans" not "Logo Jeans Front"
  // But we already removed Front/Back, so this should be fine
  
  if (color) {
    return `${formattedBase} (${color})`;
  } else {
    return formattedBase;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dirArg = args.find((arg) => arg.startsWith('--dir='));
  const targetDir = dirArg 
    ? join(process.cwd(), dirArg.split('=')[1])
    : join(process.cwd(), 'public', 'products', 'images');

  console.log('🛍️  Create Products from Images\n');
  console.log(`Directory: ${targetDir}\n`);

  // Check Bunny.net credentials
  if (!process.env.BUNNY_API_KEY || !process.env.BUNNY_STORAGE_ZONE || !process.env.BUNNY_CDN_URL) {
    console.error('❌ Bunny.net credentials not configured!');
    process.exit(1);
  }

  // Check database connection
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not configured!');
    process.exit(1);
  }

  try {
    // Read all image files
    const files = await readdir(targetDir);
    const imageFiles = files.filter((file) => {
      const ext = extname(file).toLowerCase();
      return ['.webp', '.png', '.jpg', '.jpeg'].includes(ext);
    });

    if (imageFiles.length === 0) {
      console.log('⚠️  No image files found');
      process.exit(0);
    }

    console.log(`Found ${imageFiles.length} image(s)\n`);
    console.log('📋 Parsing filenames...\n');

    // Parse all filenames
    const imageInfos: ImageInfo[] = imageFiles.map((filename) => {
      const info = parseFilename(filename);
      info.filePath = join(targetDir, filename);
      return info;
    });

    // Group by product (baseName + color)
    const productMap = new Map<string, ProductGroup>();

    for (const imageInfo of imageInfos) {
      const productKey = `${imageInfo.baseName}|${imageInfo.color}`;
      
      if (!productMap.has(productKey)) {
        const productName = formatProductName(imageInfo.baseName, imageInfo.color);
        productMap.set(productKey, {
          productName,
          slug: nameToSlug(productName),
          color: imageInfo.color,
          images: [],
        });
      }
      
      productMap.get(productKey)!.images.push(imageInfo);
    }

    console.log(`📦 Grouped into ${productMap.size} product(s):\n`);
    for (const [key, group] of productMap.entries()) {
      const imageCount = group.images.length;
      const views = group.images.map(img => img.view).filter(v => v !== 'none');
      console.log(`   ${group.productName} (${imageCount} image${imageCount > 1 ? 's' : ''}${views.length > 0 ? ` - ${views.join(', ')}` : ''})`);
    }
    console.log('');

    // Upload images and create products
    const results: Array<{
      productName: string;
      success: boolean;
      productId?: string;
      imagesUploaded?: number;
      error?: string;
    }> = [];

    for (const [key, group] of productMap.entries()) {
      console.log(`📤 Processing: ${group.productName}...`);

      try {
        // Check if product already exists
        const existing = await db
          .select()
          .from(products)
          .where(eq(products.slug, group.slug))
          .limit(1);

        let productId: string;
        
        if (existing.length > 0) {
          productId = existing[0].id;
          console.log(`   ℹ️  Product already exists (${productId})`);
        } else {
          // Create product
          productId = `prod-${randomUUID().split('-')[0]}-${Date.now()}`;
          await db.insert(products).values({
            id: productId,
            name: group.productName,
            slug: group.slug,
            stockStatus: 'IN_STOCK',
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          console.log(`   ✅ Created product: ${group.productName}`);
        }

        // Sort images: Front first, then Back, then others
        const sortedImages = [...group.images].sort((a, b) => {
          if (a.view === 'front' && b.view !== 'front') return -1;
          if (a.view !== 'front' && b.view === 'front') return 1;
          if (a.view === 'back' && b.view !== 'back') return -1;
          if (a.view !== 'back' && b.view === 'back') return 1;
          if (a.viewNumber !== null && b.viewNumber !== null) {
            return a.viewNumber - b.viewNumber;
          }
          return 0;
        });

        // Upload images and link to product
        let imagesUploaded = 0;
        for (let i = 0; i < sortedImages.length; i++) {
          const imageInfo = sortedImages[i];
          
          // Upload to Bunny.net
          const fileBuffer = await readFile(imageInfo.filePath);
          const bunnyFilename = `products/images/${imageInfo.filename}`;
          const cdnUrl = await uploadImageToBunny(fileBuffer, bunnyFilename);

          // Check if image already linked to this product
          const existingImage = await db
            .select()
            .from(productImages)
            .where(eq(productImages.productId, productId))
            .where(eq(productImages.imageUrl, cdnUrl))
            .limit(1);

          if (existingImage.length === 0) {
            // Add image to product_images table
            const imageId = `img-${randomUUID().split('-')[0]}-${Date.now()}`;
            const isPrimary = i === 0 || imageInfo.view === 'front';
            
            await db.insert(productImages).values({
              id: imageId,
              productId: productId,
              imageUrl: cdnUrl,
              altText: `${group.productName}${imageInfo.view !== 'none' ? ` - ${imageInfo.view}` : ''}`,
              isPrimary: isPrimary,
              sortOrder: i,
              createdAt: new Date(),
            });
            imagesUploaded++;
          }
        }

        console.log(`   ✅ Uploaded ${imagesUploaded} image(s)`);
        results.push({
          productName: group.productName,
          success: true,
          productId,
          imagesUploaded,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`   ❌ Failed: ${errorMessage}`);
        results.push({
          productName: group.productName,
          success: false,
          error: errorMessage,
        });
      }
      console.log('');
    }

    // Summary
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Summary:\n');
    
    const successful = results.filter((r) => r.success);
    const failed = results.filter((r) => !r.success);

    console.log(`✅ Successfully processed: ${successful.length} product(s)`);
    successful.forEach((r) => {
      console.log(`   - ${r.productName} (${r.imagesUploaded} image${r.imagesUploaded !== 1 ? 's' : ''})`);
    });

    if (failed.length > 0) {
      console.log(`\n❌ Failed: ${failed.length} product(s)`);
      failed.forEach((r) => {
        console.log(`   - ${r.productName}: ${r.error}`);
      });
    }

    if (successful.length > 0) {
      console.log('\n💡 Next steps:');
      console.log('   1. Review products: npm run db:studio');
      console.log('   2. Add prices, descriptions, and categories');
      console.log('   3. Add Stripe checkout URLs when ready');
    }
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

main();
