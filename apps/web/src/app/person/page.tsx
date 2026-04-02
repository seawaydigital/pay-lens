'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  User,
  Briefcase,
  Building2,
  DollarSign,
  MapPin,
  TrendingUp,
  Calendar,
  BarChart2,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

import { PageHeader } from '@/components/layout/page-header';
import { DataCaveatBanner } from '@/components/shared/data-caveat-banner';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { turso } from '@/lib/turso';
import type { Disclosure } from '@/lib/turso';

// ── helpers ────────────────────────────────────────────────────────────────────
function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  highlight,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-5 ${
        highlight
          ? 'border-sunshine-400 bg-sunshine-50'
          : 'border-sunshine-200 bg-white'
      }`}
    >
      <div className="flex items-center gap-2 text-sunshine-600">
        <Icon className="h-4 w-4" />
        <span className="text-sm">{label}</span>
      </div>
      <p
        className={`mt-2 text-2xl font-bold ${
          highlight ? 'text-sunshine-700' : 'text-sunshine-900'
        }`}
      >
        {value}
      </p>
      {sub && <p className="mt-0.5 text-xs text-sunshine-500">{sub}</p>}
    </div>
  );
}

function SectionCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-sunshine-200 bg-white p-6">
      <h2 className="flex items-center gap-2 text-base font-semibold text-sunshine-900">
        <Icon className="h-4 w-4 text-sunshine-500" />
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

// ── custom tooltip ─────────────────────────────────────────────────────────────
function SalaryTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-sunshine-200 bg-white px-3 py-2 shadow text-sm">
      <p className="font-semibold text-sunshine-900">{label}</p>
      <p className="text-sunshine-700">{formatCurrency(payload[0].value)}</p>
    </div>
  );
}

// ── main content ───────────────────────────────────────────────────────────────
function PersonDetailContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');

  const [person, setPerson] = useState<Disclosure | null>(null);
  const [history, setHistory] = useState<Disclosure[]>([]);
  const [peers, setPeers] = useState<Disclosure[]>([]);
  const [peerStats, setPeerStats] = useState<{
    totalPeers: number;
    peersBelow: number;
    percentile: number;
  } | null>(null);
  const [employerRank, setEmployerRank] = useState<{
    rank: number;
    total: number;
  } | null>(null);
  const [sectorMedian, setSectorMedian] = useState<number | null>(null);
  const [colleagues, setColleagues] = useState<Disclosure[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) { setLoading(false); setNotFound(true); return; }

    async function load() {
      // Helper to convert libSQL rows (which may have bigint values) to plain objects
      function toRow<T>(row: Record<string, unknown>): T {
        const obj: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(row)) {
          obj[k] = typeof v === 'bigint' ? Number(v) : v;
        }
        return obj as T;
      }
      function toRows<T>(rows: Array<Record<string, unknown>>): T[] {
        return rows.map((r) => toRow<T>(r));
      }

      try {
        // 1. Fetch the specific disclosure record
        const discResult = await turso.execute({
          sql: 'SELECT * FROM disclosures WHERE id = ?',
          args: [id!],
        });

        if (discResult.rows.length === 0) { setNotFound(true); setLoading(false); return; }
        const disc = toRow<Disclosure>(discResult.rows[0] as unknown as Record<string, unknown>);
        setPerson(disc);

        // Run all secondary queries in parallel
        const [
          histResult,
          peerTopResult,
          peerTotalResult,
          peerBelowResult,
          empRankAboveResult,
          empTotalResult,
          sectorResult,
          colleagueResult,
        ] = await Promise.all([
          // 2. Salary history — all records with same name
          turso.execute({
            sql: 'SELECT * FROM disclosures WHERE first_name = ? AND last_name = ? ORDER BY year ASC',
            args: [disc.first_name, disc.last_name],
          }),

          // 3. Top peers with same job title (for display table)
          turso.execute({
            sql: 'SELECT * FROM disclosures WHERE year = ? AND job_title = ? ORDER BY salary_paid DESC LIMIT 10',
            args: [disc.year, disc.job_title],
          }),

          // 4a. Total peers with same title (for percentile)
          turso.execute({
            sql: 'SELECT COUNT(*) as cnt FROM disclosures WHERE year = ? AND job_title = ?',
            args: [disc.year, disc.job_title],
          }),

          // 4b. Peers earning less than or equal (for percentile)
          turso.execute({
            sql: 'SELECT COUNT(*) as cnt FROM disclosures WHERE year = ? AND job_title = ? AND salary_paid <= ?',
            args: [disc.year, disc.job_title, disc.salary_paid],
          }),

          // 5a. Employees at same employer earning more (for rank)
          turso.execute({
            sql: 'SELECT COUNT(*) as cnt FROM disclosures WHERE year = ? AND employer_id = ? AND salary_paid > ?',
            args: [disc.year, disc.employer_id ?? '', disc.salary_paid],
          }),

          // 5b. Total employees at same employer
          turso.execute({
            sql: 'SELECT COUNT(*) as cnt FROM disclosures WHERE year = ? AND employer_id = ?',
            args: [disc.year, disc.employer_id ?? ''],
          }),

          // 6. Sector median
          turso.execute({
            sql: 'SELECT median_salary FROM sectors WHERE name = ? LIMIT 1',
            args: [disc.sector],
          }),

          // 7. Same-employer colleagues in related roles (top 5 by salary, excluding self)
          turso.execute({
            sql: 'SELECT * FROM disclosures WHERE year = ? AND employer_id = ? AND id != ? ORDER BY salary_paid DESC LIMIT 5',
            args: [disc.year, disc.employer_id ?? '', disc.id],
          }),
        ]);

        setHistory(toRows<Disclosure>(histResult.rows as unknown as Array<Record<string, unknown>>));
        setPeers(toRows<Disclosure>(peerTopResult.rows as unknown as Array<Record<string, unknown>>));

        // Percentile: (peers earning <= you) / total peers x 100
        const totalPeers = Number(
          (peerTotalResult.rows[0] as unknown as Record<string, unknown>)?.cnt ?? 0
        );
        const peersBelow = Number(
          (peerBelowResult.rows[0] as unknown as Record<string, unknown>)?.cnt ?? 0
        );
        if (totalPeers > 1) {
          setPeerStats({
            totalPeers,
            peersBelow,
            percentile: Math.max(1, Math.round((peersBelow / totalPeers) * 100)),
          });
        }

        // Employer rank
        const empAbove = Number(
          (empRankAboveResult.rows[0] as unknown as Record<string, unknown>)?.cnt ?? 0
        );
        const empTotal = Number(
          (empTotalResult.rows[0] as unknown as Record<string, unknown>)?.cnt ?? 0
        );
        if (empTotal > 0) {
          setEmployerRank({ rank: empAbove + 1, total: empTotal });
        }

        // Sector median
        if (sectorResult.rows.length > 0) {
          const medianVal = (sectorResult.rows[0] as unknown as Record<string, unknown>)?.median_salary;
          if (medianVal != null) {
            setSectorMedian(Number(medianVal));
          }
        }

        setColleagues(toRows<Disclosure>(colleagueResult.rows as unknown as Array<Record<string, unknown>>));
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [id]);

  if (loading) {
    return (
      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-sunshine-300 border-t-sunshine-600" />
        </div>
      </main>
    );
  }

  if (notFound || !person) {
    return (
      <main className="container mx-auto px-4 py-8">
        <Link href="/search" className="inline-flex items-center gap-1.5 text-sm text-sunshine-600 hover:text-sunshine-800">
          <ArrowLeft className="h-4 w-4" /> Back to Search
        </Link>
        <div className="mt-12 text-center">
          <User className="mx-auto h-12 w-12 text-sunshine-300" />
          <h2 className="mt-4 text-xl font-semibold text-sunshine-900">Employee not found</h2>
          <p className="mt-2 text-sm text-sunshine-600">The record you are looking for does not exist or the link may be incorrect.</p>
        </div>
      </main>
    );
  }

  const fullName = `${person.first_name} ${person.last_name}`;
  const totalComp = person.salary_paid + person.taxable_benefits;

  // Sector comparison
  const sectorDiff = sectorMedian
    ? ((person.salary_paid - sectorMedian) / sectorMedian) * 100
    : null;

  // YoY change from history
  const sortedHistory = [...history].sort((a, b) => a.year - b.year);
  const prevYear = sortedHistory.find(h => h.year === person.year - 1);
  const yoyChange = prevYear
    ? ((person.salary_paid - prevYear.salary_paid) / prevYear.salary_paid) * 100
    : null;

  // Chart data
  const chartData = sortedHistory.map(h => ({
    year: h.year.toString(),
    salary: h.salary_paid,
    total: h.salary_paid + h.taxable_benefits,
  }));

  const yearsOnList = sortedHistory.length;
  const avgSalary = yearsOnList > 0
    ? sortedHistory.reduce((s, h) => s + h.salary_paid, 0) / yearsOnList
    : person.salary_paid;

  return (
    <main className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Back */}
      <Link href="/search" className="inline-flex items-center gap-1.5 text-sm text-sunshine-600 hover:text-sunshine-800">
        <ArrowLeft className="h-4 w-4" /> Back to Search
      </Link>

      {/* Header */}
      <div className="mt-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <PageHeader title={fullName} />
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-sunshine-100 px-3 py-1 text-sm font-medium text-sunshine-700">
                <Briefcase className="h-3.5 w-3.5" />
                {person.job_title}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-sunshine-100 px-3 py-1 text-sm font-medium text-sunshine-700">
                <Building2 className="h-3.5 w-3.5" />
                {person.sector}
              </span>
              <span className="inline-flex items-center gap-1 text-sm text-sunshine-500">
                <Calendar className="h-3.5 w-3.5" />
                {person.year} Disclosure
              </span>
            </div>
          </div>
          {yearsOnList > 1 && (
            <div className="rounded-full bg-sunshine-900 px-4 py-1.5 text-sm font-semibold text-white">
              {yearsOnList} years on list
            </div>
          )}
        </div>
      </div>

      {/* Employer card */}
      <div className="mt-6 rounded-lg border border-sunshine-200 bg-white p-5 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-sunshine-500">Employer</p>
          <Link
            href={`/employers/profile?id=${person.employer_id}`}
            className="mt-1 inline-flex items-center gap-1.5 text-base font-semibold text-sunshine-700 hover:text-sunshine-900 hover:underline"
          >
            <Building2 className="h-4 w-4" />
            {person.employer}
          </Link>
        </div>
        {person.region_name && (
          <div className="flex items-center gap-1.5 text-sm text-sunshine-600">
            <MapPin className="h-4 w-4" />
            {person.region_name}
          </div>
        )}
      </div>

      {/* Key stat cards */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={DollarSign}
          label="Salary Paid"
          value={formatCurrency(person.salary_paid)}
          highlight
        />
        <StatCard
          icon={DollarSign}
          label="Taxable Benefits"
          value={formatCurrency(person.taxable_benefits)}
        />
        <StatCard
          icon={DollarSign}
          label="Total Compensation"
          value={formatCurrency(totalComp)}
          sub="Salary + benefits"
        />
        {yoyChange !== null ? (
          <StatCard
            icon={TrendingUp}
            label="Year-over-Year"
            value={`${yoyChange >= 0 ? '+' : ''}${yoyChange.toFixed(1)}%`}
            sub={`vs ${person.year - 1}`}
          />
        ) : (
          <StatCard
            icon={Calendar}
            label="First Year on List"
            value={person.year.toString()}
            sub="No prior year data"
          />
        )}
      </div>

      {/* Insights row: percentile + employer rank + sector comparison */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Peer percentile */}
        {peerStats && (
          <div className="rounded-lg border border-sunshine-200 bg-white p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-sunshine-500">
              Peer Percentile — {person.job_title}
            </p>
            <p className="mt-1 text-2xl font-bold text-sunshine-900">
              {peerStats.percentile}<span className="text-base font-normal text-sunshine-600">th</span>
            </p>
            <div className="mt-2 relative h-3 w-full rounded-full bg-sunshine-100">
              <div
                className="h-full rounded-full bg-sunshine-500 transition-all duration-700"
                style={{ width: `${peerStats.percentile}%` }}
              />
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-5 w-1.5 rounded-full bg-sunshine-800"
                style={{ left: `${peerStats.percentile}%` }}
              />
            </div>
            <p className="mt-1.5 text-xs text-sunshine-500">
              Among {formatNumber(peerStats.totalPeers)} with the same title in {person.year}
            </p>
          </div>
        )}

        {/* Employer ranking */}
        {employerRank && (
          <div className="rounded-lg border border-sunshine-200 bg-white p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-sunshine-500">
              Employer Ranking
            </p>
            <p className="mt-1 text-2xl font-bold text-sunshine-900">
              #{employerRank.rank}
              <span className="text-base font-normal text-sunshine-600"> of {formatNumber(employerRank.total)}</span>
            </p>
            <div className="mt-2 relative h-3 w-full rounded-full bg-sunshine-100">
              <div
                className="h-full rounded-full bg-amber-500 transition-all duration-700"
                style={{ width: `${Math.max(2, 100 - (employerRank.rank / employerRank.total) * 100)}%` }}
              />
            </div>
            <p className="mt-1.5 text-xs text-sunshine-500">
              At {person.employer} in {person.year}
            </p>
          </div>
        )}

        {/* Sector comparison */}
        {sectorMedian && sectorDiff !== null && (
          <div className="rounded-lg border border-sunshine-200 bg-white p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-sunshine-500">
              vs. Sector Median
            </p>
            <p className={`mt-1 text-2xl font-bold ${sectorDiff >= 0 ? 'text-green-700' : 'text-red-600'}`}>
              {sectorDiff >= 0 ? '+' : ''}{sectorDiff.toFixed(1)}%
            </p>
            <p className="mt-1 text-sm text-sunshine-700">
              Sector median: {formatCurrency(sectorMedian)}
            </p>
            <p className="mt-0.5 text-xs text-sunshine-500">
              {person.sector} sector, {person.year}
            </p>
          </div>
        )}
      </div>

      {/* Salary history chart */}
      {chartData.length > 1 && (
        <SectionCard title="Salary History" icon={TrendingUp}>
          <div className="mb-3 flex items-center gap-6 text-sm">
            <span className="text-sunshine-600">
              Average: <strong className="text-sunshine-900">{formatCurrency(avgSalary)}</strong>
            </span>
            <span className="text-sunshine-600">
              Peak: <strong className="text-sunshine-900">
                {formatCurrency(Math.max(...sortedHistory.map(h => h.salary_paid)))}
              </strong>
            </span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#fde68a" />
                <XAxis dataKey="year" tick={{ fill: '#78350f', fontSize: 12 }} />
                <YAxis
                  tick={{ fill: '#78350f', fontSize: 12 }}
                  tickFormatter={v => `$${(v / 1000).toFixed(0)}K`}
                  width={58}
                />
                <Tooltip content={<SalaryTooltip />} />
                <ReferenceLine
                  y={100000}
                  stroke="#d97706"
                  strokeDasharray="4 4"
                  label={{ value: '$100K', position: 'right', fontSize: 11, fill: '#d97706' }}
                />
                <Line
                  type="monotone"
                  dataKey="salary"
                  stroke="#92400e"
                  strokeWidth={2.5}
                  dot={{ fill: '#92400e', r: 4 }}
                  activeDot={{ r: 6 }}
                  name="Salary Paid"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      )}

      {/* Year-by-year disclosure table */}
      {sortedHistory.length > 1 && (
        <SectionCard title="All Disclosures" icon={BarChart2}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-sunshine-200">
                  <th className="pb-2 text-left font-semibold text-sunshine-700">Year</th>
                  <th className="pb-2 text-left font-semibold text-sunshine-700">Employer</th>
                  <th className="pb-2 text-left font-semibold text-sunshine-700">Title</th>
                  <th className="pb-2 text-right font-semibold text-sunshine-700">Salary</th>
                  <th className="pb-2 text-right font-semibold text-sunshine-700">Benefits</th>
                  <th className="pb-2 text-right font-semibold text-sunshine-700">Total</th>
                </tr>
              </thead>
              <tbody>
                {[...sortedHistory].reverse().map(h => {
                  const isCurrentYear = h.id === person.id;
                  return (
                    <tr
                      key={h.id}
                      className={`border-b border-sunshine-100 ${isCurrentYear ? 'bg-sunshine-50 font-medium' : ''}`}
                    >
                      <td className="py-2 text-sunshine-900">
                        {h.year}
                        {isCurrentYear && (
                          <span className="ml-1.5 text-xs text-sunshine-500">(current)</span>
                        )}
                      </td>
                      <td className="py-2 text-sunshine-700 max-w-[180px] truncate">{h.employer}</td>
                      <td className="py-2 text-sunshine-600 max-w-[160px] truncate">{h.job_title}</td>
                      <td className="py-2 text-right font-mono text-sunshine-900">{formatCurrency(h.salary_paid)}</td>
                      <td className="py-2 text-right font-mono text-sunshine-600">{formatCurrency(h.taxable_benefits)}</td>
                      <td className="py-2 text-right font-mono font-semibold text-sunshine-900">{formatCurrency(h.salary_paid + h.taxable_benefits)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {/* Top peers in same role */}
      {peers.length > 1 && (
        <SectionCard title={`Top Earners — ${person.job_title}`} icon={User}>
          <p className="mb-3 text-sm text-sunshine-600">
            Highest-paid colleagues with the same title in {person.year}
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-sunshine-200">
                  <th className="pb-2 text-left font-semibold text-sunshine-700">#</th>
                  <th className="pb-2 text-left font-semibold text-sunshine-700">Name</th>
                  <th className="pb-2 text-left font-semibold text-sunshine-700">Employer</th>
                  <th className="pb-2 text-right font-semibold text-sunshine-700">Salary</th>
                </tr>
              </thead>
              <tbody>
                {peers.slice(0, 10).map((p, i) => {
                  const isMe = p.id === person.id;
                  return (
                    <tr
                      key={p.id}
                      className={`border-b border-sunshine-100 ${isMe ? 'bg-sunshine-50 font-semibold' : ''}`}
                    >
                      <td className="py-2 text-sunshine-500">{i + 1}</td>
                      <td className="py-2">
                        <Link
                          href={`/person?id=${p.id}`}
                          className={`hover:underline ${isMe ? 'text-sunshine-800' : 'text-sunshine-600 hover:text-sunshine-900'}`}
                        >
                          {p.first_name} {p.last_name}
                          {isMe && <span className="ml-1.5 text-xs text-sunshine-500">(you)</span>}
                        </Link>
                      </td>
                      <td className="py-2 text-sunshine-600 max-w-[180px] truncate">{p.employer}</td>
                      <td className="py-2 text-right font-mono text-sunshine-900">{formatCurrency(p.salary_paid)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {peerStats && peerStats.totalPeers > 10 && (
            <p className="mt-3 text-xs text-sunshine-400">
              Showing top 10 of {formatNumber(peerStats.totalPeers)} colleagues with this title
            </p>
          )}
        </SectionCard>
      )}

      {/* Highest-paid colleagues at same employer */}
      {colleagues.length > 0 && (
        <SectionCard title={`Top Earners at ${person.employer}`} icon={Building2}>
          <p className="mb-3 text-sm text-sunshine-600">
            Highest-paid employees at the same organization in {person.year}
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-sunshine-200">
                  <th className="pb-2 text-left font-semibold text-sunshine-700">Name</th>
                  <th className="pb-2 text-left font-semibold text-sunshine-700">Title</th>
                  <th className="pb-2 text-right font-semibold text-sunshine-700">Salary</th>
                </tr>
              </thead>
              <tbody>
                {colleagues.map(c => (
                  <tr key={c.id} className="border-b border-sunshine-100">
                    <td className="py-2">
                      <Link
                        href={`/person?id=${c.id}`}
                        className="text-sunshine-600 hover:text-sunshine-900 hover:underline"
                      >
                        {c.first_name} {c.last_name}
                      </Link>
                    </td>
                    <td className="py-2 text-sunshine-600 max-w-[180px] truncate">{c.job_title}</td>
                    <td className="py-2 text-right font-mono text-sunshine-900">{formatCurrency(c.salary_paid)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      <DataCaveatBanner className="mt-8" />
    </main>
  );
}

export default function PersonPage() {
  return (
    <Suspense
      fallback={
        <main className="container mx-auto px-4 py-8">
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-sunshine-300 border-t-sunshine-600" />
          </div>
        </main>
      }
    >
      <PersonDetailContent />
    </Suspense>
  );
}
