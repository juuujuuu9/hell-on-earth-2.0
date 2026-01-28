/**
 * Update Category Sort Order Script
 * 
 * Sets the sortOrder for categories based on desired display order:
 * 1. Jackets
 * 2. Hoodies
 * 3. Logo tees
 * 4. Other tees
 * 5. Denims
 * 6. Beanies
 * 7. Masks
 * 
 * Usage:
 *   npx tsx scripts/update-category-order.ts
 */

import { config } from 'dotenv';
import { db } from '../src/lib/db';
import { categories } from '../src/lib/db/schema';
import { eq, like, or } from 'drizzle-orm';

// Load environment variables
config({ path: '.env.local' });
config({ path: '.env' });

// Category order mapping: category identifier -> sortOrder
// Matches by slug or name (case-insensitive)
// Order: 1. Jackets, 2. Hoodies, 3. Logo tees, 4. Other tees, 5. Denims, 6. Beanies, 7. Masks
const CATEGORY_ORDER: Array<{ identifier: string; sortOrder: number }> = [
  // Outerwear category contains both jackets and hoodies - prioritize it first
  { identifier: 'outerwear', sortOrder: 1 },
  { identifier: 'jacket', sortOrder: 1 },
  { identifier: 'hoodie', sortOrder: 2 },
  // Tees category contains both logo and other tees
  { identifier: 'logo tee', sortOrder: 3 },
  { identifier: 'logo-tee', sortOrder: 3 },
  { identifier: 'logotee', sortOrder: 3 },
  { identifier: 'tees', sortOrder: 3 }, // Tees category (contains logo and other)
  { identifier: 'tee', sortOrder: 4 }, // Default tees if no specific logo/other distinction
  { identifier: 'other tee', sortOrder: 4 },
  { identifier: 'other-tee', sortOrder: 4 },
  { identifier: 'othertee', sortOrder: 4 },
  // Bottoms/Denims
  { identifier: 'bottoms', sortOrder: 5 },
  { identifier: 'denim', sortOrder: 5 },
  { identifier: 'denims', sortOrder: 5 },
  { identifier: 'jeans', sortOrder: 5 },
  // Accessories (contains beanies and masks)
  { identifier: 'beanie', sortOrder: 6 },
  { identifier: 'beanies', sortOrder: 6 },
  { identifier: 'accessories', sortOrder: 6 }, // Accessories category (contains beanies and masks)
  { identifier: 'mask', sortOrder: 7 },
  { identifier: 'masks', sortOrder: 7 },
  { identifier: 'therma', sortOrder: 7 },
];

async function main() {
  console.log('🔄 Update Category Sort Order\n');

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not configured!');
    process.exit(1);
  }

  try {
    // Get all categories
    const allCategories = await db.select().from(categories);
    console.log(`📋 Found ${allCategories.length} category(ies)\n`);

    let updated = 0;
    let skipped = 0;

    for (const category of allCategories) {
      const nameLower = category.name.toLowerCase();
      const slugLower = category.slug.toLowerCase();

      // Find matching sortOrder
      let matchedOrder: number | null = null;
      
      for (const orderConfig of CATEGORY_ORDER) {
        if (nameLower.includes(orderConfig.identifier.toLowerCase()) || 
            slugLower.includes(orderConfig.identifier.toLowerCase())) {
          matchedOrder = orderConfig.sortOrder;
          break;
        }
      }

      // Special handling for existing categories if no direct match
      if (!matchedOrder) {
        // This shouldn't happen with the current mapping, but keep as fallback
        matchedOrder = 99; // Default for unmatched categories
      }

      // Update category if sortOrder is different
      if (category.sortOrder !== matchedOrder) {
        await db
          .update(categories)
          .set({ 
            sortOrder: matchedOrder,
            updatedAt: new Date(),
          })
          .where(eq(categories.id, category.id));
        
        console.log(`   ✅ Updated "${category.name}" (${category.slug}) → sortOrder: ${matchedOrder}`);
        updated++;
      } else {
        console.log(`   ℹ️  "${category.name}" (${category.slug}) already has sortOrder: ${matchedOrder}`);
        skipped++;
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Summary:\n');
    console.log(`✅ Categories updated: ${updated}`);
    console.log(`ℹ️  Categories unchanged: ${skipped}`);
    console.log('\n💡 View categories: npm run db:studio');
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : 'Unknown error');
    if (error instanceof Error && error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();
