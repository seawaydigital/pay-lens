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
- `NEXT_PUBLIC_TURSO_AUTH_TOKEN` — Turso auth token (expires ~7 days after DB destroy/recreate — renew with `turso db tokens create paylens-v2` in WSL)
- Both set as GitHub secrets for CI/CD deployment and in `apps/web/.env.local` for local dev

## Database Schema

### Tables
- `disclosures` — Main table: **3,270,174 rows** (all 30 years: 1996–2025)
  - Columns: id, year, first_name, last_name, job_title, employer, employer_id, sector, salary_paid, taxable_benefits, region_id, region_name
  - Uses deterministic IDs (SHA-256 hash of year+name+employer+salary) for resumable loads
  - Indexed on: year, employer_id, sector, (last_name, first_name), job_title, salary_paid, region_id, (job_title, year, salary_paid)
- `disclosures_fts` — FTS5 virtual table (content=disclosures) for fast full-text search
- `employers` — Aggregated employer stats (all-years rollup — not year-specific)
- `sectors` — Sector-level aggregates (all-years rollup — not year-specific)
- `regions` — Census Division regions with lat/lng for the map (49 regions, all-years)
- `regions_by_year` — Pre-computed median + headcount per (year, region_id) — 1,470 rows (49 × 30 years)
- `dashboard_by_year` — Pre-computed per-year dashboard data: employee_count, total_comp, median_salary, sectors_json, employers_json — 30 rows (1996–2025). Used by dashboard year selector for instant switching.
- `anomalies` — Flagged unusual salary changes (500 rows: 300 large_increase, 50 large_decrease, 75 new_high_entry, 75 multi_employer)
- `historical_series` — Per-year aggregate stats (30 rows, 1996–2025)
- `stats_summary` — Dashboard summary stats (single row, all-years totals)
- `benchmarks` — Role-based salary benchmarks with percentiles (1,824 rows, based on 2025 data)

### Data State (complete as of April 2026)
All 30 years loaded from `~/Documents/Cowork/{year}-salaries.csv` (uniform naming)
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
# Reads all CSVs from ~/Documents/Cowork/{year}-salaries.csv (1996-2025)
node scripts/build-local-db.mjs

# Skip CSV loading if only derived tables need rebuilding:
SKIP_LOAD=1 node scripts/build-local-db.mjs

# Upload to Turso (requires Turso CLI in WSL Ubuntu):
wsl -d Ubuntu -- bash -c "~/.local/bin/turso db destroy paylens-v2 --yes && ~/.local/bin/turso db create paylens-v2 --from-file /tmp/paylens.db --wait"

# After import — issue new token and update .env.local + GitHub secret:
wsl -d Ubuntu -- bash -c "~/.local/bin/turso db tokens create paylens-v2"
# Then: gh secret set NEXT_PUBLIC_TURSO_AUTH_TOKEN --body "<token>"

# Re-add covering index (not preserved by import):
node scripts/add-person-index.mjs
```

### Post-import checklist (run after every turso db import)
```bash
node scripts/add-fts.mjs           # Rebuild FTS5 index
node scripts/add-person-index.mjs  # Re-add covering index (job_title, year, salary_paid)
# dashboard_by_year and regions_by_year ARE built by build-local-db.mjs and carried in the file
```

### CSV file locations
All 30 CSVs in `~/Documents/Cowork/` with uniform `{year}-salaries.csv` naming.
Build script reads them automatically — no manual file list needed.

## Search Architecture

Search uses prefix matching on indexed columns (fast) rather than `LIKE '%term%'` wildcards:
- Single term → `last_name LIKE 'term%' OR first_name LIKE 'term%' OR employer LIKE '%term%'`
- Two terms → `(first_name LIKE 'A%' AND last_name LIKE 'B%') OR (first_name LIKE 'B%' AND last_name LIKE 'A%')`
- FTS5 virtual table (`disclosures_fts`) exists in the DB for potential future MATCH queries
- Year filter defaults to `'all'`; dropdown covers 1996–2025

## Pages (20 total)

| Route | Description |
|---|---|
| `/` | Dashboard with year selector (1996–2025), stat cards, sector chart, top employers, YoY trend |
| `/search` | Full-text search with filters (sector, year 1996–2025, salary range) |
| `/person?id=` | Individual disclosure detail with salary history, peer percentile |
| `/employers` | Employer directory with search |
| `/employers/profile?id=` | Employer detail with charts |
| `/sectors` | Sector overview with velocity stream chart |
| `/sectors/detail?id=` | Individual sector detail |
| `/benchmark` | Role benchmarking tool (enter title + region) |
| `/map` | Interactive Leaflet choropleth map of Ontario regions (year selector 1996–2025) |
| `/compare` | Side-by-side employer comparison |
| `/compare/people` | Side-by-side person comparison |
| `/history` | Historical explorer with inflation toggle |
| `/anomalies` | Flagged unusual salary changes |
| `/methodology` | Data methodology explanation |
| `/opt-out` | Name removal request form (year dropdown 1996–2025) |
| `/report-error` | Data error reporting form (year dropdown 1996–2025) |

## Key Files

| File | Purpose |
|---|---|
| `apps/web/src/lib/turso.ts` | Turso client + all TypeScript interfaces |
| `apps/web/src/lib/db.ts` | All database queries (data access layer) |
| `apps/web/src/lib/utils.ts` | formatCurrency, formatNumber, formatPercent, cn |
| `apps/web/src/lib/constants.ts` | NAV_ITEMS for site header navigation |
| `apps/web/src/lib/geo/regions.ts` | Ontario Census Division definitions |
| `apps/web/src/lib/seo.ts` | createMetadata helper |
| `apps/web/src/app/dashboard-client.tsx` | Dashboard with year selector, uses `getDashboardByYear()` + in-memory cache |
| `apps/web/scripts/build-local-db.mjs` | **Unified build pipeline** — loads all 30 CSVs from Cowork/, builds all derived tables including `dashboard_by_year` and `regions_by_year`, creates FTS index (gitignored) |
| `apps/web/scripts/add-fts.mjs` | One-time: rebuild FTS5 index on live DB after import (gitignored) |
| `apps/web/scripts/add-person-index.mjs` | One-time: add covering index `(job_title, year, salary_paid)` on live DB (gitignored) |
| `apps/web/scripts/add-dashboard-by-year.mjs` | One-time: populate `dashboard_by_year` table on live DB (gitignored) |
| `apps/web/next.config.mjs` | basePath for GitHub Pages in production |

## db.ts Key Functions

| Function | Description |
|---|---|
| `getDashboardByYear(year)` | PK lookup from `dashboard_by_year` — returns sectors_json + employers_json pre-parsed. Used by dashboard year selector. |
| `getRegionsByYear(year?)` | Year-specific map data from `regions_by_year` (<200ms); no-arg falls back to all-years `regions` table |
| `getHistoricalSeries()` | Returns 30 rows with `sectors` JSON: `Record<string, { count: number; median: number }>` |
| `getPersonDisclosures(firstName, lastName, employerId?)` | Optional third arg scopes to one employer; omit for name-only fallback |
| `getRegionById(regionId)` | Lookup a single region by PK — used on Employer Profile page |
| `getSectorsByYear(year)` | Live GROUP BY query — deprecated for dashboard, kept for other pages |
| `getTopEmployersByYear(year, limit?)` | Live GROUP BY query — deprecated for dashboard, kept for other pages |

## Important Notes

- **No fabricated data** — all data must come from real Turso queries or actual CSV imports. No mock/sample JSON files.
- **Loader scripts are gitignored** — `apps/web/scripts/` contains auth tokens and is in `.gitignore`. Never commit scripts from that directory.
- **No Supabase** — fully removed April 2026. No `supabase.ts`, no `supabase/` dir, no `packages/etl/`. All data flows through Turso only.
- **react-leaflet v4** (not v5) — v5 requires React 19, this project uses React 18.
- **Dashboard uses dynamic import** — `page.tsx` dynamically imports `dashboard-client.tsx` with `ssr: false` to avoid SSR issues.
- **Dashboard year selector** — `getDashboardByYear(year)` does a single PK lookup on `dashboard_by_year`. Client caches results in `useRef<Map>` so revisiting a year is instant. Adjacent years prefetched in background after initial load.
- **Employer deduplication** — bilingual names (English / French) normalized to English-only by `normalizeEmployer()` in build script.
- **Sector normalization** — en-dash (U+2013) vs ASCII hyphen collisions handled by `normalizeSector()` in build script.
- **Region mapping** — 49 Ontario Census Divisions, matched via keyword rules in build script. ~60% coverage, provincial orgs default to Toronto.
- **Turso import** — CLI changed: use `turso db destroy paylens-v2 --yes` then `turso db create paylens-v2 --from-file /tmp/paylens.db --wait`. The old `--overwrite` flag no longer exists.
- **After DB import** — always run `node scripts/add-fts.mjs` AND `node scripts/add-person-index.mjs`. The `dashboard_by_year` and `regions_by_year` tables ARE carried in the DB file — no extra script needed.
- **CI** — `ci.yml` runs lint/typecheck/test/build (Turso secrets); `deploy.yml` deploys to GitHub Pages. No Python/ETL jobs remain.
- **`/person` page** — uses `turso.batch()` in two-phase loading: effect 1 fetches the primary record and renders immediately; effect 2 batches all 6 secondary queries in one HTTP request. Known architecture deviation from db.ts pattern; works correctly.
- **`/person` and `/compare/people` history scoped to employer** — both scope salary history by `first_name + last_name + employer_id` so two people with the same name at different orgs are never merged.
- **`total_compensation` is not a DB column** — always compute as `salary_paid + taxable_benefits`. Never read `d.total_compensation` from a raw DB row (will be `undefined`).
- **Search defaults to "All years"** — year filter defaults to `'all'`; dropdown covers 1996–2025. `hasActiveFilters` and `clearFilters` treat `'all'` as baseline.
- **Dashboard "Total Employees"** stat uses `dashboard_by_year.employee_count` for the selected year (e.g. 404,914 for 2025), not `stats_summary.total_records` (3,270,174 all-years).
- **`historical_series.sectors`** is a JSON column: `Record<string, { count: number; median: number }>` keyed by normalized sector name. The Sector Trend Chart reads this.
- **`getRegionById(regionId)`** is available in `db.ts` for looking up a region by its `region_id` primary key.
- **Anomaly `year_prev` can be null** for `new_high_entry` flag — treat null as "no prior year". Never coerce null to `0` with `?? 0` in display code.
- **Stop hook** — `.claude/settings.local.json` has a Stop hook with `bypassPermissions: true` that runs a memory-sync agent. It reads recent git commits and updates CLAUDE.md + the memory file. Only runs when commits exist in the last 4 hours.
