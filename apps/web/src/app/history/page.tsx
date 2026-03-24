'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Area,
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  BarChart as RechartsBarChart,
  Tooltip,
  XAxis,
  YAxis,
  AreaChart,
} from 'recharts';
import { ArrowRight, TrendingUp, Users, Calendar, DollarSign } from 'lucide-react';

import { PageHeader } from '@/components/layout/page-header';
import { DataCaveatBanner } from '@/components/shared/data-caveat-banner';
import { ChartContainer } from '@/components/charts/chart-container';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatNumber, formatPercent, cn } from '@/lib/utils';
import { CPI_TABLE } from '@/lib/data/cpi-table';
import { SUNSHINE_THRESHOLD, FIRST_YEAR, LATEST_YEAR } from '@/lib/constants';
import { getHistoricalSeries } from '@/lib/db';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SectorData {
  count: number;
  median: number;
}

interface YearRecord {
  year: number;
  totalEmployees: number;
  totalCompensation: number;
  medianSalary: number;
  averageSalary: number;
  p25Salary: number;
  p75Salary: number;
  p90Salary: number;
  threshold: number;
  cpiIndex: number;
  sectors: Record<string, SectorData>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SECTOR_COLORS: Record<string, string> = {
  Hospitals: '#d97706',
  Universities: '#b45309',
  'School Boards': '#92400e',
  Municipalities: '#78350f',
  'Crown Agencies': '#fbbf24',
  Government: '#fde68a',
};

const MILESTONES = [
  { year: 1996, label: 'Sunshine List created', detail: '4,584 employees' },
  { year: 2003, label: 'First year over 20K employees', detail: '20,812 employees' },
  { year: 2010, label: 'List reaches ~88K', detail: '88,412 employees' },
  { year: 2016, label: 'Over 100K for the first time', detail: '116,528 employees' },
  { year: 2020, label: 'COVID year — growth paused', detail: '170,812 employees' },
  { year: 2024, label: 'Record high', detail: '377K employees, $50B total compensation' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function adjustValue(value: number, year: number, adjusted: boolean): number {
  if (!adjusted) return value;
  const factor = CPI_TABLE[year];
  return factor ? Math.round(value * factor) : value;
}

function CustomTooltipContent({
  active,
  payload,
  label,
  adjusted,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: number;
  adjusted: boolean;
}) {
  if (!active || !payload || !payload.length) return null;
  const suffix = adjusted ? ' (2024$)' : '';

  return (
    <div className="rounded-md border border-sunshine-200 bg-white px-3 py-2 shadow-md">
      <p className="mb-1 text-sm font-semibold text-sunshine-900">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} className="text-xs" style={{ color: entry.color }}>
          {entry.name}:{' '}
          {entry.name.includes('Employees') || entry.name.includes('Count')
            ? formatNumber(entry.value)
            : formatCurrency(entry.value)}
          {entry.name.includes('Employees') || entry.name.includes('Count') ? '' : suffix}
        </p>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function HistoryPage() {
  const [data, setData] = useState<YearRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [adjusted, setAdjusted] = useState(false);

  useEffect(() => {
    getHistoricalSeries()
      .then((rows) => {
        setData(
          rows.map((r) => ({
            year: r.year,
            totalEmployees: r.total_employees,
            totalCompensation: r.total_compensation,
            medianSalary: r.median_salary,
            averageSalary: r.average_salary,
            p25Salary: r.p25_salary,
            p75Salary: r.p75_salary,
            p90Salary: r.p90_salary,
            threshold: r.threshold,
            cpiIndex: r.cpi_index,
            sectors: r.sectors,
          }))
        );
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // --- derived data ---

  const firstYear = data[0];
  const latestYear = data[data.length - 1];

  const thresholdToday = useMemo(() => {
    if (!firstYear) return 0;
    return adjustValue(SUNSHINE_THRESHOLD, FIRST_YEAR, true);
  }, [firstYear]);

  const headcountGrowth = useMemo(() => {
    if (!firstYear || !latestYear) return 0;
    return ((latestYear.totalEmployees - firstYear.totalEmployees) / firstYear.totalEmployees) * 100;
  }, [firstYear, latestYear]);

  // Main time-series chart data
  const mainChartData = useMemo(() => {
    return data.map((d) => ({
      year: d.year,
      median: adjustValue(d.medianSalary, d.year, adjusted),
      p25: adjustValue(d.p25Salary, d.year, adjusted),
      p75: adjustValue(d.p75Salary, d.year, adjusted),
      p90: adjustValue(d.p90Salary, d.year, adjusted),
      threshold: adjustValue(d.threshold, d.year, adjusted),
      employees: d.totalEmployees,
    }));
  }, [data, adjusted]);

  // Sector breakdown chart data
  const sectorChartData = useMemo(() => {
    return data.map((d) => {
      const entry: Record<string, number> = { year: d.year };
      Object.entries(d.sectors).forEach(([sector, info]) => {
        entry[sector] = info.count;
      });
      return entry;
    });
  }, [data]);

  // Growth rate data
  const growthData = useMemo(() => {
    return data.slice(1).map((d, i) => {
      const prev = data[i];
      const pctChange =
        ((d.totalEmployees - prev.totalEmployees) / prev.totalEmployees) * 100;
      return {
        year: d.year,
        growth: Math.round(pctChange * 10) / 10,
      };
    });
  }, [data]);

  const sectorNames = useMemo(() => {
    if (!data.length) return [];
    return Object.keys(data[0].sectors);
  }, [data]);

  if (loading) {
    return (
      <div className="container mx-auto max-w-7xl space-y-8 px-4 py-8">
        <PageHeader
          title="Historical Explorer"
          description="Loading 29 years of Sunshine List data..."
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-16 animate-pulse rounded bg-sunshine-200/40" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <PageHeader title="Historical Explorer" description="No data available." />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl space-y-8 px-4 py-8">
      {/* Header */}
      <PageHeader
        title="Historical Explorer"
        description="29 years of Ontario Sunshine List data — from 4,584 employees in 1996 to 377K+ in 2024"
      />

      <DataCaveatBanner />

      {/* ----------------------------------------------------------------- */}
      {/* $100K Threshold Erosion Banner */}
      {/* ----------------------------------------------------------------- */}
      <Card className="border-sunshine-400 bg-gradient-to-r from-sunshine-200/30 to-cream-50">
        <CardContent className="flex flex-col items-center gap-4 p-6 sm:flex-row sm:justify-center">
          <div className="text-center">
            <p className="text-xs font-medium uppercase tracking-wider text-sunshine-700">
              $100K in 1996
            </p>
            <p className="text-3xl font-bold text-sunshine-900">
              {formatCurrency(SUNSHINE_THRESHOLD)}
            </p>
          </div>
          <ArrowRight className="h-8 w-8 shrink-0 text-sunshine-600" />
          <div className="text-center">
            <p className="text-xs font-medium uppercase tracking-wider text-sunshine-700">
              Equivalent in 2024 dollars
            </p>
            <p className="text-3xl font-bold text-sunshine-900">
              {formatCurrency(thresholdToday)}
            </p>
          </div>
          <p className="max-w-xs text-center text-sm text-sunshine-700 sm:ml-4 sm:text-left">
            The threshold has never been adjusted for inflation, meaning it captures
            far more workers today than originally intended.
          </p>
        </CardContent>
      </Card>

      {/* ----------------------------------------------------------------- */}
      {/* Key Metrics */}
      {/* ----------------------------------------------------------------- */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Calendar className="h-5 w-5 text-sunshine-600" />}
          label="Years of Data"
          value="29"
          sub={`${FIRST_YEAR} \u2013 ${LATEST_YEAR}`}
        />
        <StatCard
          icon={<Users className="h-5 w-5 text-sunshine-600" />}
          label="Employees (2024)"
          value={formatNumber(latestYear.totalEmployees)}
          sub="On the list"
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5 text-sunshine-600" />}
          label="Headcount Growth"
          value={formatPercent(headcountGrowth, 0)}
          sub="1996 \u2192 2024"
        />
        <StatCard
          icon={<DollarSign className="h-5 w-5 text-sunshine-600" />}
          label="Median Salary (2024)"
          value={formatCurrency(latestYear.medianSalary)}
          sub="Nominal"
        />
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Inflation Toggle */}
      {/* ----------------------------------------------------------------- */}
      <div className="flex items-center justify-center gap-3">
        <span
          className={cn(
            'text-sm font-medium',
            !adjusted ? 'text-sunshine-900' : 'text-sunshine-600'
          )}
        >
          Nominal
        </span>
        <button
          onClick={() => setAdjusted((prev) => !prev)}
          className={cn(
            'relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sunshine-400 focus-visible:ring-offset-2',
            adjusted ? 'bg-sunshine-600' : 'bg-sunshine-200'
          )}
          role="switch"
          aria-checked={adjusted}
          aria-label="Toggle inflation adjustment"
        >
          <span
            className={cn(
              'pointer-events-none inline-block h-6 w-6 rounded-full bg-white shadow-lg ring-0 transition-transform',
              adjusted ? 'translate-x-7' : 'translate-x-0'
            )}
          />
        </button>
        <span
          className={cn(
            'text-sm font-medium',
            adjusted ? 'text-sunshine-900' : 'text-sunshine-600'
          )}
        >
          Inflation-Adjusted (2024$)
        </span>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Main Time-Series Chart */}
      {/* ----------------------------------------------------------------- */}
      <ChartContainer title="Salary Ranges & Headcount Over Time" height={420}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={mainChartData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#fde68a" />
            <XAxis
              dataKey="year"
              tick={{ fontSize: 12, fill: '#78350f' }}
              tickLine={false}
            />
            <YAxis
              yAxisId="salary"
              orientation="left"
              tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}K`}
              tick={{ fontSize: 11, fill: '#92400e' }}
              tickLine={false}
              domain={['auto', 'auto']}
            />
            <YAxis
              yAxisId="count"
              orientation="right"
              tickFormatter={(v: number) => formatNumber(v)}
              tick={{ fontSize: 11, fill: '#059669' }}
              tickLine={false}
            />
            <Tooltip
              content={<CustomTooltipContent adjusted={adjusted} />}
            />
            <Legend
              wrapperStyle={{ fontSize: 12 }}
              iconType="plainline"
            />

            {/* P25-P75 range area */}
            <Area
              yAxisId="salary"
              dataKey="p25"
              stackId="range"
              fill="transparent"
              stroke="transparent"
              name="P25-P75 Range"
              activeDot={false}
            />
            <Area
              yAxisId="salary"
              dataKey="p75"
              stackId="range-fill"
              fill="#fde68a"
              fillOpacity={0.4}
              stroke="transparent"
              name="P25-P75 Band"
              activeDot={false}
            />

            {/* Employee count bars */}
            <Bar
              yAxisId="count"
              dataKey="employees"
              fill="#059669"
              fillOpacity={0.25}
              name="Total Employees"
              barSize={12}
            />

            {/* Threshold line */}
            <Line
              yAxisId="salary"
              dataKey="threshold"
              stroke="#dc2626"
              strokeWidth={2}
              strokeDasharray="6 3"
              dot={false}
              name="$100K Threshold"
            />

            {/* Median line */}
            <Line
              yAxisId="salary"
              dataKey="median"
              stroke="#d97706"
              strokeWidth={2.5}
              dot={{ r: 2, fill: '#d97706' }}
              name="Median Salary"
            />

            {/* P90 line */}
            <Line
              yAxisId="salary"
              dataKey="p90"
              stroke="#b45309"
              strokeWidth={1.5}
              strokeDasharray="4 2"
              dot={false}
              name="P90 Salary"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartContainer>

      {/* ----------------------------------------------------------------- */}
      {/* Sector Breakdown Chart */}
      {/* ----------------------------------------------------------------- */}
      <ChartContainer title="Sector Headcount Over Time" height={380}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={sectorChartData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#fde68a" />
            <XAxis
              dataKey="year"
              tick={{ fontSize: 12, fill: '#78350f' }}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v: number) => formatNumber(v)}
              tick={{ fontSize: 11, fill: '#78350f' }}
              tickLine={false}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                return (
                  <div className="rounded-md border border-sunshine-200 bg-white px-3 py-2 shadow-md">
                    <p className="mb-1 text-sm font-semibold text-sunshine-900">{label}</p>
                    {payload.map((entry) => (
                      <p
                        key={entry.name}
                        className="text-xs"
                        style={{ color: entry.color as string }}
                      >
                        {entry.name}: {formatNumber(entry.value as number)}
                      </p>
                    ))}
                  </div>
                );
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {sectorNames.map((sector) => (
              <Area
                key={sector}
                type="monotone"
                dataKey={sector}
                stackId="sectors"
                fill={SECTOR_COLORS[sector] ?? '#a16207'}
                stroke={SECTOR_COLORS[sector] ?? '#a16207'}
                fillOpacity={0.7}
                name={sector}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </ChartContainer>

      {/* ----------------------------------------------------------------- */}
      {/* Growth Rate Chart */}
      {/* ----------------------------------------------------------------- */}
      <ChartContainer title="Year-over-Year Headcount Growth (%)" height={300}>
        <ResponsiveContainer width="100%" height="100%">
          <RechartsBarChart data={growthData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#fde68a" />
            <XAxis
              dataKey="year"
              tick={{ fontSize: 12, fill: '#78350f' }}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v: number) => `${v}%`}
              tick={{ fontSize: 11, fill: '#78350f' }}
              tickLine={false}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const val = payload[0].value as number;
                return (
                  <div className="rounded-md border border-sunshine-200 bg-white px-3 py-2 shadow-md">
                    <p className="text-sm font-semibold text-sunshine-900">{label}</p>
                    <p
                      className="text-xs font-medium"
                      style={{ color: val >= 0 ? '#059669' : '#dc2626' }}
                    >
                      {val >= 0 ? '+' : ''}
                      {val}%
                    </p>
                  </div>
                );
              }}
            />
            <ReferenceLine y={0} stroke="#78350f" strokeWidth={1} />
            <Bar dataKey="growth" name="YoY Growth">
              {growthData.map((entry) => (
                <Cell
                  key={entry.year}
                  fill={entry.growth >= 0 ? '#059669' : '#dc2626'}
                  fillOpacity={0.75}
                />
              ))}
            </Bar>
          </RechartsBarChart>
        </ResponsiveContainer>
      </ChartContainer>

      {/* ----------------------------------------------------------------- */}
      {/* Notable Milestones */}
      {/* ----------------------------------------------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Notable Milestones</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="relative border-l-2 border-sunshine-400 pl-6">
            {MILESTONES.map((m, i) => (
              <li key={m.year} className={cn('pb-6', i === MILESTONES.length - 1 && 'pb-0')}>
                <span className="absolute -left-[9px] flex h-4 w-4 items-center justify-center rounded-full bg-sunshine-400 ring-4 ring-white" />
                <p className="text-sm font-semibold text-sunshine-900">
                  {m.year} &mdash; {m.label}
                </p>
                <p className="text-sm text-sunshine-700">{m.detail}</p>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stat Card sub-component
// ---------------------------------------------------------------------------

function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-start gap-3 p-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sunshine-200/50">
          {icon}
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-sunshine-700">
            {label}
          </p>
          <p className="text-2xl font-bold text-sunshine-900">{value}</p>
          <p className="text-xs text-sunshine-600">{sub}</p>
        </div>
      </CardContent>
    </Card>
  );
}
