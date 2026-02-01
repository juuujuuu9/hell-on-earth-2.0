/**
 * Add Description to Thermochromic Shell Jackets
 *
 * Updates the description for all thermochromic shell jackets (non-blue)
 */

import { config } from 'dotenv';
import { db } from '../src/lib/db';
import { products } from '../src/lib/db/schema';
import { eq } from 'drizzle-orm';

config({ path: '.env.local' });
config({ path: '.env' });

const THERMO_DESCRIPTION = `All jacket(s) and coat(s) material are customized to the specifics of Hell On Earth, LLC. A versatile shell jacket designed for performance and style. This shell jacket is crafted from advanced thermochromic fabric, engineered to react to heat by changing color at approximately 30–32°C (86–90°F), which aligns closely with natural body temperature. As the wearer's temperature rises, the outer shell visually transforms, creating a dynamic, heat-responsive effect that makes each piece feel alive and interactive.

The lightweight shell is paired with a breathable mesh lining, designed to promote airflow and comfort while helping regulate internal temperature. This combination delivers a balance of visual innovation, wearability, and performance—ideal for both active movement and statement streetwear.`;

async function main(): Promise<void> {
  console.log('📝 Adding Description to Thermochromic Shell Jackets\n');

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not configured!');
    process.exit(1);
  }

  try {
    const allProducts = await db.select().from(products);

    // Thermochromic jackets = shell jackets that are NOT blue
    const thermoJackets = allProducts.filter(
      (p) =>
        p.name.toLowerCase().includes('shell jacket') &&
        !p.name.toLowerCase().includes('blue')
    );

    if (thermoJackets.length === 0) {
      console.log('⚠️  No thermochromic shell jackets found.');
      process.exit(0);
    }

    console.log(`🎯 Found ${thermoJackets.length} thermochromic shell jacket(s):\n`);
    thermoJackets.forEach((p) => console.log(`   - ${p.name}`));
    console.log('');

    for (const jacket of thermoJackets) {
      await db
        .update(products)
        .set({ description: THERMO_DESCRIPTION })
        .where(eq(products.id, jacket.id));
      console.log(`   ✅ Updated: ${jacket.name}`);
    }

    console.log('\n✅ Done! All thermochromic jacket descriptions updated.');
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : 'Unknown error');
    if (error instanceof Error && error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();
