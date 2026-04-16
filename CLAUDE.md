# Pay Lens — Ontario Sunshine List Platform

## Project Overview
Pay Lens is a pay transparency platform for Ontario's Sunshine List. It turns the annual Public Sector Salary Disclosure into a tool workers use to understand their worth — with role benchmarking, geographic visualization, inflation-adjusted views, and employer comparisons.

## Architecture

### Frontend
- **Next.js 14** (App Router, `output: 'export'` for static site)
- **Tailwind CSS** with "Warm Sunshine" theme (cream/amber: `#fffbeb`, `#d97706`, `#78350f`)
- **Recharts** for charts, **Leaflet** (react-leaflet v4) for maps
- **Monorepo** managed with pnpm + Turborepo

### Database
- **Turso (libSQL)** — SQLite at the edge, Developer plan ($5.99/mo, 9 GB storage)
- Database name: `paylens-v2`
- URL: `libsql://paylens-v2-seawaydigital.aws-us-east-1.turso.io`
- Client: `@libsql/client/web` (browser-compatible HTTP mode) in app code
- Client: `@libsql/client` in Node.js loader scripts
- All queries go through `apps/web/src/lib/db.ts` (data access layer)
- Types defined in `apps/web/src/lib/turso.ts`

### Hosting
- **GitHub Pages** at `seawaydigital.github.io/pay-lens`
- Auto-deploys on push to `main` via `.github/workflows/deploy.yml`
- `basePath: '/pay-lens'` and `assetPrefix: '/pay-lens/'` set in next.config.mjs (production only)
- GitHub repo: `seawaydigital/pay-lens` (private)

### Environment Variables
- `NEXT_PUBLIC_TURSO_DATABASE_URL` — Turso database URL
- `NEXT_PUBLIC_TURSO_AUTH_TOKEN` — Turso auth token
- Both set as GitHub secrets for CI/CD deployment and in `apps/web/.env.local` for local dev

## Database Schema

### Tables
- `disclosures` — Main table: **3,270,174 rows** (all 30 years: 1996–2025)
  - Columns: id, year, first_name, last_name, job_title, employer, employer_id, sector, salary_paid, taxable_benefits, region_id, region_name
  - Uses deterministic IDs (SHA-256 hash of year+name+employer+salary) for resumable loads
  - Indexed on: year, employer_id, sector, (last_name, first_name), job_title, salary_paid, region_id
- `disclosures_fts` — FTS5 virtual table (content=disclosures) for fast full-text search
- `employers` — Aggregated employer stats (3,096 employers)
- `sectors` — Sector-level aggregates (22 sectors)
- `regions` — Census Division regions with lat/lng for the map (49 regions)
- `anomalies` — Flagged unusual salary changes (500 rows: 300 large_increase, 50 large_decrease, 75 new_high_entry, 75 multi_employer)
- `historical_series` — Per-year aggregate stats (5 rows, 2021–2025)
- `stats_summary` — Dashboard summary stats (single row)
- `benchmarks` — Role-based salary benchmarks with percentiles (1,759 rows)

### Data State (complete as of April 2026)
All 30 years loaded from `~/Documents/Cowork/{year}-salaries.csv` (uniform naming, no colOffset needed)
- 1996: 4,498 | 1997: 5,377 | 1998: 6,291 | 1999: 8,125 | 2000: 10,352
- 2001: 13,034 | 2002: 16,691 | 2003: 20,367 | 2004: 23,249 | 2005: 27,459
- 2006: 34,199 | 2007: 42,761 | 2008: 53,813 | 2009: 64,144 | 2010: 71,581
- 2011: 79,588 | 2012: 88,421 | 2013: 97,780 | 2014: 111,511 | 2015: 115,756
- 2016: 124,316 | 2017: 131,909 | 2018: 151,375 | 2019: 167,098 | 2020: 205,852
- 2021: 244,441 | 2022: 266,937 | 2023: 300,671 | 2024: 377,664 | 2025: 404,914
- **Total: 3,270,174 disclosures**

## Data Pipeline

### Full rebuild (when adding new year's data)
```bash
cd apps/web
# Builds complete local paylens.db from all CSVs in ~/Downloads/
node scripts/build-local-db.mjs

# Skip CSV loading if only derived tables need rebuilding (~12 min saved):
SKIP_LOAD=1 node scripts/build-local-db.mjs

# Upload to Turso (requires Turso CLI in WSL Ubuntu):
wsl -d Ubuntu -- bash -c "cp /mnt/c/Users/ajaustin/Documents/Claude\ Code/Sunshine\ List\ Site/apps/web/paylens.db /tmp/paylens.db && ~/.local/bin/turso db import paylens.db --overwrite"
```

### Quick anomaly sync (without full rebuild)
```bash
cd apps/web
node scripts/sync-anomalies.mjs
```

### Adding FTS5 index to live DB (one-time, or after a new DB import)
```bash
cd apps/web
node scripts/add-fts.mjs
```

### CSV file locations
All 5 CSVs are in `~/Downloads/` (Windows). Build script reads from there automatically.
| Year | File |
|---|---|
| 2021 | `tbs-pssd-compendium-salary-disclosed-2021-en-utf-8-2023-01-05.csv` |
| 2022 | `tbs-pssd-compendium-salary-disclosed-2022-en-utf-8-2024-01-19.csv` |
| 2023 | `tbs-pssd-compendium-salary-disclosed-2023-en-utf-8-2025-03-26.csv` |
| 2024 | `tbs-pssd-compendium-salary-disclosed-2024-en-utf-8-2026-01-29.csv` |
| 2025 | `tbs-pssd-compendium-salary-disclosed-2025-en-utf-8-2026-03-23.csv` |

## Search Architecture

Search uses prefix matching on indexed columns (fast) rather than `LIKE '%term%'` wildcards (full scan on 1.6M rows):
- Single term → `last_name LIKE 'term%' OR first_name LIKE 'term%' OR employer LIKE '%term%'`
- Two terms → `(first_name LIKE 'A%' AND last_name LIKE 'B%') OR (first_name LIKE 'B%' AND last_name LIKE 'A%')`
- FTS5 virtual table (`disclosures_fts`) exists in the DB for potential future MATCH queries

## Pages (20 total)

| Route | Description |
|---|---|
| `/` | Dashboard with stats, sector chart, top employers, YoY trend |
| `/search` | Full-text search with filters (sector, year, salary range) |
| `/person?id=` | Individual disclosure detail with salary history, peer percentile |
| `/employers` | Employer directory with search |
| `/employers/profile?id=` | Employer detail with charts |
| `/sectors` | Sector overview with velocity stream chart |
| `/sectors/detail?id=` | Individual sector detail |
| `/benchmark` | Role benchmarking tool (enter title + region) |
| `/map` | Interactive Leaflet choropleth map of Ontario regions |
| `/compare` | Side-by-side employer comparison |
| `/compare/people` | Side-by-side person comparison |
| `/history` | Historical explorer with inflation toggle |
| `/anomalies` | Flagged unusual salary changes |
| `/methodology` | Data methodology explanation |
| `/opt-out` | Name removal request form |
| `/report-error` | Data error reporting form |

## Key Files

| File | Purpose |
|---|---|
| `apps/web/src/lib/turso.ts` | Turso client + all TypeScript interfaces |
| `apps/web/src/lib/db.ts` | All database queries (data access layer) |
| `apps/web/src/lib/utils.ts` | formatCurrency, formatNumber, formatPercent, cn |
| `apps/web/src/lib/constants.ts` | NAV_ITEMS for site header navigation |
| `apps/web/src/lib/geo/regions.ts` | Ontario Census Division definitions |
| `apps/web/src/lib/seo.ts` | createMetadata helper |
| `apps/web/scripts/build-local-db.mjs` | **Unified build pipeline** — loads CSVs, builds all derived tables, creates FTS index (gitignored) |
| `apps/web/scripts/sync-anomalies.mjs` | Rebuild + sync just the anomalies table to live DB (gitignored) |
| `apps/web/scripts/add-fts.mjs` | One-time migration: add FTS5 virtual table to live DB (gitignored) |
| `apps/web/next.config.mjs` | basePath for GitHub Pages in production |

## Important Notes

- **No fabricated data** — all data must come from real Turso queries or actual CSV imports. No mock/sample JSON files.
- **Loader scripts are gitignored** — `apps/web/scripts/` contains auth tokens and is in `.gitignore`. Never commit scripts from that directory.
- **No Supabase** — fully removed April 2026. No `supabase.ts`, no `supabase/` dir, no `packages/etl/`. All data flows through Turso only.
- **react-leaflet v4** (not v5) — v5 requires React 19, this project uses React 18.
- **Dashboard uses dynamic import** — `page.tsx` dynamically imports `dashboard-client.tsx` with `ssr: false` to avoid SSR issues.
- **Employer deduplication** — bilingual names (English / French) normalized to English-only by `normalizeEmployer()` in build script.
- **Sector normalization** — en-dash (U+2013) vs ASCII hyphen collisions handled by `normalizeSector()` in build script.
- **Region mapping** — 49 Ontario Census Divisions, matched via keyword rules in build script. ~60% coverage, provincial orgs default to Toronto.
- **Turso import** — requires Turso CLI in WSL Ubuntu (`~/.local/bin/turso`) and `sqlite3` package. Token expires ~7 days, renew with `turso config set token <JWT>`.
- **After DB import** — always run `node scripts/add-fts.mjs` to rebuild the FTS5 index on the new database.
- **CI** — `ci.yml` runs lint/typecheck/test/build (Turso secrets); `deploy.yml` deploys to GitHub Pages. No Python/ETL jobs remain.
- **`/person` page** — uses direct `turso.execute()` calls instead of db.ts for its multi-query load. Known architecture deviation; works correctly but bypasses the standard data access layer.
- **`/person` and `/compare/people` history scoped to employer** — both pages scope salary history by `first_name + last_name + employer_id` so two people with the same name at different organizations are never merged. `getPersonDisclosures(firstName, lastName, employerId?)` accepts an optional third arg; when omitted it falls back to name-only (URL-hydration path in compare/people).
- **`total_compensation` is not a DB column** — the `disclosures` table has only `salary_paid` and `taxable_benefits`. Any code that needs total must compute `salary_paid + taxable_benefits` — never read `d.total_compensation` from a raw DB row (it will be `undefined`).
- **Search defaults to "All years"** — year filter in `/search` defaults to `'all'`; the year dropdown covers 1996–2025. `hasActiveFilters` and `clearFilters` both treat `'all'` as the baseline, not `'2025'`.
- **Dashboard "Total Employees"** stat uses `historical_series` for the latest year (404,914 for 2025), not `stats_summary.total_records` (3,270,174 all-years). Always use the historical record to display a per-year headcount.
- **`historical_series.sectors`** is a JSON column: `Record<string, { count: number; median: number }>` keyed by normalized sector name. The Sector Trend Chart reads this to get real per-year headcounts — no fabricated data.
- **`getRegionById(regionId)`** is available in `db.ts` for looking up a region by its `region_id` primary key (e.g. to turn a raw ID into a display name on the Employer Profile page).
- **Anomaly `year_prev` can be null** for `new_high_entry` flag — treat null as "no prior year" and display only `year_curr`. Never coerce null to `0` with `?? 0` in display code.
