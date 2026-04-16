'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { ChevronDown } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { StatCard } from '@/components/layout/stat-card';
import { DataCaveatBanner } from '@/components/layout/data-caveat-banner';
import { Skeleton } from '@/components/ui/skeleton';
import { formatNumber, formatCurrency, formatPercent } from '@/lib/utils';
import { getHistoricalSeries, getDashboardByYear } from '@/lib/db';
import type { DashboardYearData } from '@/lib/db';

// Dynamic imports for Recharts-based components (no SSR)
const SectorDonut = dynamic(
  () => import('@/components/charts/sector-donut').then((m) => m.SectorDonut),
  { ssr: false, loading: () => <Skeleton className="h-[350px] w-full rounded-lg" /> }
);

const TopEmployersBar = dynamic(
  () => import('@/components/charts/top-employers-bar').then((m) => m.TopEmployersBar),
  { ssr: false, loading: () => <Skeleton className="h-[350px] w-full rounded-lg" /> }
);

const YoYSparkline = dynamic(
  () => import('@/components/charts/yoy-sparkline').then((m) => m.YoYSparkline),
  { ssr: false, loading: () => <Skeleton className="h-[300px] w-full rounded-lg" /> }
);

const AmIOnTheList = dynamic(
  () => import('@/components/benchmark/am-i-on-the-list').then((m) => m.AmIOnTheList),
  { ssr: false, loading: () => <Skeleton className="h-[200px] w-full rounded-lg" /> }
);

interface YearData {
  year: number;
  count: number;
  totalComp: number;
  median: number;
}

const AVAILABLE_YEARS = Array.from({ length: 30 }, (_, i) => 2025 - i);

function StatCardSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <Skeleton className="h-4 w-24 mb-3" />
      <Skeleton className="h-8 w-20 mb-2" />
      <Skeleton className="h-3 w-32" />
    </div>
  );
}

export function DashboardClient() {
  const [selectedYear, setSelectedYear] = useState(2025);
  const [latestYear, setLatestYear] = useState(2025);
  const [yearData, setYearData] = useState<DashboardYearData | null>(null);
  const [byYear, setByYear] = useState<YearData[]>([]);
  const [isLoadingBase, setIsLoadingBase] = useState(true);
  const [isLoadingYear, setIsLoadingYear] = useState(true);

  // In-memory cache: year → DashboardYearData so switching back is instant
  const cache = useRef<Map<number, DashboardYearData>>(new Map());

  // Load historical series once at startup
  useEffect(() => {
    async function loadBase() {
      try {
        const historicalData = await getHistoricalSeries();
        const latest = historicalData.at(-1)?.year ?? 2025;
        setLatestYear(latest);
        setSelectedYear(latest);
        setByYear(
          historicalData.map((h) => ({
            year: h.year,
            count: h.total_employees,
            totalComp: h.total_compensation,
            median: h.median_salary,
          }))
        );
      } catch (error) {
        console.error('Failed to load historical data:', error);
      } finally {
        setIsLoadingBase(false);
      }
    }
    loadBase();
  }, []);

  // Load year-specific data — single PK lookup from dashboard_by_year
  const loadYearData = useCallback(async (year: number) => {
    // Serve from cache if already fetched
    if (cache.current.has(year)) {
      setYearData(cache.current.get(year)!);
      setIsLoadingYear(false);
      return;
    }
    setIsLoadingYear(true);
    try {
      const data = await getDashboardByYear(year);
      if (data) {
        cache.current.set(year, data);
        setYearData(data);
      }
    } catch (error) {
      console.error('Failed to load year data:', error);
    } finally {
      setIsLoadingYear(false);
    }
  }, []);

  useEffect(() => {
    loadYearData(selectedYear);
  }, [selectedYear, loadYearData]);

  // Prefetch adjacent years in the background after initial load
  useEffect(() => {
    if (isLoadingYear || !yearData) return;
    const adjacent = [selectedYear - 1, selectedYear + 1].filter(
      (y) => y >= 1996 && y <= 2025 && !cache.current.has(y)
    );
    for (const y of adjacent) {
      getDashboardByYear(y).then((data) => {
        if (data) cache.current.set(y, data);
      }).catch(() => {});
    }
  }, [selectedYear, isLoadingYear, yearData]);

  const isLoading = isLoadingBase || isLoadingYear;

  // YoY growth from historical series
  const prevYearRecord = byYear.find((y) => y.year === selectedYear - 1);
  const currYearRecord = byYear.find((y) => y.year === selectedYear);
  const yoyGrowth = currYearRecord && prevYearRecord
    ? ((currYearRecord.count - prevYearRecord.count) / prevYearRecord.count) * 100
    : null;

  return (
    <div className="space-y-8">
      {/* Header + Year Selector */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageHeader
          title="Dashboard"
          description="Ontario public sector salary disclosure at a glance."
        />
        <div className="flex items-center gap-2">
          <label htmlFor="dash-year" className="text-sm font-medium text-sunshine-700">
            Viewing year:
          </label>
          <div className="relative">
            <select
              id="dash-year"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="appearance-none rounded-lg border border-sunshine-300 bg-white pl-3 pr-8 py-1.5 text-sm font-semibold text-sunshine-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-sunshine-400 cursor-pointer"
            >
              {AVAILABLE_YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}{y === latestYear ? ' (latest)' : ''}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-sunshine-500" />
          </div>
        </div>
      </div>

      {/* Row 1: Stat Cards — all scoped to selectedYear */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading || !yearData ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatCard
              title="Employees on List"
              value={formatNumber(yearData.employeeCount)}
              description={`Unique disclosures in ${selectedYear}`}
            />
            <StatCard
              title="Total Disclosed Pay"
              value={`$${(yearData.totalComp / 1e9).toFixed(1)}B`}
              description={`Total compensation in ${selectedYear}`}
            />
            <StatCard
              title="Median Salary"
              value={formatCurrency(yearData.medianSalary)}
              description={`Median across all ${selectedYear} disclosures`}
            />
            <StatCard
              title={yoyGrowth !== null ? `vs ${selectedYear - 1}` : 'Year on List'}
              value={yoyGrowth !== null
                ? `${yoyGrowth >= 0 ? '+' : ''}${formatPercent(yoyGrowth)}`
                : selectedYear.toString()}
              description={yoyGrowth !== null
                ? `Change in headcount from ${selectedYear - 1}`
                : 'First year in dataset'}
            />
          </>
        )}
      </div>

      {/* Row 2: Sector + Employer charts — scoped to selectedYear */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <p className="mb-2 text-xs font-medium text-sunshine-500 uppercase tracking-wide">
            {selectedYear} — Employees by Sector
          </p>
          <SectorDonut
            data={yearData?.sectors ?? []}
            isLoading={isLoading}
          />
        </div>
        <div>
          <p className="mb-2 text-xs font-medium text-sunshine-500 uppercase tracking-wide">
            {selectedYear} — Top Employers by Headcount
          </p>
          <TopEmployersBar
            data={yearData?.employers ?? []}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Row 3: Historical trend (all years) */}
      <div>
        <p className="mb-2 text-xs font-medium text-sunshine-500 uppercase tracking-wide">
          1996–2025 — Year-over-Year Growth
        </p>
        <YoYSparkline
          data={byYear}
          isLoading={isLoadingBase}
        />
      </div>

      {/* Row 4: Am I on the List? */}
      <AmIOnTheList
        medianSalary={yearData?.medianSalary ?? 122262}
        totalEmployees={yearData?.employeeCount ?? 404914}
      />

      {/* Row 5: Data Caveat */}
      <DataCaveatBanner />
    </div>
  );
}
