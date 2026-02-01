/**
 * Add Materials and Product Features to Thermochromic Shell Jackets
 *
 * Extracts details from the thermo jacket description and adds them as
 * bullet points to the materials and features sections for Shell Jacket (Black)
 * and Shell Jacket (BlackWhite).
 */

import { config } from 'dotenv';
import { db } from '../src/lib/db';
import { products } from '../src/lib/db/schema';
import { eq } from 'drizzle-orm';

config({ path: '.env.local' });
config({ path: '.env' });

const MATERIALS_HTML = `<ul>
<li>Advanced thermochromic fabric (outer shell)</li>
<li>Breathable mesh lining</li>
<li>Materials customized to Hell On Earth, LLC specifications</li>
<li>Lightweight shell construction</li>
</ul>`;

const FEATURES_HTML = `<ul>
<li>Heat-responsive: changes color at 30–32°C (86–90°F) near body temperature</li>
<li>Dynamic color transformation as wearer's temperature rises</li>
<li>Breathable mesh lining promotes airflow and comfort</li>
<li>Helps regulate internal temperature</li>
<li>Lightweight design for wearability</li>
<li>Ideal for active movement and statement streetwear</li>
</ul>`;

async function main(): Promise<void> {
  console.log('📝 Adding Materials & Product Features to Thermochromic Shell Jackets\n');

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not configured!');
    process.exit(1);
  }

  try {
    const allProducts = await db.select().from(products);

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
        .set({ materials: MATERIALS_HTML, features: FEATURES_HTML })
        .where(eq(products.id, jacket.id));
      console.log(`   ✅ Updated materials & features: ${jacket.name}`);
    }

    console.log('\n✅ Done!');
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : 'Unknown error');
    if (error instanceof Error && error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();
