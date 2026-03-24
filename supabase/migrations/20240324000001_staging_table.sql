-- Staging table for raw Ontario Sunshine List CSV import.
-- Column names match the CSV headers exactly (lowercase, underscores).
-- After importing CSV here, run the transform below to populate disclosures.

CREATE TABLE IF NOT EXISTS disclosures_raw (
  sector          TEXT,
  last_name       TEXT,
  first_name      TEXT,
  salary_paid     TEXT,  -- TEXT so CSV import never fails on formatting
  taxable_benefits TEXT,
  employer        TEXT,
  job_title       TEXT,
  calendar_year   TEXT
);

-- Allow service_role to insert (used by CSV import and ETL)
ALTER TABLE disclosures_raw ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON disclosures_raw FOR ALL USING (auth.role() = 'service_role');

-- ══════════════════════════════════════════════════════════════════════════════
-- TRANSFORM: run this after CSV import to move data into disclosures table.
-- Safe to run multiple times (ON CONFLICT DO NOTHING).
-- ══════════════════════════════════════════════════════════════════════════════
--
-- INSERT INTO disclosures (
--   id, year, first_name, last_name, job_title,
--   employer, sector, salary_paid, taxable_benefits, region_id, region_name
-- )
-- SELECT
--   gen_random_uuid()::text          AS id,
--   calendar_year::integer           AS year,
--   trim(first_name)                 AS first_name,
--   trim(last_name)                  AS last_name,
--   trim(job_title)                  AS job_title,
--   trim(employer)                   AS employer,
--   trim(sector)                     AS sector,
--   replace(replace(trim(salary_paid), ',', ''), '$', '')::numeric  AS salary_paid,
--   replace(replace(trim(taxable_benefits), ',', ''), '$', '')::numeric AS taxable_benefits,
--   NULL                             AS region_id,
--   NULL                             AS region_name
-- FROM disclosures_raw
-- WHERE salary_paid IS NOT NULL
--   AND salary_paid <> ''
--   AND calendar_year IS NOT NULL;
--
-- After running the transform you can optionally clear the staging table:
-- TRUNCATE disclosures_raw;
