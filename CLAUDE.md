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
- **Turso (libSQL)** — SQLite at the edge, 9 GB free storage
- Database name: `paylens`
- URL: `libsql://paylens-seawaydigital.aws-us-east-1.turso.io`
- Client: `@libsql/client/web` (browser-compatible HTTP mode) in app code
- Client: `@libsql/client/http` in Node.js loader scripts
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
- Both set as GitHub secrets for CI/CD deployment

## Database Schema

### Tables
- `disclosures` — Main table: ~512K rows (2022-2023 loaded, more years pending)
  - Columns: id, year, first_name, last_name, job_title, employer, employer_id, sector, salary_paid, taxable_benefits, region_id, region_name
  - Uses deterministic IDs (SHA-256 hash of year+name+employer+salary) for resumable loads
- `employers` — Aggregated employer stats (headcount, median salary)
- `sectors` — Sector-level aggregates
- `regions` — Census Division regions with lat/lng for the map
- `anomalies` — Flagged unusual salary changes (YoY jumps, multi-employer)
- `historical_series` — Per-year aggregate stats
- `stats_summary` — Dashboard summary stats (single row)
- `benchmarks` — Role-based salary benchmarks with percentiles

### Derived Tables
Run `node turso-rebuild.mjs` to regenerate employers, sectors, regions, anomalies, historical_series, stats_summary, and benchmarks from the raw disclosures data. Must be run after loading new CSV data.

## Data Loading

### Loading CSV data into Turso
```bash
cd apps/web
node turso-setup.mjs "path/to/csv-file.csv"
```
- Creates schema if needed, then loads CSV
- Uses deterministic IDs — safe to rerun (INSERT OR IGNORE skips existing rows)
- Uses 4 concurrent batch() calls of 1000 rows each for speed (~20K rows/min)
- CSV format: Sector, Last Name, First Name, Salary, Benefits, Employer, Job Title, Year

### Rebuilding derived tables
```bash
cd apps/web
node turso-rebuild.mjs
```

### Current data state (as of April 2026)
- 2022: 266,937 rows ✅ complete
- 2023: ~245,000 rows (partial — Turso free tier write limit hit)
- 2021, 2024, 2025: NOT YET LOADED
- Total expected: ~1.6M rows across 5 years (2021-2025)
- Derived tables: rebuilt for 2022-2023 data

### Pending work
1. **Resume 2023 load** — rerun `turso-setup.mjs` with 2023 CSV when write limit resets
2. **Load remaining years** — 2021, 2024, 2025 CSVs need to be loaded
3. **Rebuild derived tables** after each new year is loaded

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
| `apps/web/turso-setup.mjs` | Schema creation + CSV data loader |
| `apps/web/turso-rebuild.mjs` | Rebuild derived tables from disclosures |
| `apps/web/populate-regions.mjs` | Employer-to-region mapping + region population |
| `apps/web/next.config.mjs` | basePath for GitHub Pages in production |

## Important Notes

- **No fabricated data** — all data must come from real Supabase/Turso queries or actual CSV imports. No mock/sample JSON files.
- **Loader scripts are gitignored** — `turso-setup.mjs`, `turso-rebuild.mjs`, `populate-regions.mjs` etc. contain auth tokens and are in `.gitignore`. Never commit them.
- **Supabase is deprecated** — migrated to Turso. `supabase.ts` still exists but nothing imports it. Can be deleted.
- **react-leaflet v4** (not v5) — v5 requires React 19, this project uses React 18.
- **Dashboard uses dynamic import** — `page.tsx` dynamically imports `dashboard-client.tsx` with `ssr: false` to avoid SSR issues.
- **Employer deduplication** — bilingual employer names (English / French) are normalized to English-only canonical names in the loader scripts.
- **Region mapping** — employers are mapped to Ontario Census Divisions via pattern matching rules in `populate-regions.mjs`. ~60% coverage, provincial orgs default to Toronto.
