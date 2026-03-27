import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { randomUUID } from 'crypto';

const CSV_PATH = process.argv[2];
if (!CSV_PATH) { console.error('Usage: node append-csv.mjs <csv>'); process.exit(1); }

const supabase = createClient(
  'https://jmuitsmxtoqjeogidstj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImptdWl0c214dG9xamVvZ2lkc3RqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDMyMzI1MCwiZXhwIjoyMDg5ODk5MjUwfQ.vpCZf5yZfzRXkKVp8ZatAVoexhkmftVNjYI5cFweEII'
);

function parseCSV(text) {
  const lines = text.split('\n');
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const fields = []; let field = ''; let inQ = false;
    for (let j = 0; j < line.length; j++) {
      const ch = line[j];
      if (ch === '"') { if (inQ && line[j+1] === '"') { field += '"'; j++; } else inQ = !inQ; }
      else if (ch === ',' && !inQ) { fields.push(field.trim()); field = ''; }
      else field += ch;
    }
    fields.push(field.trim());
    if (fields.length >= 7) rows.push(fields);
  }
  return rows;
}

function clean(v) { if (!v) return 0; const n = parseFloat(v.replace(/[$,\s]/g, '')); return isNaN(n) ? 0 : n; }
function slug(t) { return t.toLowerCase().replace(/['']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }

async function main() {
  console.log(`Reading: ${CSV_PATH}`);
  const raw = readFileSync(CSV_PATH, 'utf-8').replace(/^\uFEFF/, '');
  const rows = parseCSV(raw);
  console.log(`Parsed ${rows.length} records — APPENDING (no delete)\n`);

  const records = rows.map(f => {
    const [sector, lastName, firstName, salary, benefits, employer, jobTitle, year] = f;
    return {
      id: randomUUID(), year: parseInt(year) || 2023,
      first_name: firstName || '', last_name: lastName || '',
      job_title: jobTitle || '', employer: employer || '',
      employer_id: slug(employer || ''), sector: sector?.trim() || '',
      salary_paid: clean(salary), taxable_benefits: clean(benefits),
      region_id: null, region_name: null,
    };
  });

  const BS = 500; let inserted = 0; let errors = 0;
  const total = Math.ceil(records.length / BS);
  for (let i = 0; i < records.length; i += BS) {
    const batch = records.slice(i, i + BS);
    const bn = Math.floor(i / BS) + 1;
    const { error } = await supabase.from('disclosures').insert(batch);
    if (error) { console.error(`  Batch ${bn}/${total} FAILED: ${error.message}`); errors++; }
    else inserted += batch.length;
    if (bn % 50 === 0 || bn === total) console.log(`  Progress: ${bn}/${total} (${inserted.toLocaleString()} inserted)`);
  }
  console.log(`\nDone! ${inserted.toLocaleString()} rows appended, ${errors} errors.`);

  // Ensure new employers exist
  const empMap = new Map();
  for (const r of records) {
    if (!empMap.has(r.employer_id)) empMap.set(r.employer_id, { id: r.employer_id, name: r.employer, sector: r.sector, region_id: '', headcount: 0, salaries: [] });
    const e = empMap.get(r.employer_id); e.headcount++; e.salaries.push(r.salary_paid);
  }
  const newEmps = [...empMap.values()].map(e => {
    e.salaries.sort((a,b) => a-b);
    const mid = Math.floor(e.salaries.length/2);
    const med = e.salaries.length%2===0 ? (e.salaries[mid-1]+e.salaries[mid])/2 : e.salaries[mid];
    return { id: e.id, name: e.name, sector: e.sector, region_id: e.region_id, headcount: e.headcount, median_salary: Math.round(med*100)/100 };
  });
  // Upsert so existing employers get updated counts
  for (let i = 0; i < newEmps.length; i += BS) {
    await supabase.from('employers').upsert(newEmps.slice(i, i+BS), { onConflict: 'id' });
  }
  console.log(`Upserted ${newEmps.length} employers`);

  // Verify total
  const { count } = await supabase.from('disclosures').select('*', { count: 'exact', head: true });
  console.log(`Total disclosures in DB: ${count?.toLocaleString()}`);
}

main().catch(e => { console.error(e); process.exit(1); });
