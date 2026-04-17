# Pay Lens

Ontario Sunshine List pay transparency platform. Turns the annual Public Sector Salary Disclosure into a tool workers use to understand their worth — with role benchmarking, geographic visualization, inflation-adjusted views, and employer comparisons.

**Live site:** https://seawaydigital.github.io/pay-lens

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router, `output: 'export'`) |
| Styling | Tailwind CSS — Warm Sunshine theme (`#fffbeb`, `#d97706`, `#78350f`) |
| Charts | Recharts |
| Maps | Leaflet via react-leaflet **v4** (not v5 — requires React 18) |
| Database | Turso (libSQL/SQLite) — `paylens-v2` on AWS us-east-1 |
| DB client | `@libsql/client/web` in browser; `@libsql/client` in Node.js scripts |
| Hosting | GitHub Pages — auto-deploys on push to `main` |
| Monorepo | pnpm + Turborepo |

---

## Local Development

```bash
pnpm install
cp apps/web/.env.local.example apps/web/.env.local  # fill in Turso credentials
pnpm dev --filter=web
```

Open [http://localhost:3000](http://localhost:3000).

### Required environment variables (`apps/web/.env.local`)

```
NEXT_PUBLIC_TURSO_DATABASE_URL=libsql://paylens-v2-seawaydigital.aws-us-east-1.turso.io
NEXT_PUBLIC_TURSO_AUTH_TOKEN=<token>
```

Token expires ~7 days after a DB destroy/recreate. Renew with:
```bash
wsl -d Ubuntu -- bash -c "~/.local/bin/turso db tokens create paylens-v2"
```
Then update `.env.local` and the `NEXT_PUBLIC_TURSO_AUTH_TOKEN` GitHub secret.

---

## Database

**3,270,174 disclosures** across 30 years (1996–2025), ~2.4 GB.

### Full rebuild (when adding a new year)

```bash
cd apps/web

# 1. Build local SQLite — reads all CSVs from ~/Documents/Cowork/{year}-salaries.csv
node scripts/build-local-db.mjs

# 2. Upload to Turso (WSL)
wsl -d Ubuntu -- bash -c "~/.local/bin/turso db destroy paylens-v2 --yes && \
  ~/.local/bin/turso db create paylens-v2 --from-file /tmp/paylens.db --wait"

# 3. Renew auth token and update secrets (see above)

# 4. Post-import — MUST run both:
node scripts/add-fts.mjs            # Rebuild FTS5 full-text search index
node scripts/add-person-index.mjs   # Restore covering index (not preserved by import)
```

> **Note:** `dashboard_by_year` and `regions_by_year` ARE preserved in the DB file — no extra script needed for those.

### Key tables

| Table | Rows | Description |
|-------|------|-------------|
| `disclosures` | 3,270,174 | All salary records, 1996–2025 |
| `disclosures_fts` | — | FTS5 virtual table for full-text search |
| `employers` | — | Aggregated employer stats (all-years) |
| `sectors` | — | Sector-level aggregates (all-years) |
| `regions` | 49 | Ontario Census Divisions with lat/lng |
| `regions_by_year` | 1,470 | Pre-computed median + headcount per (year, region) |
| `dashboard_by_year` | 30 | Pre-computed per-year dashboard data |
| `historical_series` | 30 | Per-year aggregate stats |
| `benchmarks` | 1,824 | Role salary benchmarks with percentiles (2025 data) |
| `anomalies` | 500 | Flagged unusual salary changes |

### Indexes

All standard indexes are preserved by `turso db create --from-file`. One is **not**:

| Index | Columns | Notes |
|-------|---------|-------|
| `idx_disc_title_year_sal` | `(job_title, year, salary_paid)` | **Not preserved by import** — run `add-person-index.mjs` after every DB reimport, or wait for next deploy (deploy.yml restores it automatically) |

---

## CI / CD

| Workflow | Trigger | What it does |
|----------|---------|-------------|
| `ci.yml` | Push / PR | Lint, typecheck, build |
| `deploy.yml` | Push to `main` | Build → ensure covering index on Turso → deploy to GitHub Pages |
| `keep-alive.yml` | Cron every 5 min | Pings Turso with `SELECT 1` to prevent DB cold starts |

---

## Architecture Notes

- **`/person` page** queries Turso in a single `batch()` call — 7 queries via SQL subqueries in one HTTP round trip.
- **Dashboard** uses pre-computed `dashboard_by_year` table for instant year switching; results cached client-side in `useRef<Map>`.
- **`SiteHeader`** fires a background warm-up query on every page load to keep the DB warm.
- **`total_compensation`** is not a DB column — always compute as `salary_paid + taxable_benefits`.
- **Sector velocity chart** uses 6 distinct spectrum colors: amber (School Boards), red (Hospitals), blue (Universities), green (Municipalities), purple (Government), cyan (Crown Agencies).
