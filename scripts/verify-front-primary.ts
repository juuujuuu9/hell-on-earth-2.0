/**
 * Verify Front Images are Primary
 */

import { config } from 'dotenv';
import { db } from '../src/lib/db';
import { products, productImages } from '../src/lib/db/schema';
import { eq } from 'drizzle-orm';

config({ path: '.env.local' });
config({ path: '.env' });

async function main() {
  console.log('🔍 Verify Front Images are Primary\n');

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not configured!');
    process.exit(1);
  }

  try {
    const allProducts = await db.select().from(products);
    
    let correct = 0;
    let incorrect = 0;

    for (const product of allProducts) {
      const images = await db
        .select()
        .from(productImages)
        .where(eq(productImages.productId, product.id))
        .orderBy(productImages.sortOrder);

      if (images.length === 0) continue;

      const primaryImage = images.find(img => img.isPrimary);
      const frontImage = images.find(img => {
        const altLower = (img.altText || '').toLowerCase();
        const urlLower = (img.imageUrl || '').toLowerCase();
        return altLower.includes('front') || urlLower.includes('front');
      });

      if (frontImage) {
        if (primaryImage?.id === frontImage.id) {
          correct++;
        } else {
          incorrect++;
          console.log(`   ❌ ${product.name}: Front image is NOT primary`);
          console.log(`      Primary: ${primaryImage?.altText || 'N/A'}`);
          console.log(`      Front: ${frontImage.altText || 'N/A'}`);
        }
      }
    }

    console.log(`\n✅ Correct: ${correct} product(s)`);
    console.log(`❌ Incorrect: ${incorrect} product(s)`);
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

main();
