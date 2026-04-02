import { createClient, type Client } from '@libsql/client/web';

let _turso: Client | null = null;

function getTurso(): Client {
  if (!_turso) {
    _turso = createClient({
      url: process.env.NEXT_PUBLIC_TURSO_DATABASE_URL || '',
      authToken: process.env.NEXT_PUBLIC_TURSO_AUTH_TOKEN || '',
    });
  }
  return _turso;
}

export { getTurso as tursoClient };

// Backwards-compatible export — lazy singleton
export const turso = new Proxy({} as Client, {
  get(_target, prop) {
    const client = getTurso();
    const val = (client as unknown as Record<string | symbol, unknown>)[prop];
    if (typeof val === 'function') return val.bind(client);
    return val;
  },
});

// Database type definitions matching our schema
export interface Disclosure {
  id: string;
  year: number;
  first_name: string;
  last_name: string;
  job_title: string;
  employer: string;
  employer_id: string | null;
  sector: string;
  salary_paid: number;
  taxable_benefits: number;
  total_compensation: number;
  region_id: string | null;
  region_name: string | null;
}

export interface Employer {
  id: string;
  name: string;
  sector: string;
  region_id: string;
  headcount: number;
  median_salary: number;
}

export interface Sector {
  id: string;
  name: string;
  employee_count: number;
  avg_salary: number;
  median_salary: number;
  min_salary: number;
  max_salary: number;
  total_compensation: number;
  yoy_growth: number;
}

export interface Region {
  region_id: string;
  name: string;
  median_salary: number;
  employee_count: number;
  lat: number;
  lng: number;
}

export interface Anomaly {
  id: string;
  name: string;
  employer: string;
  title: string;
  salary_prev: number | null;
  salary_curr: number;
  year_prev: number | null;
  year_curr: number;
  change_percent: number | null;
  change_amount: number | null;
  flag: 'large_increase' | 'large_decrease' | 'new_high_entry' | 'multi_employer';
  possible_reason: string | null;
}

export interface HistoricalYear {
  year: number;
  total_employees: number;
  total_compensation: number;
  median_salary: number;
  average_salary: number;
  p25_salary: number;
  p75_salary: number;
  p90_salary: number;
  threshold: number;
  cpi_index: number;
  sectors: Record<string, { count: number; median: number }>;
}

export interface StatsSummary {
  id: number;
  total_records: number;
  unique_employers: number;
  latest_year: number;
  median_salary: number;
  total_compensation: number;
  yoy_growth: number;
}

export interface Benchmark {
  id: string;
  role: string;
  region_id: string | null;
  region_name: string | null;
  sample_size: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  avg_salary: number;
  min_salary: number;
  max_salary: number;
  institution_breakdown: Array<{ type: string; median: number; count: number }>;
  yearly_trend: Array<{ year: number; median: number; count: number }>;
}
