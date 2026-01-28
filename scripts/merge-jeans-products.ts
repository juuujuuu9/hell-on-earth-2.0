/**
 * Merge Logo Jeans Back/Front Products Script
 * 
 * Merges "Logo Jeans Black (Back)" and "Logo Jeans Black (Front)" into one product
 * Same for Blue. Ensures front image is primary.
 * 
 * Usage:
 *   npx tsx scripts/merge-jeans-products.ts
 */

import { config } from 'dotenv';
import { db } from '../src/lib/db';
import { products, productImages, productCategories } from '../src/lib/db/schema';
import { eq, like, or } from 'drizzle-orm';
import { randomUUID } from 'crypto';

// Load environment variables
config({ path: '.env.local' });
config({ path: '.env' });

async function main() {
  console.log('🔄 Merge Logo Jeans Back/Front Products\n');

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not configured!');
    process.exit(1);
  }

  try {
    // Find all Logo Jeans products (case-insensitive search)
    const allProducts = await db
      .select()
      .from(products)
      .where(
        or(
          like(products.name, '%Logo Jeans%'),
          like(products.name, '%logo jeans%'),
          like(products.slug, '%logo-jeans%'),
          like(products.slug, '%jeans%')
        )
      );

    console.log(`📋 Found ${allProducts.length} Logo Jeans product(s)\n`);

    // Group products by color (Black or Blue)
    const productGroups = new Map<string, Array<{ product: typeof products.$inferSelect; isFront: boolean; isBack: boolean }>>();

    for (const product of allProducts) {
      const nameLower = product.name.toLowerCase();
      const isBlack = nameLower.includes('black');
      const isBlue = nameLower.includes('blue');
      const isFront = nameLower.includes('front');
      const isBack = nameLower.includes('back');

      if (!isBlack && !isBlue) continue;

      const color = isBlack ? 'black' : 'blue';
      const key = `logo-jeans-${color}`;

      if (!productGroups.has(key)) {
        productGroups.set(key, []);
      }

      productGroups.get(key)!.push({ product, isFront, isBack });
    }

    let merged = 0;
    let skipped = 0;

    for (const [key, group] of productGroups.entries()) {
      // Even if only one product, we still need to fix the images and ensure front is primary
      if (group.length === 0) {
        console.log(`   ⚠️  ${key}: No products found, skipping`);
        skipped++;
        continue;
      }

      const frontProduct = group.find(p => p.isFront);
      const backProduct = group.find(p => p.isBack);
      const otherProducts = group.filter(p => !p.isFront && !p.isBack);

      if (!frontProduct && !backProduct) {
        console.log(`   ⚠️  ${key}: No Front/Back products found, skipping`);
        skipped++;
        continue;
      }

      // Use front product as the main product, or first product if no front
      const mainProduct = frontProduct || group[0];
      const mainProductId = mainProduct.product.id;
      const color = key.includes('black') ? 'Black' : 'Blue';
      const targetName = `Logo Jeans (${color})`;
      const targetSlug = `logo-jeans-${color.toLowerCase()}`;

      console.log(`\n📦 Merging ${key}:`);
      console.log(`   Main product: ${mainProduct.product.name} (${mainProduct.product.id})`);

      // Update main product name and slug if needed
      if (mainProduct.product.name !== targetName) {
        await db
          .update(products)
          .set({
            name: targetName,
            slug: targetSlug,
            updatedAt: new Date(),
          })
          .where(eq(products.id, mainProductId));
        console.log(`   ✅ Updated name to: ${targetName}`);
      }

      // Get all images from all products in the group
      const allImages = await db
        .select()
        .from(productImages)
        .where(
          or(
            ...group.map(p => eq(productImages.productId, p.product.id))
          )
        );

      // Separate front and back images based on alt text and URL
      const frontImages = allImages.filter(img => {
        const altLower = (img.altText || '').toLowerCase();
        const urlLower = (img.imageUrl || '').toLowerCase();
        return altLower.includes('front') || urlLower.includes('front') || 
               (altLower.includes('logo jeans') && !altLower.includes('back') && !urlLower.includes('back'));
      });

      const backImages = allImages.filter(img => {
        const altLower = (img.altText || '').toLowerCase();
        const urlLower = (img.imageUrl || '').toLowerCase();
        return (altLower.includes('back') || urlLower.includes('back')) && 
               !altLower.includes('front') && !urlLower.includes('front');
      });

      const otherImages = allImages.filter(img => {
        const altLower = (img.altText || '').toLowerCase();
        const urlLower = (img.imageUrl || '').toLowerCase();
        return !altLower.includes('front') && !altLower.includes('back') &&
               !urlLower.includes('front') && !urlLower.includes('back');
      });

      // Delete all existing images for main product
      await db
        .delete(productImages)
        .where(eq(productImages.productId, mainProductId));

      // Re-insert images in order: front first (as primary), then back, then others
      let sortOrder = 0;

      // Front images first (primary) - if no front images, use first image as primary
      if (frontImages.length > 0) {
        for (const img of frontImages) {
          await db.insert(productImages).values({
            id: `img-${randomUUID().split('-')[0]}-${Date.now()}-${sortOrder}`,
            productId: mainProductId,
            imageUrl: img.imageUrl,
            altText: `${targetName} - Front`,
            isPrimary: sortOrder === 0, // First front image is primary
            sortOrder: sortOrder++,
            createdAt: new Date(),
          });
        }
      } else if (allImages.length > 0) {
        // If no front images found, check if we need to look for front images in the file system
        // For now, mark the first non-back image as primary
        const firstNonBack = allImages.find(img => {
          const altLower = (img.altText || '').toLowerCase();
          const urlLower = (img.imageUrl || '').toLowerCase();
          return !altLower.includes('back') && !urlLower.includes('back');
        });
        
        if (firstNonBack) {
          await db.insert(productImages).values({
            id: `img-${randomUUID().split('-')[0]}-${Date.now()}-${sortOrder}`,
            productId: mainProductId,
            imageUrl: firstNonBack.imageUrl,
            altText: `${targetName} - Front`,
            isPrimary: true,
            sortOrder: sortOrder++,
            createdAt: new Date(),
          });
        }
      }

      // Back images
      for (const img of backImages) {
        await db.insert(productImages).values({
          id: `img-${randomUUID().split('-')[0]}-${Date.now()}-${sortOrder}`,
          productId: mainProductId,
          imageUrl: img.imageUrl,
          altText: `${targetName} - Back`,
          isPrimary: false,
          sortOrder: sortOrder++,
          createdAt: new Date(),
        });
      }

      // Other images (that aren't front or back)
      for (const img of otherImages) {
        // Skip if already added as front
        if (frontImages.length === 0 || !frontImages.includes(img)) {
          await db.insert(productImages).values({
            id: `img-${randomUUID().split('-')[0]}-${Date.now()}-${sortOrder}`,
            productId: mainProductId,
            imageUrl: img.imageUrl,
            altText: img.altText || targetName,
            isPrimary: false,
            sortOrder: sortOrder++,
            createdAt: new Date(),
          });
        }
      }

      console.log(`   ✅ Merged ${allImages.length} image(s) (${frontImages.length} front, ${backImages.length} back)`);

      // Move categories from other products to main product
      for (const item of group) {
        if (item.product.id === mainProductId) continue;

        const categories = await db
          .select()
          .from(productCategories)
          .where(eq(productCategories.productId, item.product.id));

        for (const cat of categories) {
          // Check if category already exists for main product
          const existing = await db
            .select()
            .from(productCategories)
            .where(eq(productCategories.productId, mainProductId))
            .where(eq(productCategories.categoryId, cat.categoryId))
            .limit(1);

          if (existing.length === 0) {
            await db.insert(productCategories).values({
              id: `pc-${randomUUID().split('-')[0]}-${Date.now()}`,
              productId: mainProductId,
              categoryId: cat.categoryId,
              createdAt: new Date(),
            });
          }
        }
      }

      // Delete other products (back product and any others)
      for (const item of group) {
        if (item.product.id === mainProductId) continue;

        // Delete product (cascade will delete images and categories)
        await db
          .delete(products)
          .where(eq(products.id, item.product.id));
        console.log(`   🗑️  Deleted duplicate product: ${item.product.name}`);
      }

      merged++;
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Summary:\n');
    console.log(`✅ Merged product groups: ${merged}`);
    console.log(`⚠️  Skipped: ${skipped}`);
    console.log('\n💡 View products: npm run db:studio');
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : 'Unknown error');
    if (error instanceof Error && error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();
