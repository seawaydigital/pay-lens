/**
 * Pay Lens — Data Access Layer
 *
 * All Turso/libSQL queries live here. Pages import from this module,
 * never from turso.ts directly, so the query surface is easy to audit.
 */
import { turso } from './turso';
import type {
  Disclosure,
  Employer,
  Sector,
  Region,
  Anomaly,
  HistoricalYear,
  StatsSummary,
  Benchmark,
} from './turso';

// Re-export types so consumers can import from db.ts or turso.ts
export type { Disclosure, Employer, Sector, Region, Anomaly, HistoricalYear, StatsSummary, Benchmark };

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Convert a Turso row (which may have bigint/string values) to a plain object with proper types */
function rowToObject<T>(row: Record<string, unknown>): T {
  const obj: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    // libSQL returns bigints for INTEGER columns; convert to number
    if (typeof value === 'bigint') {
      obj[key] = Number(value);
    } else {
      obj[key] = value;
    }
  }
  return obj as T;
}

function rowsToArray<T>(rows: Array<Record<string, unknown>>): T[] {
  return rows.map((r) => rowToObject<T>(r));
}

// ── Disclosures ────────────────────────────────────────────────────────────────

export interface SearchParams {
  query?: string;
  sector?: string;
  year?: number;
  regionId?: string;
  minSalary?: number;
  maxSalary?: number;
  page?: number;
  pageSize?: number;
}

export interface SearchResult {
  data: Disclosure[];
  total: number;
}

export async function searchDisclosures({
  query = '',
  sector,
  year,
  regionId,
  minSalary,
  maxSalary,
  page = 1,
  pageSize = 25,
}: SearchParams): Promise<SearchResult> {
  const conditions: string[] = [];
  const args: (string | number)[] = [];

  const hasSearch = !!query?.trim();

  if (hasSearch) {
    // Use FTS5 MATCH for fast full-text search across first_name, last_name, employer, job_title.
    // The disclosures_fts virtual table (content=disclosures) is built by scripts/add-fts.mjs.
    // Each term gets a prefix wildcard (*) so "smith" matches "Smith", "Smithson", etc.
    const ftsQuery = query
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((t) => t.replace(/[^\w\u00C0-\u024F]/g, '') + '*') // strip FTS5 special chars, add prefix *
      .filter((t) => t.length > 1) // skip bare '*'
      .join(' ');
    if (ftsQuery) {
      conditions.push(
        `rowid IN (SELECT rowid FROM disclosures_fts WHERE disclosures_fts MATCH ?)`
      );
      args.push(ftsQuery);
    }
  }

  if (sector) {
    conditions.push('sector = ?');
    args.push(sector);
  }
  if (year) {
    conditions.push('year = ?');
    args.push(year);
  }
  if (regionId) {
    conditions.push('region_id = ?');
    args.push(regionId);
  }
  if (minSalary) {
    conditions.push('salary_paid >= ?');
    args.push(minSalary);
  }
  if (maxSalary) {
    conditions.push('salary_paid <= ?');
    args.push(maxSalary);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * pageSize;

  const sql = `SELECT * FROM disclosures ${where} ORDER BY salary_paid DESC LIMIT ? OFFSET ?`;
  args.push(pageSize, offset);

  const result = await turso.execute({ sql, args });
  const data = rowsToArray<Disclosure>(result.rows as unknown as Array<Record<string, unknown>>);

  // Estimate total: if we got a full page, there are more results.
  const total =
    data.length < pageSize
      ? offset + data.length // Last page — exact count
      : offset + pageSize + 1; // More pages exist — show "25+" style

  return { data, total };
}

export async function getDisclosureById(id: string): Promise<Disclosure | null> {
  const result = await turso.execute({ sql: 'SELECT * FROM disclosures WHERE id = ?', args: [id] });
  if (result.rows.length === 0) return null;
  return rowToObject<Disclosure>(result.rows[0] as unknown as Record<string, unknown>);
}

export async function getPersonDisclosures(
  firstName: string,
  lastName: string,
  employerId?: string
): Promise<Disclosure[]> {
  // When employer_id is known, scope to that employer to avoid merging two
  // people who happen to share the same name at different organisations.
  const sql = employerId
    ? 'SELECT * FROM disclosures WHERE LOWER(first_name) = LOWER(?) AND LOWER(last_name) = LOWER(?) AND employer_id = ? ORDER BY year DESC'
    : 'SELECT * FROM disclosures WHERE LOWER(first_name) = LOWER(?) AND LOWER(last_name) = LOWER(?) ORDER BY year DESC';
  const args: (string | number)[] = employerId
    ? [firstName, lastName, employerId]
    : [firstName, lastName];
  const result = await turso.execute({ sql, args });
  return rowsToArray<Disclosure>(result.rows as unknown as Array<Record<string, unknown>>);
}

// ── Employers ─────────────────────────────────────────────────────────────────

export async function getEmployers(sector?: string): Promise<Employer[]> {
  let sql = 'SELECT * FROM employers';
  const args: string[] = [];

  if (sector) {
    sql += ' WHERE sector = ?';
    args.push(sector);
  }

  sql += ' ORDER BY headcount DESC';

  const result = await turso.execute({ sql, args });
  return rowsToArray<Employer>(result.rows as unknown as Array<Record<string, unknown>>);
}

export async function getEmployerById(id: string): Promise<Employer | null> {
  const result = await turso.execute({ sql: 'SELECT * FROM employers WHERE id = ?', args: [id] });
  if (result.rows.length === 0) return null;
  return rowToObject<Employer>(result.rows[0] as unknown as Record<string, unknown>);
}

export async function getEmployerDisclosures(employerId: string, year?: number): Promise<Disclosure[]> {
  let sql = 'SELECT * FROM disclosures WHERE employer_id = ?';
  const args: (string | number)[] = [employerId];

  if (year) {
    sql += ' AND year = ?';
    args.push(year);
  }

  sql += ' ORDER BY salary_paid DESC';

  const result = await turso.execute({ sql, args });
  return rowsToArray<Disclosure>(result.rows as unknown as Array<Record<string, unknown>>);
}

// ── Sectors ───────────────────────────────────────────────────────────────────

export async function getSectors(): Promise<Sector[]> {
  const result = await turso.execute('SELECT * FROM sectors ORDER BY employee_count DESC');
  return rowsToArray<Sector>(result.rows as unknown as Array<Record<string, unknown>>);
}

export async function getSectorById(id: string): Promise<Sector | null> {
  const result = await turso.execute({ sql: 'SELECT * FROM sectors WHERE id = ?', args: [id] });
  if (result.rows.length === 0) return null;
  return rowToObject<Sector>(result.rows[0] as unknown as Record<string, unknown>);
}

// ── Regions ───────────────────────────────────────────────────────────────────

export async function getRegions(): Promise<Region[]> {
  const result = await turso.execute('SELECT * FROM regions ORDER BY employee_count DESC');
  return rowsToArray<Region>(result.rows as unknown as Array<Record<string, unknown>>);
}

export async function getRegionById(regionId: string): Promise<Region | null> {
  const result = await turso.execute({ sql: 'SELECT * FROM regions WHERE region_id = ?', args: [regionId] });
  if (result.rows.length === 0) return null;
  return rowToObject<Region>(result.rows[0] as unknown as Record<string, unknown>);
}

/**
 * Returns region-level stats for a specific year (or all years if year is
 * undefined).
 *
 * For a specific year: queries the pre-aggregated regions_by_year table
 * (245 rows total, populated by scripts/add-regions-by-year.mjs). This
 * returns in <100ms regardless of year. Previously used a window-function
 * CTE on the disclosures table which took 9–29 s on Turso.
 *
 * For all-years: falls back to the pre-aggregated regions table.
 */
export async function getRegionsByYear(year?: number): Promise<Region[]> {
  if (!year) return getRegions();

  const sql = `
    SELECT
      region_id,
      name,
      lat,
      lng,
      median_salary,
      employee_count
    FROM regions_by_year
    WHERE year = ?
    ORDER BY employee_count DESC
  `;

  const result = await turso.execute({ sql, args: [year] });
  // regions_by_year columns match the Region interface directly
  return rowsToArray<Region>(result.rows as unknown as Array<Record<string, unknown>>);
}

// ── Anomalies ─────────────────────────────────────────────────────────────────

export async function getAnomalies(flag?: Anomaly['flag']): Promise<Anomaly[]> {
  let sql = 'SELECT * FROM anomalies';
  const args: string[] = [];

  if (flag) {
    sql += ' WHERE flag = ?';
    args.push(flag);
  }

  sql += ' ORDER BY change_percent DESC';

  const result = await turso.execute({ sql, args });
  return rowsToArray<Anomaly>(result.rows as unknown as Array<Record<string, unknown>>);
}

// ── Historical Series ─────────────────────────────────────────────────────────

export async function getHistoricalSeries(): Promise<HistoricalYear[]> {
  const result = await turso.execute('SELECT * FROM historical_series ORDER BY year ASC');
  return rowsToArray<HistoricalYear>(result.rows as unknown as Array<Record<string, unknown>>).map((row) => {
    // The sectors column may be stored as a JSON string in SQLite
    if (typeof row.sectors === 'string') {
      try {
        row.sectors = JSON.parse(row.sectors);
      } catch {
        row.sectors = {};
      }
    }
    return row;
  });
}

// ── Stats Summary ─────────────────────────────────────────────────────────────

export async function getStatsSummary(): Promise<StatsSummary | null> {
  const result = await turso.execute({ sql: 'SELECT * FROM stats_summary WHERE id = ?', args: [1] });
  if (result.rows.length === 0) return null;
  return rowToObject<StatsSummary>(result.rows[0] as unknown as Record<string, unknown>);
}

// ── Benchmarks ────────────────────────────────────────────────────────────────

export async function getBenchmarks(): Promise<Benchmark[]> {
  const result = await turso.execute('SELECT * FROM benchmarks ORDER BY role ASC');
  return rowsToArray<Benchmark>(result.rows as unknown as Array<Record<string, unknown>>).map((row) => {
    // Parse JSON columns stored as strings in SQLite
    if (typeof row.institution_breakdown === 'string') {
      try {
        row.institution_breakdown = JSON.parse(row.institution_breakdown);
      } catch {
        row.institution_breakdown = [];
      }
    }
    if (typeof row.yearly_trend === 'string') {
      try {
        row.yearly_trend = JSON.parse(row.yearly_trend);
      } catch {
        row.yearly_trend = [];
      }
    }
    return row;
  });
}

export async function getBenchmarkByRole(role: string, regionId?: string): Promise<Benchmark | null> {
  let sql = 'SELECT * FROM benchmarks WHERE LOWER(role) = LOWER(?)';
  const args: string[] = [role];

  if (regionId) {
    sql += ' AND region_id = ?';
    args.push(regionId);
  }

  sql += ' LIMIT 1';

  const result = await turso.execute({ sql, args });
  if (result.rows.length === 0) return null;

  const row = rowToObject<Benchmark>(result.rows[0] as unknown as Record<string, unknown>);

  // Parse JSON columns
  if (typeof row.institution_breakdown === 'string') {
    try {
      row.institution_breakdown = JSON.parse(row.institution_breakdown);
    } catch {
      row.institution_breakdown = [];
    }
  }
  if (typeof row.yearly_trend === 'string') {
    try {
      row.yearly_trend = JSON.parse(row.yearly_trend);
    } catch {
      row.yearly_trend = [];
    }
  }

  return row;
}
