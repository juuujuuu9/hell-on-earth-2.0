/**
 * Create Categories and Assign Products Script
 * 
 * Creates product categories and assigns products based on their names
 * 
 * Usage:
 *   npx tsx scripts/create-categories.ts
 */

import { config } from 'dotenv';
import { db } from '../src/lib/db';
import { categories, products, productCategories } from '../src/lib/db/schema';
import { eq, like, or } from 'drizzle-orm';
import { randomUUID } from 'crypto';

// Load environment variables
config({ path: '.env.local' });
config({ path: '.env' });

interface CategoryConfig {
  name: string;
  slug: string;
  keywords: string[]; // Keywords to match in product names
}

const CATEGORIES: CategoryConfig[] = [
  {
    name: 'Accessories',
    slug: 'accessories',
    keywords: ['beanie', 'mask', 'therma'],
  },
  {
    name: 'Outerwear',
    slug: 'outerwear',
    keywords: ['hoodie', 'jacket'],
  },
  {
    name: 'Bottoms',
    slug: 'bottoms',
    keywords: ['jeans', 'pants'],
  },
  {
    name: 'Tees',
    slug: 'tees',
    keywords: ['tee', 't-shirt', 'shirt'],
  },
];

async function main() {
  console.log('🏷️  Create Categories and Assign Products\n');

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not configured!');
    process.exit(1);
  }

  try {
    // Create categories
    console.log('📦 Creating categories...\n');
    const categoryMap = new Map<string, string>(); // slug -> id

    for (const categoryConfig of CATEGORIES) {
      // Check if category already exists
      const existing = await db
        .select()
        .from(categories)
        .where(eq(categories.slug, categoryConfig.slug))
        .limit(1);

      let categoryId: string;

      if (existing.length > 0) {
        categoryId = existing[0].id;
        console.log(`   ℹ️  Category "${categoryConfig.name}" already exists (${categoryId})`);
      } else {
        categoryId = `cat-${randomUUID().split('-')[0]}-${Date.now()}`;
        await db.insert(categories).values({
          id: categoryId,
          name: categoryConfig.name,
          slug: categoryConfig.slug,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        console.log(`   ✅ Created category: ${categoryConfig.name}`);
      }

      categoryMap.set(categoryConfig.slug, categoryId);
    }

    console.log('');

    // Get all products
    const allProducts = await db.select().from(products);
    console.log(`📋 Found ${allProducts.length} product(s) to categorize\n`);

    let assigned = 0;
    let skipped = 0;

    // Assign products to categories
    for (const product of allProducts) {
      const productNameLower = product.name.toLowerCase();
      const matchedCategories: string[] = [];

      // Find matching categories based on keywords
      for (const categoryConfig of CATEGORIES) {
        const matches = categoryConfig.keywords.some(keyword => {
          const keywordLower = keyword.toLowerCase();
          return productNameLower.includes(keywordLower);
        });

        if (matches) {
          matchedCategories.push(categoryConfig.slug);
        }
      }

      if (matchedCategories.length === 0) {
        console.log(`   ⚠️  No category match for: ${product.name}`);
        skipped++;
        continue;
      }

      // Assign product to the first matching category (products belong to one category)
      const categorySlug = matchedCategories[0]; // Take first match
      const categoryId = categoryMap.get(categorySlug)!;

      // Check if product is already assigned to ANY category
      const existingAssignments = await db
        .select()
        .from(productCategories)
        .where(eq(productCategories.productId, product.id))
        .limit(1);

      if (existingAssignments.length === 0) {
        // Product has no category assignment, assign it
        const pcId = `pc-${randomUUID().split('-')[0]}-${Date.now()}`;
        await db.insert(productCategories).values({
          id: pcId,
          productId: product.id,
          categoryId: categoryId,
          createdAt: new Date(),
        });
        console.log(`   ✅ Assigned "${product.name}" → ${CATEGORIES.find(c => c.slug === categorySlug)!.name}`);
        assigned++;
      } else {
        // Check if it's assigned to the correct category
        const correctAssignment = existingAssignments.find(a => a.categoryId === categoryId);
        if (!correctAssignment) {
          // Product is assigned to wrong category, update it
          await db
            .update(productCategories)
            .set({ categoryId: categoryId })
            .where(eq(productCategories.productId, product.id));
          console.log(`   🔄 Updated "${product.name}" → ${CATEGORIES.find(c => c.slug === categorySlug)!.name}`);
          assigned++;
        } else {
          console.log(`   ℹ️  "${product.name}" already assigned to ${CATEGORIES.find(c => c.slug === categorySlug)!.name}`);
        }
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Summary:\n');
    console.log(`✅ Categories created/verified: ${CATEGORIES.length}`);
    console.log(`✅ Products assigned: ${assigned} assignment(s)`);
    if (skipped > 0) {
      console.log(`⚠️  Products without category: ${skipped}`);
    }
    console.log('\n💡 View categories and products: npm run db:studio');
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

main();
