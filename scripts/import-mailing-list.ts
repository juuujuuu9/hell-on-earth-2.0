/**
 * Import emails from CSV into mailing_list table.
 * Usage: npx tsx scripts/import-mailing-list.ts /path/to/file.csv
 *
 * Expects CSV with "email" as first column ( Gravity Forms export format).
 * Skips duplicates (onConflictDoNothing). Source set to 'gravityform' for imports.
 */

import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { db } from '../src/lib/db';
import { mailingList } from '../src/lib/db/schema';

config({ path: '.env' });
config({ path: '.env' });

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseEmailsFromCsv(csvPath: string): string[] {
  const content = readFileSync(csvPath, 'utf-8');
  const lines = content.split(/\r?\n/).filter((line) => line.trim());

  const emails: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Skip header
    if (i === 0 && line.toLowerCase().includes('"email"')) continue;
    // First column is quoted email: "email@example.com"
    const match = line.match(/^"([^"]+)"/);
    if (match) {
      const raw = match[1].trim();
      if (raw && EMAIL_REGEX.test(raw)) {
        emails.push(raw.toLowerCase());
      }
    }
  }
  return [...new Set(emails)];
}

async function main() {
  const csvPath = process.argv[2] || '/Users/user/Downloads/subscribe-2026-02-01.csv';
  const emails = parseEmailsFromCsv(csvPath);
  console.log(`Found ${emails.length} unique valid emails`);

  if (emails.length === 0) {
    console.log('Nothing to import.');
    return;
  }

  const existing = new Set(
    (await db.select({ email: mailingList.email }).from(mailingList)).map((r) => r.email)
  );

  let inserted = 0;
  let skipped = 0;

  for (const email of emails) {
    if (existing.has(email)) {
      skipped++;
    } else {
      await db
        .insert(mailingList)
        .values({
          id: crypto.randomUUID(),
          email,
          source: 'gravityform',
        })
        .onConflictDoNothing({ target: mailingList.email });
      existing.add(email);
      inserted++;
    }
  }

  console.log(`Imported: ${inserted} new, ${skipped} already existed`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
