#!/usr/bin/env node
/**
 * Load Ontario Sunshine List CSV into Supabase disclosures table.
 * Parses CSV, generates UUIDs, batch-upserts in chunks of 500.
 *
 * Usage: node load-csv.mjs <path-to-csv>
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { randomUUID } from 'crypto';

const CSV_PATH = process.argv[2];
if (!CSV_PATH) {
  console.error('Usage: node load-csv.mjs <path-to-csv>');
  process.exit(1);
}

const SUPABASE_URL = 'https://jmuitsmxtoqjeogidstj.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
  || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImptdWl0c214dG9xamVvZ2lkc3RqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDMyMzI1MCwiZXhwIjoyMDg5ODk5MjUwfQ.vpCZf5yZfzRXkKVp8ZatAVoexhkmftVNjYI5cFweEII';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Simple CSV parser that handles quoted fields
function parseCSV(text) {
  const lines = text.split('\n');
  const rows = [];

  for (let i = 1; i < lines.length; i++) { // skip header
    const line = lines[i].trim();
    if (!line) continue;

    const fields = [];
    let field = '';
    let inQuotes = false;

    for (let j = 0; j < line.length; j++) {
      const ch = line[j];
      if (ch === '"') {
        if (inQuotes && line[j + 1] === '"') {
          field += '"';
          j++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        fields.push(field.trim());
        field = '';
      } else {
        field += ch;
      }
    }
    fields.push(field.trim());

    if (fields.length >= 7) {
      rows.push(fields);
    }
  }
  return rows;
}

function cleanNumber(val) {
  if (!val) return 0;
  const cleaned = val.replace(/[$,\s]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function main() {
  console.log(`Reading CSV: ${CSV_PATH}`);
  // Remove BOM if present
  const raw = readFileSync(CSV_PATH, 'utf-8').replace(/^\uFEFF/, '');
  const rows = parseCSV(raw);
  console.log(`Parsed ${rows.length} records\n`);

  // First, clear existing sample disclosures
  console.log('Clearing existing sample disclosures...');
  const { error: delError } = await supabase
    .from('disclosures')
    .delete()
    .neq('id', '---impossible---'); // delete all rows
  if (delError) console.error('  Delete error:', delError.message);
  else console.log('  Cleared.\n');

  // Build disclosure records
  const records = rows.map(fields => {
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

  // Batch insert
  const BATCH_SIZE = 500;
  let inserted = 0;
  let errors = 0;
  const totalBatches = Math.ceil(records.length / BATCH_SIZE);

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;

    const { error } = await supabase
      .from('disclosures')
      .insert(batch);

    if (error) {
      console.error(`  Batch ${batchNum}/${totalBatches} FAILED: ${error.message}`);
      errors++;
    } else {
      inserted += batch.length;
    }

    // Progress every 50 batches
    if (batchNum % 50 === 0 || batchNum === totalBatches) {
      console.log(`  Progress: ${batchNum}/${totalBatches} batches (${inserted.toLocaleString()} rows inserted)`);
    }
  }

  console.log(`\nDone! Inserted ${inserted.toLocaleString()} rows, ${errors} batch errors.`);

  // Update employers table from real data
  console.log('\nRebuilding employers table from disclosure data...');
  const { error: empDelErr } = await supabase
    .from('employers')
    .delete()
    .neq('id', '---impossible---');
  if (empDelErr) console.error('  Employer delete error:', empDelErr.message);

  // Get unique employers with stats
  const { data: empStats, error: empErr } = await supabase.rpc('get_employer_stats');
  if (empErr) {
    console.log('  RPC not available, computing employers client-side...');

    // Group by employer
    const empMap = new Map();
    for (const r of records) {
      const key = r.employer_id;
      if (!empMap.has(key)) {
        empMap.set(key, {
          id: key,
          name: r.employer,
          sector: r.sector,
          region_id: '',
          headcount: 0,
          salaries: [],
        });
      }
      const e = empMap.get(key);
      e.headcount++;
      e.salaries.push(r.salary_paid);
    }

    const employers = [...empMap.values()].map(e => {
      e.salaries.sort((a, b) => a - b);
      const mid = Math.floor(e.salaries.length / 2);
      const median = e.salaries.length % 2 === 0
        ? (e.salaries[mid - 1] + e.salaries[mid]) / 2
        : e.salaries[mid];
      return {
        id: e.id,
        name: e.name,
        sector: e.sector,
        region_id: e.region_id,
        headcount: e.headcount,
        median_salary: Math.round(median * 100) / 100,
      };
    });

    // Insert in batches
    let empInserted = 0;
    for (let i = 0; i < employers.length; i += BATCH_SIZE) {
      const batch = employers.slice(i, i + BATCH_SIZE);
      const { error } = await supabase.from('employers').insert(batch);
      if (error) {
        console.error(`  Employer batch error: ${error.message}`);
      } else {
        empInserted += batch.length;
      }
    }
    console.log(`  Inserted ${empInserted} unique employers`);
  }

  // Update stats_summary
  console.log('\nUpdating stats_summary...');
  const totalComp = records.reduce((sum, r) => sum + r.salary_paid + r.taxable_benefits, 0);
  const allSalaries = records.map(r => r.salary_paid).sort((a, b) => a - b);
  const medianIdx = Math.floor(allSalaries.length / 2);
  const medianSalary = allSalaries.length % 2 === 0
    ? (allSalaries[medianIdx - 1] + allSalaries[medianIdx]) / 2
    : allSalaries[medianIdx];

  const uniqueEmployers = new Set(records.map(r => r.employer_id)).size;

  const { error: statsErr } = await supabase
    .from('stats_summary')
    .upsert({
      id: 1,
      total_records: records.length,
      unique_employers: uniqueEmployers,
      latest_year: 2024,
      median_salary: Math.round(medianSalary * 100) / 100,
      total_compensation: Math.round(totalComp),
      yoy_growth: 0,
    });
  if (statsErr) console.error('  Stats error:', statsErr.message);
  else console.log('  Stats updated.');

  // Update sector aggregates
  console.log('\nRebuilding sectors table...');
  const { error: secDelErr } = await supabase
    .from('sectors')
    .delete()
    .neq('id', '---impossible---');

  const sectorMap = new Map();
  for (const r of records) {
    const key = slugify(r.sector);
    if (!sectorMap.has(key)) {
      sectorMap.set(key, { name: r.sector, salaries: [] });
    }
    sectorMap.get(key).salaries.push(r.salary_paid);
  }

  const sectorRows = [...sectorMap.entries()].map(([id, s]) => {
    s.salaries.sort((a, b) => a - b);
    const mid = Math.floor(s.salaries.length / 2);
    const median = s.salaries.length % 2 === 0
      ? (s.salaries[mid - 1] + s.salaries[mid]) / 2
      : s.salaries[mid];
    const total = s.salaries.reduce((a, b) => a + b, 0);
    return {
      id,
      name: s.name,
      employee_count: s.salaries.length,
      avg_salary: Math.round(total / s.salaries.length * 100) / 100,
      median_salary: Math.round(median * 100) / 100,
      min_salary: s.salaries[0],
      max_salary: s.salaries[s.salaries.length - 1],
      total_compensation: Math.round(total),
      yoy_growth: 0,
    };
  });

  for (let i = 0; i < sectorRows.length; i += BATCH_SIZE) {
    const batch = sectorRows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('sectors').insert(batch);
    if (error) console.error('  Sector insert error:', error.message);
  }
  console.log(`  Inserted ${sectorRows.length} sectors`);

  console.log('\n=== ALL DONE ===');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
