/**
 * Pay Lens — Data Access Layer
 *
 * All Supabase queries live here. Pages import from this module,
 * never from supabase.ts directly, so the query surface is easy to audit.
 */
import { supabase } from './supabase';
import type {
  Disclosure,
  Employer,
  Sector,
  Region,
  Anomaly,
  HistoricalYear,
  StatsSummary,
  Benchmark,
} from './supabase';

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
  const hasSearch = !!query?.trim();

  // Build data query (no count — faster)
  let q = supabase.from('disclosures').select('*');

  if (hasSearch) {
    q = q.textSearch('fts', query.trim().split(/\s+/).join(' & '));
  }
  if (sector) q = q.eq('sector', sector);
  if (year) q = q.eq('year', year);
  if (regionId) q = q.eq('region_id', regionId);
  if (minSalary) q = q.gte('salary_paid', minSalary);
  if (maxSalary) q = q.lte('salary_paid', maxSalary);

  const from = (page - 1) * pageSize;
  q = q.order('salary_paid', { ascending: false }).range(from, from + pageSize - 1);

  const { data, error } = await q;
  if (error) throw error;

  // Estimate total: if we got a full page, there are more results.
  // Use the page data length to infer whether there are more pages.
  const total = (data?.length ?? 0) < pageSize
    ? from + (data?.length ?? 0)  // Last page — exact count
    : from + pageSize + 1;        // More pages exist — show "25+" style

  return { data: data ?? [], total };
}

export async function getDisclosureById(id: string): Promise<Disclosure | null> {
  const { data, error } = await supabase
    .from('disclosures')
    .select('*')
    .eq('id', id)
    .single();
  if (error) return null;
  return data;
}

export async function getPersonDisclosures(firstName: string, lastName: string): Promise<Disclosure[]> {
  const { data, error } = await supabase
    .from('disclosures')
    .select('*')
    .ilike('first_name', firstName)
    .ilike('last_name', lastName)
    .order('year', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// ── Employers ─────────────────────────────────────────────────────────────────

export async function getEmployers(sector?: string): Promise<Employer[]> {
  let q = supabase
    .from('employers')
    .select('*')
    .order('headcount', { ascending: false });

  if (sector) q = q.eq('sector', sector);

  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function getEmployerById(id: string): Promise<Employer | null> {
  const { data, error } = await supabase
    .from('employers')
    .select('*')
    .eq('id', id)
    .single();
  if (error) return null;
  return data;
}

export async function getEmployerDisclosures(employerId: string, year?: number): Promise<Disclosure[]> {
  let q = supabase
    .from('disclosures')
    .select('*')
    .eq('employer_id', employerId)
    .order('salary_paid', { ascending: false });

  if (year) q = q.eq('year', year);

  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

// ── Sectors ───────────────────────────────────────────────────────────────────

export async function getSectors(): Promise<Sector[]> {
  const { data, error } = await supabase
    .from('sectors')
    .select('*')
    .order('employee_count', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getSectorById(id: string): Promise<Sector | null> {
  const { data, error } = await supabase
    .from('sectors')
    .select('*')
    .eq('id', id)
    .single();
  if (error) return null;
  return data;
}

// ── Regions ───────────────────────────────────────────────────────────────────

export async function getRegions(): Promise<Region[]> {
  const { data, error } = await supabase
    .from('regions')
    .select('*')
    .order('employee_count', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// ── Anomalies ─────────────────────────────────────────────────────────────────

export async function getAnomalies(flag?: Anomaly['flag']): Promise<Anomaly[]> {
  let q = supabase
    .from('anomalies')
    .select('*')
    .order('change_percent', { ascending: false });

  if (flag) q = q.eq('flag', flag);

  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

// ── Historical Series ─────────────────────────────────────────────────────────

export async function getHistoricalSeries(): Promise<HistoricalYear[]> {
  const { data, error } = await supabase
    .from('historical_series')
    .select('*')
    .order('year', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

// ── Stats Summary ─────────────────────────────────────────────────────────────

export async function getStatsSummary(): Promise<StatsSummary | null> {
  const { data, error } = await supabase
    .from('stats_summary')
    .select('*')
    .eq('id', 1)
    .single();
  if (error) return null;
  return data;
}

// ── Benchmarks ────────────────────────────────────────────────────────────────

export async function getBenchmarks(): Promise<Benchmark[]> {
  const { data, error } = await supabase
    .from('benchmarks')
    .select('*')
    .order('role', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getBenchmarkByRole(role: string, regionId?: string): Promise<Benchmark | null> {
  let q = supabase
    .from('benchmarks')
    .select('*')
    .ilike('role', role);

  if (regionId) q = q.eq('region_id', regionId);

  const { data, error } = await q.limit(1).single();
  if (error) return null;
  return data;
}
