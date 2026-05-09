/**
 * One-time seeding script: Excel → Supabase `drugs` table
 * 
 * Run with:
 *   npx ts-node scripts/seedDrugs.ts
 * 
 * Dependencies needed (run once):
 *   npm install xlsx @supabase/supabase-js dotenv
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ESM replacement for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

dotenv.config();

// ── Supabase client ──────────────────────────────────────────────────────────
const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // use service role key for seeding
);

// ── Helpers ──────────────────────────────────────────────────────────────────

/** "Amoxycillin (500mg)"  →  "amoxycillin" */
function extractGenericName(composition: string): string {
  return composition.replace(/\(.*?\)/g, '').trim().toLowerCase();
}

/** Split a comma-separated string into a cleaned array, dropping empty strings */
function splitToArray(val: string | undefined | null): string[] {
  if (!val) return [];
  return val.split(',').map(s => s.trim()).filter(Boolean);
}

/** Collect non-empty values into an array */
function toArray(...vals: (string | undefined | null)[]): string[] {
  return vals.map(v => v?.trim()).filter(Boolean) as string[];
}

/** "Yes" / "TRUE" / true  →  boolean */
function toBool(val: unknown): boolean {
  if (typeof val === 'boolean') return val;
  if (typeof val === 'string') return val.toLowerCase() === 'yes' || val.toLowerCase() === 'true';
  return false;
}

// ── Row type (matches Excel columns) ─────────────────────────────────────────
interface ExcelRow {
  id:                        number;
  name:                      string;
  Is_discontinued:           boolean | string;
  manufacturer_name:         string;
  type:                      string;
  short_composition1:        string;
  short_composition2?:       string;
  substitute0?:              string;
  substitute1?:              string;
  Consolidated_Side_Effects?: string;
  use0?:                     string;
  use1?:                     string;
  'Chemical Class'?:         string;
  'Habit Forming'?:          string;
  'Therapeutic Class'?:      string;
  'Action Class'?:           string;
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  // 1. Load Excel file
  //    Put your Excel file at: scripts/DataSet_Med.xlsx
  const filePath = path.resolve(__dirname, 'DataSet_Med.xlsx');
  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets[wb.SheetNames[0]]; // first sheet
  const rows = XLSX.utils.sheet_to_json<ExcelRow>(ws, { defval: '' });

  console.log(`📋 Read ${rows.length} rows from Excel`);

  // 2. Deduplicate by lowercase brand name
  const seen = new Set<string>();
  const uniqueRows = rows.filter(row => {
    const key = row.name?.trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  console.log(`🧹 ${uniqueRows.length} unique drug entries after deduplication`);

  // 3. Transform rows → Supabase records
  const records = uniqueRows.map(row => {
    const genericName = extractGenericName(row.short_composition1 || '');

    const compositions = toArray(row.short_composition1, row.short_composition2);
    const substitutes  = toArray(row.substitute0, row.substitute1);
    const sideEffects  = splitToArray(row.Consolidated_Side_Effects);
    const uses         = toArray(row.use0, row.use1);

    return {
      // Core identifiers
      generic_name:   genericName,
      brand_names:    [row.name?.trim()].filter(Boolean),

      // Classification
      drug_class:     row['Therapeutic Class']?.trim() || 'UNCLASSIFIED',
      drug_subclass:  row['Action Class']?.trim()      || '',
      chemical_class: row['Chemical Class']?.trim()    || null,

      // Arrays
      compositions,
      side_effects:   sideEffects,
      uses,
      substitutes,

      // Metadata
      manufacturer:   row.manufacturer_name?.trim() || null,
      habit_forming:  toBool(row['Habit Forming']),
      is_discontinued: toBool(row.Is_discontinued),

      // Risk fields — not in Excel, default to false/0
      // You can bulk-update these later once you have clinical data
      high_risk_elderly:        false,
      renal_risk:               false,
      hepatic_risk:             false,
      anticholinergic_score:    0,
      sedative_score:           0,
      cns_active:               false,
      fall_risk:                false,
      bleeding_risk:            false,
      narrow_therapeutic_index: false,
      dose_thresholds:          [],
    };
  });

  // 4. Batch insert in chunks of 100 (Supabase row limit per request)
  const CHUNK_SIZE = 100;
  let inserted = 0;
  let errors   = 0;

  for (let i = 0; i < records.length; i += CHUNK_SIZE) {
    const chunk = records.slice(i, i + CHUNK_SIZE);

    const { error } = await supabase
      .from('drugs')
      .upsert(chunk, { onConflict: 'generic_name' }); // skip exact duplicates

    if (error) {
      console.error(`❌ Error on chunk ${i / CHUNK_SIZE + 1}:`, error.message);
      errors += chunk.length;
    } else {
      inserted += chunk.length;
      console.log(`✅ Inserted chunk ${i / CHUNK_SIZE + 1} (${inserted}/${records.length})`);
    }
  }

  console.log(`\n🎉 Done! ${inserted} inserted, ${errors} failed.`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
