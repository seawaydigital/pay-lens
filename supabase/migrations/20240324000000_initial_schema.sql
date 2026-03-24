-- Pay Lens — Ontario Sunshine List Database Schema
-- Tables for salary disclosures, employers, sectors, regions, anomalies, and historical aggregates

-- ══════════════════════════════════════════════════════════════════════════════
-- 1. EMPLOYERS
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS employers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  sector TEXT NOT NULL,
  region_id TEXT NOT NULL,
  headcount INTEGER NOT NULL DEFAULT 0,
  median_salary NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_employers_sector ON employers (sector);
CREATE INDEX idx_employers_region ON employers (region_id);
CREATE INDEX idx_employers_name ON employers (name);

-- ══════════════════════════════════════════════════════════════════════════════
-- 2. SALARY DISCLOSURES (the core table)
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS disclosures (
  id TEXT PRIMARY KEY,
  year INTEGER NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  job_title TEXT NOT NULL,
  employer TEXT NOT NULL,
  employer_id TEXT REFERENCES employers(id),
  sector TEXT NOT NULL,
  salary_paid NUMERIC NOT NULL,
  taxable_benefits NUMERIC NOT NULL DEFAULT 0,
  total_compensation NUMERIC GENERATED ALWAYS AS (salary_paid + taxable_benefits) STORED,
  region_id TEXT,
  region_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_disclosures_year ON disclosures (year);
CREATE INDEX idx_disclosures_employer_id ON disclosures (employer_id);
CREATE INDEX idx_disclosures_sector ON disclosures (sector);
CREATE INDEX idx_disclosures_region ON disclosures (region_id);
CREATE INDEX idx_disclosures_salary ON disclosures (salary_paid DESC);
CREATE INDEX idx_disclosures_name ON disclosures (last_name, first_name);
CREATE INDEX idx_disclosures_job_title ON disclosures (job_title);

-- Full-text search index
ALTER TABLE disclosures ADD COLUMN IF NOT EXISTS fts tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english',
      coalesce(first_name, '') || ' ' ||
      coalesce(last_name, '') || ' ' ||
      coalesce(job_title, '') || ' ' ||
      coalesce(employer, '')
    )
  ) STORED;

CREATE INDEX idx_disclosures_fts ON disclosures USING gin(fts);

-- ══════════════════════════════════════════════════════════════════════════════
-- 3. SECTORS (aggregated stats)
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS sectors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  employee_count INTEGER NOT NULL DEFAULT 0,
  avg_salary NUMERIC NOT NULL DEFAULT 0,
  median_salary NUMERIC NOT NULL DEFAULT 0,
  min_salary NUMERIC NOT NULL DEFAULT 0,
  max_salary NUMERIC NOT NULL DEFAULT 0,
  total_compensation NUMERIC NOT NULL DEFAULT 0,
  yoy_growth NUMERIC DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ══════════════════════════════════════════════════════════════════════════════
-- 4. REGIONS (aggregated salary data)
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS regions (
  region_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  median_salary NUMERIC NOT NULL DEFAULT 0,
  employee_count INTEGER NOT NULL DEFAULT 0,
  lat NUMERIC,
  lng NUMERIC,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ══════════════════════════════════════════════════════════════════════════════
-- 5. ANOMALIES (flagged unusual salary changes)
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS anomalies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  employer TEXT NOT NULL,
  title TEXT NOT NULL,
  salary_prev NUMERIC,
  salary_curr NUMERIC NOT NULL,
  year_prev INTEGER,
  year_curr INTEGER NOT NULL,
  change_percent NUMERIC,
  change_amount NUMERIC,
  flag TEXT NOT NULL CHECK (flag IN ('large_increase', 'large_decrease', 'new_high_entry', 'multi_employer')),
  possible_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_anomalies_flag ON anomalies (flag);
CREATE INDEX idx_anomalies_year ON anomalies (year_curr);

-- ══════════════════════════════════════════════════════════════════════════════
-- 6. HISTORICAL SERIES (year-over-year aggregates)
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS historical_series (
  year INTEGER PRIMARY KEY,
  total_employees INTEGER NOT NULL,
  total_compensation NUMERIC NOT NULL,
  median_salary NUMERIC NOT NULL,
  average_salary NUMERIC NOT NULL,
  p25_salary NUMERIC NOT NULL,
  p75_salary NUMERIC NOT NULL,
  p90_salary NUMERIC NOT NULL,
  threshold NUMERIC NOT NULL DEFAULT 100000,
  cpi_index NUMERIC NOT NULL,
  sectors JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- ══════════════════════════════════════════════════════════════════════════════
-- 7. STATS SUMMARY (platform-wide stats, single row)
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS stats_summary (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  total_records INTEGER NOT NULL DEFAULT 0,
  unique_employers INTEGER NOT NULL DEFAULT 0,
  latest_year INTEGER NOT NULL DEFAULT 2024,
  median_salary NUMERIC NOT NULL DEFAULT 0,
  total_compensation NUMERIC NOT NULL DEFAULT 0,
  yoy_growth NUMERIC DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ══════════════════════════════════════════════════════════════════════════════
-- 8. BENCHMARK DATA (pre-computed role benchmarks)
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS benchmarks (
  id TEXT PRIMARY KEY,
  role TEXT NOT NULL,
  region_id TEXT,
  region_name TEXT,
  sample_size INTEGER NOT NULL DEFAULT 0,
  p25 NUMERIC NOT NULL,
  p50 NUMERIC NOT NULL,
  p75 NUMERIC NOT NULL,
  p90 NUMERIC NOT NULL,
  avg_salary NUMERIC NOT NULL,
  min_salary NUMERIC NOT NULL,
  max_salary NUMERIC NOT NULL,
  institution_breakdown JSONB DEFAULT '[]'::jsonb,
  yearly_trend JSONB DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_benchmarks_role ON benchmarks (role);
CREATE INDEX idx_benchmarks_region ON benchmarks (region_id);

-- ══════════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY — allow public read access (anon key)
-- ══════════════════════════════════════════════════════════════════════════════
ALTER TABLE employers ENABLE ROW LEVEL SECURITY;
ALTER TABLE disclosures ENABLE ROW LEVEL SECURITY;
ALTER TABLE sectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE anomalies ENABLE ROW LEVEL SECURITY;
ALTER TABLE historical_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE stats_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE benchmarks ENABLE ROW LEVEL SECURITY;

-- Public read access for all tables (using anon key)
CREATE POLICY "Allow public read access" ON employers FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON disclosures FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON sectors FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON regions FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON anomalies FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON historical_series FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON stats_summary FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON benchmarks FOR SELECT USING (true);

-- Service role can do everything (for ETL pipeline)
CREATE POLICY "Service role full access" ON employers FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON disclosures FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON sectors FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON regions FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON anomalies FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON historical_series FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON stats_summary FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON benchmarks FOR ALL USING (auth.role() = 'service_role');
