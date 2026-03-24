#!/usr/bin/env node
/**
 * Retry the 11 batches that failed during the initial CSV load.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { randomUUID } from 'crypto';

const CSV_PATH = process.argv[2];
if (!CSV_PATH) {
  console.error('Usage: node retry-failed-batches.mjs <path-to-csv>');
  process.exit(1);
}

const SUPABASE_URL = 'https://jmuitsmxtoqjeogidstj.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImptdWl0c214dG9xamVvZ2lkc3RqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDMyMzI1MCwiZXhwIjoyMDg5ODk5MjUwfQ.vpCZf5yZfzRXkKVp8ZatAVoexhkmftVNjYI5cFweEII';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// The batch numbers that failed (1-indexed, batch size = 500)
const FAILED_BATCHES = [29, 31, 33, 34, 148, 346, 411, 464, 500, 626, 717];
const BATCH_SIZE = 500;

function parseCSV(text) {
  const lines = text.split('\n');
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const fields = [];
    let field = '';
    let inQuotes = false;
    for (let j = 0; j < line.length; j++) {
      const ch = line[j];
      if (ch === '"') {
        if (inQuotes && line[j + 1] === '"') { field += '"'; j++; }
        else inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        fields.push(field.trim()); field = '';
      } else {
        field += ch;
      }
    }
    fields.push(field.trim());
    if (fields.length >= 7) rows.push(fields);
  }
  return rows;
}

function cleanNumber(val) {
  if (!val) return 0;
  const n = parseFloat(val.replace(/[$,\s]/g, ''));
  return isNaN(n) ? 0 : n;
}

function slugify(text) {
  return text.toLowerCase().replace(/['']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

async function insertWithRetry(batch, attempt = 1) {
  const { error } = await supabase.from('disclosures').insert(batch);
  if (error) {
    if (attempt < 3) {
      await new Promise(r => setTimeout(r, 1000 * attempt));
      return insertWithRetry(batch, attempt + 1);
    }
    return false;
  }
  return true;
}

async function main() {
  console.log(`Reading CSV...`);
  const raw = readFileSync(CSV_PATH, 'utf-8').replace(/^\uFEFF/, '');
  const rows = parseCSV(raw);
  console.log(`Parsed ${rows.length} records total`);
  console.log(`Retrying ${FAILED_BATCHES.length} failed batches (${FAILED_BATCHES.length * BATCH_SIZE} rows)\n`);

  let totalInserted = 0;
  let totalFailed = 0;

  for (const batchNum of FAILED_BATCHES) {
    const start = (batchNum - 1) * BATCH_SIZE;
    const end = start + BATCH_SIZE;
    const slice = rows.slice(start, end);

    const records = slice.map(fields => {
      const [sector, lastName, firstName, salary, benefits, employer, jobTitle, year] = fields;
      return {
        id: randomUUID(),
        year: parseInt(year) || 2024,
        first_name: firstName || '',
        last_name: lastName || '',
        job_title: jobTitle || '',
        employer: employer || '',
        employer_id: slugify(employer || ''),
        sector: sector || '',
        salary_paid: cleanNumber(salary),
        taxable_benefits: cleanNumber(benefits),
        region_id: null,
        region_name: null,
      };
    });

    const ok = await insertWithRetry(records);
    if (ok) {
      totalInserted += records.length;
      console.log(`  Batch ${batchNum}: ✓ inserted ${records.length} rows (${start + 1}–${end})`);
    } else {
      totalFailed += records.length;
      console.log(`  Batch ${batchNum}: ✗ FAILED after 3 attempts (rows ${start + 1}–${end})`);
    }
  }

  console.log(`\nDone. Inserted ${totalInserted}, failed ${totalFailed}.`);

  // Verify final count
  const { count } = await supabase.from('disclosures').select('*', { count: 'exact', head: true });
  console.log(`Total disclosures in DB: ${count?.toLocaleString()}`);
}

main().catch(err => { console.error(err); process.exit(1); });
