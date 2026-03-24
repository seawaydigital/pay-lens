#!/usr/bin/env node
/**
 * Seed Supabase database with sample data from JSON files.
 * Uses the service_role key for write access.
 *
 * Usage: node scripts/seed-supabase.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = resolve(__dirname, '../apps/web/public/data');

const SUPABASE_URL = 'https://jmuitsmxtoqjeogidstj.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
  || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImptdWl0c214dG9xamVvZ2lkc3RqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDMyMzI1MCwiZXhwIjoyMDg5ODk5MjUwfQ.vpCZf5yZfzRXkKVp8ZatAVoexhkmftVNjYI5cFweEII';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

function loadJson(filename) {
  return JSON.parse(readFileSync(resolve(dataDir, filename), 'utf-8'));
}

async function upsert(table, data, conflictCol = 'id') {
  const batchSize = 100;
  let inserted = 0;
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    const { error } = await supabase
      .from(table)
      .upsert(batch, { onConflict: conflictCol });
    if (error) {
      console.error(`  Error in ${table} batch ${i}:`, error.message);
    } else {
      inserted += batch.length;
    }
  }
  console.log(`  ${table}: ${inserted} rows`);
}

async function main() {
  console.log('Seeding Supabase database...\n');

  // 1. Employers
  console.log('1. Employers');
  const employers = loadJson('employers-index.json').map(e => ({
    id: e.id,
    name: e.name,
    sector: e.sector,
    region_id: e.regionId,
    headcount: e.headcount,
    median_salary: e.medianSalary,
  }));
  await upsert('employers', employers);

  // 2. Disclosures
  console.log('2. Disclosures');
  const disclosures = loadJson('sample-disclosures.json').map(d => ({
    id: d.id,
    year: d.year,
    first_name: d.firstName,
    last_name: d.lastName,
    job_title: d.jobTitle,
    employer: d.employer,
    employer_id: d.employerId,
    sector: d.sector,
    salary_paid: d.salaryPaid,
    taxable_benefits: d.taxableBenefits,
    region_id: d.regionId,
    region_name: d.regionName,
  }));
  await upsert('disclosures', disclosures);

  // 3. Sectors
  console.log('3. Sectors');
  const sectorsRaw = loadJson('sectors.json');
  const sectors = sectorsRaw.map(s => ({
    id: s.id,
    name: s.name,
    employee_count: s.employeeCount,
    avg_salary: s.avgSalary,
    median_salary: s.medianSalary,
    min_salary: s.minSalary,
    max_salary: s.maxSalary,
    total_compensation: s.totalCompensation,
    yoy_growth: s.yoyGrowth || 0,
  }));
  await upsert('sectors', sectors);

  // 4. Regions
  console.log('4. Regions');
  const regions = loadJson('region-salaries.json').map(r => ({
    region_id: r.regionId,
    name: r.name,
    median_salary: r.medianSalary,
    employee_count: r.count,
    lat: r.lat,
    lng: r.lng,
  }));
  await upsert('regions', regions, 'region_id');

  // 5. Anomalies
  console.log('5. Anomalies');
  const anomalies = loadJson('anomalies.json').map(a => ({
    id: a.id,
    name: a.name,
    employer: a.employer,
    title: a.title,
    salary_prev: a.salaryPrev || null,
    salary_curr: a.salaryCurr,
    year_prev: a.yearPrev || null,
    year_curr: a.yearCurr,
    change_percent: a.changePercent || null,
    change_amount: a.changeAmount || null,
    flag: a.flag,
    possible_reason: a.possibleReason || null,
  }));
  await upsert('anomalies', anomalies);

  // 6. Historical Series
  console.log('6. Historical Series');
  const historical = loadJson('historical-series.json').map(h => ({
    year: h.year,
    total_employees: h.totalEmployees,
    total_compensation: h.totalCompensation,
    median_salary: h.medianSalary,
    average_salary: h.averageSalary,
    p25_salary: h.p25Salary,
    p75_salary: h.p75Salary,
    p90_salary: h.p90Salary,
    threshold: h.threshold,
    cpi_index: h.cpiIndex,
    sectors: h.sectors,
  }));
  await upsert('historical_series', historical, 'year');

  // 7. Stats Summary
  console.log('7. Stats Summary');
  const stats = loadJson('stats-summary.json');
  await upsert('stats_summary', [{
    id: 1,
    total_records: stats.totalRecords,
    unique_employers: stats.uniqueEmployers,
    latest_year: stats.latestYear,
    median_salary: stats.medianSalary,
    total_compensation: stats.totalCompensation,
    yoy_growth: stats.yoyGrowth || 0,
  }]);

  // 8. Benchmarks
  console.log('8. Benchmarks');
  const benchRaw = loadJson('benchmark-data.json');
  const rolesMap = benchRaw.roles || {};
  const benchmarks = Object.entries(rolesMap).map(([slug, r]) => ({
    id: slug,
    role: r.name || slug,
    region_id: null,
    region_name: null,
    sample_size: r.totalRecords || 0,
    p25: r.percentiles?.p25 || 0,
    p50: r.percentiles?.p50 || 0,
    p75: r.percentiles?.p75 || 0,
    p90: r.percentiles?.p90 || 0,
    avg_salary: r.percentiles?.p50 || 0,
    min_salary: r.percentiles?.p25 || 0,
    max_salary: r.percentiles?.p90 || 0,
    institution_breakdown: r.institutions || [],
    yearly_trend: r.yearlyTrend || [],
  }));
  if (benchmarks.length > 0) {
    await upsert('benchmarks', benchmarks);
  } else {
    console.log('  benchmarks: skipped (empty)');
  }

  console.log('\nDone! Database seeded successfully.');
}

main().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
