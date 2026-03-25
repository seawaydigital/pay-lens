/**
 * Create PostgreSQL functions in Supabase to aggregate disclosure data.
 * Then call them to rebuild all derived tables.
 */

const PROJECT_REF = 'jmuitsmxtoqjeogidstj';
const ACCESS_TOKEN = 'sbp_9def4122934cad20f407436a9d25802f9374a0ee';

async function runSQL(sql) {
  const res = await fetch(`https://${PROJECT_REF}.supabase.co/rest/v1/rpc/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImptdWl0c214dG9xamVvZ2lkc3RqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDMyMzI1MCwiZXhwIjoyMDg5ODk5MjUwfQ.vpCZf5yZfzRXkKVp8ZatAVoexhkmftVNjYI5cFweEII',
      'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImptdWl0c214dG9xamVvZ2lkc3RqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDMyMzI1MCwiZXhwIjoyMDg5ODk5MjUwfQ.vpCZf5yZfzRXkKVp8ZatAVoexhkmftVNjYI5cFweEII',
    },
    body: JSON.stringify({}),
  });
  return res;
}

async function execSQL(sql) {
  // Use the Supabase Management API to run arbitrary SQL
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
    },
    body: JSON.stringify({ query: sql }),
  });
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function main() {
  console.log('Testing Supabase Management API...');
  const test = await execSQL('SELECT count(*) FROM disclosures;');
  console.log('Test result:', JSON.stringify(test).substring(0, 200));

  if (Array.isArray(test) && test.length > 0) {
    console.log(`Disclosures count: ${test[0].count}\n`);
  } else {
    console.error('Management API not working. Response:', test);
    process.exit(1);
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // 1. Rebuild SECTORS table
  // ══════════════════════════════════════════════════════════════════════════════
  console.log('=== SECTORS ===');
  await execSQL('DELETE FROM sectors;');

  const sectorResult = await execSQL(`
    INSERT INTO sectors (id, name, employee_count, avg_salary, median_salary, min_salary, max_salary, total_compensation, yoy_growth)
    SELECT
      lower(regexp_replace(regexp_replace(trim(sector), '[^a-zA-Z0-9 ]', '', 'g'), '\\s+', '-', 'g')) as id,
      trim(sector) as name,
      count(*)::int as employee_count,
      round(avg(salary_paid)::numeric, 2) as avg_salary,
      round(percentile_cont(0.5) WITHIN GROUP (ORDER BY salary_paid)::numeric, 2) as median_salary,
      round(min(salary_paid)::numeric, 2) as min_salary,
      round(max(salary_paid)::numeric, 2) as max_salary,
      round(sum(salary_paid + taxable_benefits)::numeric, 2) as total_compensation,
      0 as yoy_growth
    FROM disclosures
    WHERE sector IS NOT NULL AND trim(sector) != ''
    GROUP BY trim(sector)
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      employee_count = EXCLUDED.employee_count,
      avg_salary = EXCLUDED.avg_salary,
      median_salary = EXCLUDED.median_salary,
      min_salary = EXCLUDED.min_salary,
      max_salary = EXCLUDED.max_salary,
      total_compensation = EXCLUDED.total_compensation;
  `);
  console.log('  Sector result:', JSON.stringify(sectorResult).substring(0, 200));

  // Now calculate YoY growth
  await execSQL(`
    WITH counts AS (
      SELECT trim(sector) as sector_name,
        sum(CASE WHEN year = 2024 THEN 1 ELSE 0 END) as c2024,
        sum(CASE WHEN year = 2023 THEN 1 ELSE 0 END) as c2023
      FROM disclosures
      WHERE sector IS NOT NULL
      GROUP BY trim(sector)
    )
    UPDATE sectors SET yoy_growth = round(((c2024 - c2023)::numeric / NULLIF(c2023, 0)) * 100, 2)
    FROM counts
    WHERE sectors.name = counts.sector_name AND c2023 > 0;
  `);

  const { count: sectorCount } = await execSQL('SELECT count(*) FROM sectors;').then(r => ({ count: r[0]?.count }));
  console.log(`  Sectors: ${sectorCount}\n`);

  // ══════════════════════════════════════════════════════════════════════════════
  // 2. Rebuild EMPLOYERS table
  // ══════════════════════════════════════════════════════════════════════════════
  console.log('=== EMPLOYERS ===');
  await execSQL('DELETE FROM employers;');

  await execSQL(`
    INSERT INTO employers (id, name, sector, region_id, headcount, median_salary)
    SELECT
      employer_id as id,
      max(employer) as name,
      max(trim(sector)) as sector,
      COALESCE(max(region_id), '') as region_id,
      count(*)::int as headcount,
      round(percentile_cont(0.5) WITHIN GROUP (ORDER BY salary_paid)::numeric, 2) as median_salary
    FROM disclosures
    WHERE employer_id IS NOT NULL AND employer_id != ''
    GROUP BY employer_id
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      sector = EXCLUDED.sector,
      headcount = EXCLUDED.headcount,
      median_salary = EXCLUDED.median_salary;
  `);

  const empResult = await execSQL('SELECT count(*) FROM employers;');
  console.log(`  Employers: ${empResult[0]?.count}\n`);

  // ══════════════════════════════════════════════════════════════════════════════
  // 3. Rebuild HISTORICAL_SERIES (only real years: 2023, 2024)
  // ══════════════════════════════════════════════════════════════════════════════
  console.log('=== HISTORICAL_SERIES ===');
  await execSQL('DELETE FROM historical_series;');

  await execSQL(`
    INSERT INTO historical_series (year, total_employees, total_compensation, median_salary, average_salary, p25_salary, p75_salary, p90_salary, threshold, cpi_index, sectors)
    SELECT
      year,
      count(*)::int as total_employees,
      round(sum(salary_paid + taxable_benefits))::bigint as total_compensation,
      round(percentile_cont(0.5) WITHIN GROUP (ORDER BY salary_paid))::int as median_salary,
      round(avg(salary_paid))::int as average_salary,
      round(percentile_cont(0.25) WITHIN GROUP (ORDER BY salary_paid))::int as p25_salary,
      round(percentile_cont(0.75) WITHIN GROUP (ORDER BY salary_paid))::int as p75_salary,
      round(percentile_cont(0.9) WITHIN GROUP (ORDER BY salary_paid))::int as p90_salary,
      100000 as threshold,
      CASE WHEN year = 2023 THEN 160.1 WHEN year = 2024 THEN 164.1 ELSE 164.1 END as cpi_index,
      '{}'::jsonb as sectors
    FROM disclosures
    GROUP BY year
    ORDER BY year;
  `);

  // Update sector breakdowns as JSON
  for (const year of [2023, 2024]) {
    await execSQL(`
      WITH sector_stats AS (
        SELECT trim(sector) as sector_name,
          count(*) as cnt,
          round(percentile_cont(0.5) WITHIN GROUP (ORDER BY salary_paid))::int as med
        FROM disclosures
        WHERE year = ${year} AND sector IS NOT NULL AND trim(sector) != ''
        GROUP BY trim(sector)
      )
      UPDATE historical_series
      SET sectors = (
        SELECT jsonb_object_agg(sector_name, jsonb_build_object('count', cnt, 'median', med))
        FROM sector_stats
      )
      WHERE year = ${year};
    `);
  }

  const histResult = await execSQL('SELECT year, total_employees, median_salary, total_compensation FROM historical_series ORDER BY year;');
  for (const r of histResult) {
    console.log(`  ${r.year}: ${Number(r.total_employees).toLocaleString()} employees, median $${Number(r.median_salary).toLocaleString()}, total $${(Number(r.total_compensation)/1e9).toFixed(1)}B`);
  }
  console.log();

  // ══════════════════════════════════════════════════════════════════════════════
  // 4. Rebuild STATS_SUMMARY
  // ══════════════════════════════════════════════════════════════════════════════
  console.log('=== STATS_SUMMARY ===');
  await execSQL(`
    INSERT INTO stats_summary (id, total_records, unique_employers, latest_year, median_salary, total_compensation, yoy_growth, updated_at)
    SELECT
      1,
      (SELECT count(*) FROM disclosures)::int,
      (SELECT count(DISTINCT employer_id) FROM disclosures WHERE employer_id IS NOT NULL)::int,
      (SELECT max(year) FROM disclosures)::int,
      (SELECT round(percentile_cont(0.5) WITHIN GROUP (ORDER BY salary_paid))::int FROM disclosures WHERE year = (SELECT max(year) FROM disclosures)),
      (SELECT round(sum(salary_paid + taxable_benefits))::bigint FROM disclosures WHERE year = (SELECT max(year) FROM disclosures)),
      (SELECT round(((c2024::numeric - c2023::numeric) / NULLIF(c2023, 0)) * 100, 2)
       FROM (SELECT count(*) FILTER (WHERE year = 2024) as c2024, count(*) FILTER (WHERE year = 2023) as c2023 FROM disclosures) x),
      now()
    ON CONFLICT (id) DO UPDATE SET
      total_records = EXCLUDED.total_records,
      unique_employers = EXCLUDED.unique_employers,
      latest_year = EXCLUDED.latest_year,
      median_salary = EXCLUDED.median_salary,
      total_compensation = EXCLUDED.total_compensation,
      yoy_growth = EXCLUDED.yoy_growth,
      updated_at = EXCLUDED.updated_at;
  `);
  const statsResult = await execSQL('SELECT * FROM stats_summary WHERE id = 1;');
  console.log('  Stats:', JSON.stringify(statsResult[0]));
  console.log();

  // ══════════════════════════════════════════════════════════════════════════════
  // 5. Rebuild ANOMALIES (real YoY changes 2023→2024)
  // ══════════════════════════════════════════════════════════════════════════════
  console.log('=== ANOMALIES ===');
  await execSQL('DELETE FROM anomalies;');

  // Large increases (>40% and >$30K)
  await execSQL(`
    INSERT INTO anomalies (id, name, employer, title, salary_prev, salary_curr, year_prev, year_curr, change_percent, change_amount, flag, possible_reason)
    WITH ranked AS (
      SELECT
        d24.first_name || ' ' || d24.last_name as name,
        d24.employer,
        d24.job_title as title,
        d23.salary_paid as salary_prev,
        d24.salary_paid as salary_curr,
        2023 as year_prev,
        2024 as year_curr,
        round(((d24.salary_paid - d23.salary_paid)::numeric / NULLIF(d23.salary_paid, 0)) * 100, 1) as change_percent,
        round((d24.salary_paid - d23.salary_paid)::numeric, 2) as change_amount,
        ROW_NUMBER() OVER (ORDER BY (d24.salary_paid - d23.salary_paid) DESC) as rn
      FROM disclosures d24
      JOIN disclosures d23 ON lower(d24.first_name) = lower(d23.first_name)
        AND lower(d24.last_name) = lower(d23.last_name)
        AND d24.employer_id = d23.employer_id
      WHERE d24.year = 2024 AND d23.year = 2023
        AND d24.salary_paid - d23.salary_paid > 30000
        AND ((d24.salary_paid - d23.salary_paid)::numeric / NULLIF(d23.salary_paid, 0)) > 0.4
    )
    SELECT
      'anom-inc-' || rn as id, name, employer, title, salary_prev, salary_curr,
      year_prev, year_curr, change_percent, change_amount,
      'large_increase' as flag,
      'Potential promotion, back-pay, severance payout, or role change' as possible_reason
    FROM ranked WHERE rn <= 200;
  `);

  // Large decreases (>30% and >$30K decrease)
  await execSQL(`
    INSERT INTO anomalies (id, name, employer, title, salary_prev, salary_curr, year_prev, year_curr, change_percent, change_amount, flag, possible_reason)
    WITH ranked AS (
      SELECT
        d24.first_name || ' ' || d24.last_name as name,
        d24.employer,
        d24.job_title as title,
        d23.salary_paid as salary_prev,
        d24.salary_paid as salary_curr,
        2023 as year_prev,
        2024 as year_curr,
        round(((d24.salary_paid - d23.salary_paid)::numeric / NULLIF(d23.salary_paid, 0)) * 100, 1) as change_percent,
        round((d24.salary_paid - d23.salary_paid)::numeric, 2) as change_amount,
        ROW_NUMBER() OVER (ORDER BY (d23.salary_paid - d24.salary_paid) DESC) as rn
      FROM disclosures d24
      JOIN disclosures d23 ON lower(d24.first_name) = lower(d23.first_name)
        AND lower(d24.last_name) = lower(d23.last_name)
        AND d24.employer_id = d23.employer_id
      WHERE d24.year = 2024 AND d23.year = 2023
        AND d23.salary_paid - d24.salary_paid > 30000
        AND ((d23.salary_paid - d24.salary_paid)::numeric / NULLIF(d23.salary_paid, 0)) > 0.3
    )
    SELECT
      'anom-dec-' || rn as id, name, employer, title, salary_prev, salary_curr,
      year_prev, year_curr, change_percent, change_amount,
      'large_decrease' as flag,
      'Partial year, leave of absence, role change, or reduced hours' as possible_reason
    FROM ranked WHERE rn <= 200;
  `);

  // New high entries (first time on list in 2024 at >$200K)
  await execSQL(`
    INSERT INTO anomalies (id, name, employer, title, salary_prev, salary_curr, year_prev, year_curr, change_percent, change_amount, flag, possible_reason)
    WITH ranked AS (
      SELECT
        d24.first_name || ' ' || d24.last_name as name,
        d24.employer,
        d24.job_title as title,
        0 as salary_prev,
        d24.salary_paid as salary_curr,
        2023 as year_prev,
        2024 as year_curr,
        100.0 as change_percent,
        d24.salary_paid as change_amount,
        ROW_NUMBER() OVER (ORDER BY d24.salary_paid DESC) as rn
      FROM disclosures d24
      LEFT JOIN disclosures d23 ON lower(d24.first_name) = lower(d23.first_name)
        AND lower(d24.last_name) = lower(d23.last_name) AND d23.year = 2023
      WHERE d24.year = 2024 AND d24.salary_paid >= 200000 AND d23.id IS NULL
    )
    SELECT
      'anom-new-' || rn as id, name, employer, title, salary_prev, salary_curr,
      year_prev, year_curr, change_percent, change_amount,
      'new_high_entry' as flag,
      'First appearance on Sunshine List at above $200K' as possible_reason
    FROM ranked WHERE rn <= 100;
  `);

  const anomResult = await execSQL("SELECT flag, count(*) as cnt FROM anomalies GROUP BY flag ORDER BY flag;");
  for (const r of anomResult) console.log(`  ${r.flag}: ${r.cnt}`);
  console.log();

  // ══════════════════════════════════════════════════════════════════════════════
  // 6. Rebuild BENCHMARKS
  // ══════════════════════════════════════════════════════════════════════════════
  console.log('=== BENCHMARKS ===');
  await execSQL('DELETE FROM benchmarks;');

  await execSQL(`
    INSERT INTO benchmarks (id, role, region_id, region_name, sample_size, p25, p50, p75, p90, avg_salary, min_salary, max_salary, institution_breakdown, yearly_trend)
    WITH role_stats AS (
      SELECT
        job_title as role,
        count(*) as sample_size,
        round(percentile_cont(0.25) WITHIN GROUP (ORDER BY salary_paid))::int as p25,
        round(percentile_cont(0.5) WITHIN GROUP (ORDER BY salary_paid))::int as p50,
        round(percentile_cont(0.75) WITHIN GROUP (ORDER BY salary_paid))::int as p75,
        round(percentile_cont(0.9) WITHIN GROUP (ORDER BY salary_paid))::int as p90,
        round(avg(salary_paid))::int as avg_salary,
        round(min(salary_paid))::int as min_salary,
        round(max(salary_paid))::int as max_salary
      FROM disclosures
      WHERE year = 2024 AND job_title IS NOT NULL AND trim(job_title) != ''
      GROUP BY job_title
      HAVING count(*) >= 10
    )
    SELECT
      lower(regexp_replace(regexp_replace(role, '[^a-zA-Z0-9 ]', '', 'g'), '\\s+', '-', 'g'))
        || '-' || substr(md5(role), 1, 4) as id,
      role, NULL as region_id, NULL as region_name,
      sample_size::int, p25, p50, p75, p90, avg_salary, min_salary, max_salary,
      '[]'::jsonb as institution_breakdown,
      '[]'::jsonb as yearly_trend
    FROM role_stats
    ORDER BY sample_size DESC;
  `);

  // Update institution_breakdown for each benchmark
  await execSQL(`
    UPDATE benchmarks b SET institution_breakdown = COALESCE((
      SELECT jsonb_agg(jsonb_build_object('type', sector_name, 'median', med, 'count', cnt) ORDER BY cnt DESC)
      FROM (
        SELECT trim(d.sector) as sector_name,
          round(percentile_cont(0.5) WITHIN GROUP (ORDER BY d.salary_paid))::int as med,
          count(*)::int as cnt
        FROM disclosures d
        WHERE d.year = 2024 AND d.job_title = b.role AND d.sector IS NOT NULL
        GROUP BY trim(d.sector)
      ) x
    ), '[]'::jsonb);
  `);

  // Update yearly_trend
  await execSQL(`
    UPDATE benchmarks b SET yearly_trend = COALESCE((
      SELECT jsonb_agg(jsonb_build_object('year', yr, 'median', med, 'count', cnt) ORDER BY yr)
      FROM (
        SELECT d.year as yr,
          round(percentile_cont(0.5) WITHIN GROUP (ORDER BY d.salary_paid))::int as med,
          count(*)::int as cnt
        FROM disclosures d
        WHERE d.job_title = b.role
        GROUP BY d.year
      ) x
    ), '[]'::jsonb);
  `);

  const benchResult = await execSQL('SELECT count(*) FROM benchmarks;');
  console.log(`  Benchmarks: ${benchResult[0]?.count}\n`);

  // ══════════════════════════════════════════════════════════════════════════════
  // FINAL COUNTS
  // ══════════════════════════════════════════════════════════════════════════════
  console.log('=== FINAL COUNTS ===');
  for (const t of ['disclosures','employers','sectors','regions','anomalies','historical_series','stats_summary','benchmarks']) {
    const r = await execSQL(`SELECT count(*) FROM ${t};`);
    console.log(`  ${t}: ${Number(r[0]?.count).toLocaleString()}`);
  }
  console.log('\nAll tables rebuilt from real disclosure data!');
}

main().catch(e => { console.error(e); process.exit(1); });
