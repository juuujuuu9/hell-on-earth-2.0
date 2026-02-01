/**
 * Update Shell Jacket (Blue) description, materials, and features
 *
 * Matches the therma shell jackets content but removes thermochromic/color-changing
 * details since the blue jacket does not have that feature.
 */

import { config } from 'dotenv';
import { db } from '../src/lib/db';
import { products } from '../src/lib/db/schema';
import { eq } from 'drizzle-orm';

config({ path: '.env.local' });
config({ path: '.env' });

// Same structure as therma description, minus thermochromic/color-changing content
const DESCRIPTION = `All jacket(s) and coat(s) material are customized to the specifics of Hell On Earth, LLC. A versatile shell jacket designed for performance and style. This shell jacket is crafted with a lightweight shell paired with a breathable mesh lining, designed to promote airflow and comfort while helping regulate internal temperature. This combination delivers a balance of wearability and performance—ideal for both active movement and statement streetwear.`;

// Same as therma materials but outer shell is generic (no thermochromic)
const MATERIALS_HTML = `<ul>
<li>Lightweight fabric (outer shell)</li>
<li>Breathable mesh lining</li>
<li>Lightweight shell construction</li>
</ul>`;

// Same as therma features but without heat-responsive / color transformation bullets
const FEATURES_HTML = `<ul>
<li>Breathable mesh lining promotes airflow and comfort</li>
<li>Helps regulate internal temperature</li>
<li>Lightweight design for wearability</li>
<li>Ideal for active movement and statement streetwear</li>
</ul>`;

async function main(): Promise<void> {
  console.log('📝 Updating Shell Jacket (Blue) — description, materials, features (no therma/color-changing)\n');

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not configured!');
    process.exit(1);
  }

  try {
    const allProducts = await db.select().from(products);
    const blueJacket = allProducts.find(
      (p) =>
        p.name.toLowerCase().includes('shell jacket') &&
        p.name.toLowerCase().includes('blue')
    );

    if (!blueJacket) {
      console.error('❌ Shell Jacket (Blue) not found.');
      process.exit(1);
    }

    await db
      .update(products)
      .set({
        description: DESCRIPTION,
        materials: MATERIALS_HTML,
        features: FEATURES_HTML,
      })
      .where(eq(products.id, blueJacket.id));

    console.log(`   ✅ Updated: ${blueJacket.name}`);
    console.log('\n✅ Done.');
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : 'Unknown error');
    if (error instanceof Error && error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();
